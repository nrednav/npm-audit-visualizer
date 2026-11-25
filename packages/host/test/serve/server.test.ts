import { rm } from "node:fs/promises";
import { createServer } from "node:http";
import { REPORT_ROUTE } from "@npm-audit-visualizer/contract";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type Serving,
  describeServeFailure,
  startServing,
} from "../../src/serve/server.js";
import {
  FIXTURE_PAYLOAD,
  type TemporaryAssets,
  createTemporaryAssets,
} from "../support.js";

let assets: TemporaryAssets;

const assetsDirFor = async (): Promise<string> => {
  const created = await createTemporaryAssets();
  assets = created;

  return created.directory;
};

const serve = async (directory: string): Promise<Serving> => {
  const result = await startServing({
    assetsDir: directory,
    payload: FIXTURE_PAYLOAD,
    port: 0,
    attempts: 3,
  });

  if (!result.ok) {
    throw new Error(`Serving did not start: ${result.failure.kind}`);
  }

  return result;
};

beforeEach(async () => {
  assets = await createTemporaryAssets();
});

afterEach(async () => {
  await assets.dispose();
});

describe("the running server", () => {
  it("serves the payload where the contract says it is", async () => {
    const serving = await serve(assets.directory);

    try {
      const response = await fetch(
        `http://127.0.0.1:${serving.port}${REPORT_ROUTE}`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual(FIXTURE_PAYLOAD);
    } finally {
      await serving.close();
    }
  });

  it("serves the entry document at the root", async () => {
    const serving = await serve(assets.directory);

    try {
      const response = await fetch(`http://127.0.0.1:${serving.port}/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("surface");
      expect(response.headers.get("cache-control")).toBe("no-cache");
    } finally {
      await serving.close();
    }
  });

  it("caches a content-hashed asset for good", async () => {
    const serving = await serve(assets.directory);

    try {
      const response = await fetch(
        `http://127.0.0.1:${serving.port}/assets/index-abc123.js`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("immutable");
    } finally {
      await serving.close();
    }
  });

  it("answers 404 for an unknown path instead of the entry document", async () => {
    const serving = await serve(assets.directory);

    try {
      const response = await fetch(
        `http://127.0.0.1:${serving.port}/missing/file.js`,
      );

      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain("surface");
    } finally {
      await serving.close();
    }
  });

  it("answers 404 for a traversal attempt", async () => {
    const serving = await serve(assets.directory);

    try {
      const response = await fetch(
        `http://127.0.0.1:${serving.port}/../../../etc/passwd`,
      );

      expect(response.status).toBe(404);
    } finally {
      await serving.close();
    }
  });

  it("refuses to start when the interface is not built", async () => {
    const empty = await assetsDirFor();
    await rm(`${empty}/index.html`);

    const result = await startServing({
      assetsDir: empty,
      payload: FIXTURE_PAYLOAD,
      port: 0,
      attempts: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.failure.kind).toBe("assets-missing");

    if (result.ok) {
      return;
    }

    expect(describeServeFailure(result.failure)).toContain(empty);
    expect(describeServeFailure(result.failure)).toContain("npm run build");
  });

  it("moves to the next port when the first one is taken", async () => {
    const blocker = createServer();
    const takenPort = await new Promise<number>((resolve) => {
      blocker.listen(0, "127.0.0.1", () => {
        const address = blocker.address();

        resolve(
          typeof address === "object" && address !== null ? address.port : 0,
        );
      });
    });

    try {
      const result = await startServing({
        assetsDir: assets.directory,
        payload: FIXTURE_PAYLOAD,
        port: takenPort,
        attempts: 3,
      });

      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      expect(result.port).not.toBe(takenPort);
      expect(result.port).toBeGreaterThan(takenPort);
      await result.close();
    } finally {
      await new Promise((resolve) => {
        blocker.close(resolve);
      });
    }
  });

  it("gives up after the budget of ports is spent", async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => {
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const address = blocker.address();
    const takenPort =
      typeof address === "object" && address !== null ? address.port : 0;

    try {
      const result = await startServing({
        assetsDir: assets.directory,
        payload: FIXTURE_PAYLOAD,
        port: takenPort,
        attempts: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.ok ? null : result.failure.kind).toBe("port-in-use");
    } finally {
      await new Promise((resolve) => {
        blocker.close(resolve);
      });
    }
  });

  it("stops when the signal aborts", async () => {
    const controller = new AbortController();
    const result = await startServing({
      assetsDir: assets.directory,
      payload: FIXTURE_PAYLOAD,
      port: 0,
      attempts: 3,
      signal: controller.signal,
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    controller.abort();
    await result.whenClosed;

    await expect(
      fetch(`http://127.0.0.1:${result.port}${REPORT_ROUTE}`),
    ).rejects.toThrow();
  });
});
