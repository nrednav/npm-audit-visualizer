import {
  PAYLOAD_SCHEMA_VERSION,
  PayloadSchema,
  REPORT_ROUTE,
} from "@npm-audit-visualizer/contract";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import parsedReportFixture from "../../../contract/test/fixtures/parsed-report.json";
import { type PayloadState, usePayload } from "./use-payload";

const respond = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const settle = async (): Promise<PayloadState> => {
  const { result } = renderHook(() => usePayload());

  await waitFor(() => {
    expect(result.current.status).not.toBe("loading");
  });

  return result.current;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePayload", () => {
  it("asks the contract's route for the report", async () => {
    const fetchSpy = vi.fn(async () => respond(parsedReportFixture));
    vi.stubGlobal("fetch", fetchSpy);

    const state = await settle();

    // The spy is the instrument for every fetch assertion here, so its count
    // is checked rather than assumed: one request must read as one call.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(REPORT_ROUTE, expect.anything());
    expect(state.status).toBe("loaded");
  });

  it("loads a payload that matches the contract", async () => {
    vi.stubGlobal("fetch", async () => respond(parsedReportFixture));

    const state = await settle();

    expect(state.status).toBe("loaded");

    if (state.status !== "loaded") {
      return;
    }

    expect(state.payload.findings).toHaveLength(3);
  });

  it("fails when the request cannot be made", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("connection refused");
    });

    const state = await settle();

    expect(state.status).toBe("failed");
    expect(state.status === "failed" ? state.cause : "").toContain(
      "connection refused",
    );
  });

  it("fails when the server answers an error", async () => {
    vi.stubGlobal("fetch", async () => respond({}, 500));

    const state = await settle();

    expect(state.status).toBe("failed");
    expect(state.status === "failed" ? state.cause : "").toContain("500");
  });

  it("fails when the body is not JSON", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    }));

    const state = await settle();

    expect(state.status).toBe("failed");
    expect(state.status === "failed" ? state.cause : "").toContain("JSON");
  });

  it("fails when the body does not match the contract, naming what broke", async () => {
    vi.stubGlobal("fetch", async () =>
      respond({
        schemaVersion: PAYLOAD_SCHEMA_VERSION,
        metadata: {},
        findings: [],
        graph: { nodes: [], edges: [] },
      }),
    );

    const state = await settle();

    expect(state.status).toBe("failed");
    expect(state.status === "failed" ? state.cause : "").toMatch(/metadata/);
  });

  it("names both versions when the payload comes from another contract", async () => {
    vi.stubGlobal("fetch", async () =>
      respond({ ...parsedReportFixture, schemaVersion: 2 }),
    );

    const state = await settle();

    expect(state.status).toBe("failed");

    const cause = state.status === "failed" ? state.cause : "";

    expect(cause).toContain("version 1");
    expect(cause).toContain("2");
    expect(cause).not.toMatch(/does not match the expected shape/);
  });

  it("treats a payload with no version as incompatible, not as legacy", async () => {
    const { schemaVersion: _omitted, ...withoutVersion } = parsedReportFixture;

    vi.stubGlobal("fetch", async () => respond(withoutVersion));

    const state = await settle();

    expect(state.status).toBe("failed");

    const cause = state.status === "failed" ? state.cause : "";

    expect(cause).toContain("no version");
    expect(cause).toContain("version 1");
  });

  it("never loads a mismatched payload, even when its findings are valid", async () => {
    vi.stubGlobal("fetch", async () =>
      respond({ ...parsedReportFixture, schemaVersion: 99 }),
    );

    const state = await settle();

    expect(state.status).not.toBe("loaded");
    expect(state).not.toHaveProperty("payload");
  });

  it("never renders a contract failure as a report with no findings", async () => {
    vi.stubGlobal("fetch", async () => respond({ findings: [] }));

    const state = await settle();

    expect(state.status).toBe("failed");
    expect(PayloadSchema.safeParse({ findings: [] }).success).toBe(false);
  });

  it("does not settle after the reader goes away", async () => {
    let release: (value: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchSpy = vi.fn(
      async (_route: string, _init?: { signal?: AbortSignal }) => pending,
    );

    vi.stubGlobal("fetch", fetchSpy);

    const { result, unmount } = renderHook(() => usePayload());

    expect(result.current.status).toBe("loading");

    unmount();
    release(respond({ ...parsedReportFixture, schemaVersion: 99 }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // The reader is gone, so the only observable claim left is that the
    // controller was aborted and no state was published to a dead component.
    const init = fetchSpy.mock.calls[0]?.[1];

    expect(init?.signal?.aborted).toBe(true);
    expect(result.current.status).toBe("loading");
  });

  it("reads again for a new reader instead of reusing the last payload", async () => {
    const fetchSpy = vi.fn(async () => respond(parsedReportFixture));
    vi.stubGlobal("fetch", fetchSpy);

    await settle();
    await settle();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
