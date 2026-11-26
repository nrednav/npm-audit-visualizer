import {
  PAYLOAD_SCHEMA_VERSION,
  type Payload,
  PayloadSchema,
} from "@npm-audit-visualizer/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import parsedReportFixture from "../../contract/test/fixtures/parsed-report.json";
import App from "./app";
import type { PayloadState } from "./hooks/use-payload";

const loadedPayload = PayloadSchema.parse(parsedReportFixture);

const state = vi.hoisted(() => ({
  current: null as unknown,
}));

vi.mock("./hooks/use-payload.ts", () => ({
  usePayload: () => state.current,
}));

vi.mock("./components/visualizer/index.tsx", () => ({
  default: () => <div>visualizer</div>,
}));

const emptyPayload: Payload = {
  schemaVersion: loadedPayload.schemaVersion,
  sources: loadedPayload.sources,
  timestamps: loadedPayload.timestamps,
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
      total: 0,
    },
    dependencies: {
      prod: 4,
      dev: 0,
      optional: 0,
      peer: 0,
      peerOptional: 0,
      total: 4,
    },
  },
  findings: [],
  graph: {
    nodes: [],
    edges: [],
    derivation: {
      origin: "derived",
      basis: "audit-via",
      note: "Derived from the via relationships npm reported. This is not a complete dependency tree: a package npm did not report is absent.",
    },
  },
};

const setState = (next: PayloadState): void => {
  state.current = next;
};

describe("App", () => {
  beforeEach(() => {
    setState({ status: "loaded", payload: loadedPayload });
  });

  it("leads with the audit briefing and its finding count", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /3 findings reported/i,
        }),
      ).toBeVisible();
    });

    expect(screen.getByText("Audit briefing")).toBeVisible();
    expect(screen.getByText(/no data leaves this browser tab/i)).toBeVisible();
    expect(screen.queryByText(/generated from a local/i)).toBeNull();
  });

  it("offers a skip link to the findings", () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: /skip to audit findings/i }),
    ).toBeVisible();
  });

  it("renders the severity ledger and report scope", () => {
    render(<App />);

    const ledger = screen.getByRole("region", {
      name: /what npm reported/i,
    });

    expect(within(ledger).getByText("Moderate")).toBeVisible();
    expect(ledger.querySelectorAll("button[aria-pressed]")).toHaveLength(5);
    expect(screen.getByText(/do not rank project risk/i)).toBeVisible();
    expect(screen.queryByText(/immediate action/i)).toBeNull();
    expect(screen.getByRole("region", { name: /report scope/i })).toBeVisible();
  });

  it("shows the reading state before the report arrives", () => {
    setState({ status: "loading" });
    render(<App />);

    expect(screen.getByText(/reading report/i)).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: /findings reported/i }),
    ).toBeNull();
    expect(screen.queryByText(/lists no vulnerabilities/i)).toBeNull();
  });

  it("shows the cause when the report could not be read", () => {
    setState({
      status: "failed",
      cause: "The server answered 404 for /report.json.",
    });
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /could not be read/i }),
    ).toBeVisible();
    expect(screen.getByText(/404 for \/report\.json/)).toBeVisible();
    expect(screen.queryByText(/lists no vulnerabilities/i)).toBeNull();
    expect(screen.queryByText(/no findings match/i)).toBeNull();
  });

  it("never draws an incompatible payload as a report or as an empty one", () => {
    setState({
      status: "failed",
      cause: `This page expects payload version ${PAYLOAD_SCHEMA_VERSION}, but the report carries ${PAYLOAD_SCHEMA_VERSION + 1}. The server and the page were built from different contracts, so the report has not been read.`,
    });
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /could not be read/i }),
    ).toBeVisible();
    expect(
      screen.getByText(new RegExp(`payload version ${PAYLOAD_SCHEMA_VERSION}`)),
    ).toBeVisible();
    expect(
      screen.getByText(new RegExp(`carries ${PAYLOAD_SCHEMA_VERSION + 1}`)),
    ).toBeVisible();
    expect(screen.queryByText(/lists no vulnerabilities/i)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /findings reported/i }),
    ).toBeNull();
  });

  it("treats a loaded report with no findings as empty, not as a failure", () => {
    setState({ status: "loaded", payload: emptyPayload });
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /lists no vulnerabilities/i }),
    ).toBeVisible();
    expect(screen.queryByText(/clean/i)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /could not be read/i }),
    ).toBeNull();
  });
});
