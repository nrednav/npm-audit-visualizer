import {
  PAYLOAD_SCHEMA_VERSION,
  type Payload,
} from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./app";

vi.mock("./hooks/use-payload.ts", () => ({
  usePayload: () => ({ status: "loaded", payload: mixedPayload }),
}));

vi.mock("src/components/visualizer/vulnerability-graph", () => ({
  default: () => <div>graph panel</div>,
}));

const baseMetadata = {
  vulnerabilities: {
    info: 0,
    low: 0,
    moderate: 1,
    high: 1,
    critical: 1,
    total: 3,
  },
  dependencies: {
    prod: 3,
    dev: 0,
    optional: 0,
    peer: 0,
    peerOptional: 0,
    total: 3,
  },
};

const mixedPayload: Payload = {
  schemaVersion: PAYLOAD_SCHEMA_VERSION,
  sources: [
    {
      kind: "audit-report",
      producer: {
        name: "npm",
        version: { unknown: "npm audit --json does not state the npm version" },
      },
      schemaVersion: "2",
      createdAt: { unknown: "npm audit --json states no creation time" },
      label: "report.json",
    },
  ],
  metadata: baseMetadata,
  findings: [
    {
      id: "left-pad",
      name: "left-pad",
      severity: "critical",
      direct: true,
      range: "<1.3.0",
      paths: ["node_modules/left-pad"],
      via: [],
      effects: [],
      advisories: [],
      fix: {
        available: true,
        name: "left-pad",
        version: "1.3.0",
        major: false,
      },
    },
    {
      id: "minimist",
      name: "minimist",
      severity: "high",
      direct: false,
      range: "<1.2.6",
      paths: ["node_modules/minimist"],
      via: ["left-pad"],
      effects: ["left-pad"],
      advisories: [],
      fix: { available: false, name: null, version: null, major: false },
    },
    {
      id: "brace-expansion",
      name: "brace-expansion",
      severity: "moderate",
      direct: false,
      range: "<1.1.12",
      paths: ["node_modules/brace-expansion"],
      via: ["minimist"],
      effects: ["minimist"],
      advisories: [],
      fix: { available: false, name: null, version: null, major: false },
    },
  ],
  graph: {
    nodes: [
      { id: "left-pad", name: "left-pad", severity: "critical" },
      { id: "minimist", name: "minimist", severity: "high" },
      { id: "brace-expansion", name: "brace-expansion", severity: "moderate" },
    ],
    edges: [
      { from: "minimist", to: "left-pad" },
      { from: "brace-expansion", to: "minimist" },
    ],
  },
};

const rowNames = (): string[] =>
  screen.queryAllByRole("rowheader").map((row) => row.textContent ?? "");

const summary = (): string =>
  document.querySelector('p[aria-live="polite"]')?.textContent ?? "";

describe("the triage flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows every finding before a severity is chosen", () => {
    render(<App />);

    expect(rowNames()).toHaveLength(3);
  });

  it("restricts to one severity and restores every finding when cleared", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^critical:/i }));

    expect(rowNames()).toHaveLength(1);
    expect(rowNames()[0]).toContain("left-pad");
    expect(summary()).toContain("1 of 3 findings");

    await user.click(screen.getByRole("button", { name: /show all/i }));

    expect(rowNames()).toHaveLength(3);
    expect(screen.getByText(/select a level to filter/i)).toBeVisible();
  });

  it("restores every finding when the explorer's own clear control is used", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^high:/i }));
    expect(rowNames()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(rowNames()).toHaveLength(3);
  });

  it("keeps the restriction derived, so selecting the same level twice clears it", async () => {
    const user = userEvent.setup();
    render(<App />);

    const critical = screen.getByRole("button", { name: /^critical:/i });

    await user.click(critical);
    expect(rowNames()).toHaveLength(1);

    await user.click(
      screen.getByRole("button", { name: /clear this filter/i }),
    );

    expect(rowNames()).toHaveLength(3);
  });
});
