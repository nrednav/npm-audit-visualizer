import { describe, expect, it } from "vitest";
import { type Payload, PayloadSchema, REPORT_ROUTE } from "../src/payload.js";

const metadata = {
  vulnerabilities: {
    info: 0,
    low: 1,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 1,
  },
  dependencies: {
    prod: 1,
    dev: 0,
    optional: 0,
    peer: 0,
    peerOptional: 0,
    total: 1,
  },
};

const payload: Payload = {
  metadata,
  findings: [
    {
      id: "brace-expansion",
      name: "brace-expansion",
      severity: "low",
      direct: false,
      range: ">=1.0.0 <=1.1.11",
      paths: ["node_modules/brace-expansion"],
      via: ["minimatch"],
      effects: ["minimatch"],
      advisories: [],
      fix: { available: false, name: null, version: null, major: false },
    },
  ],
  graph: {
    nodes: [
      { id: "brace-expansion", name: "brace-expansion", severity: "low" },
      { id: "minimatch", name: "minimatch", severity: null },
    ],
    edges: [{ from: "brace-expansion", to: "minimatch" }],
  },
};

describe("payload schema", () => {
  it("accepts a payload the host can produce", () => {
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts a payload with no findings", () => {
    const result = PayloadSchema.safeParse({
      metadata,
      findings: [],
      graph: { nodes: [], edges: [] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a severity outside the declared order", () => {
    const result = PayloadSchema.safeParse({
      ...payload,
      findings: [{ ...payload.findings[0], severity: "none" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a relation that loses its direction", () => {
    const result = PayloadSchema.safeParse({
      ...payload,
      graph: { nodes: payload.graph.nodes, edges: [{ from: "a" }] },
    });
    expect(result.success).toBe(false);
  });

  it("states the report route once", () => {
    expect(REPORT_ROUTE).toBe("/report.json");
  });
});
