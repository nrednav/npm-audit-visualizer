import { describe, expect, it } from "vitest";
import {
  decodePayload,
  PAYLOAD_SCHEMA_VERSION,
  type Payload,
  PayloadSchema,
  REPORT_ROUTE,
} from "../src/payload.js";

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

const derivation = {
  origin: "derived" as const,
  basis: "audit-via",
  note: "derived from the via relationships npm reported",
};

const timestamps = {
  auditTime: { unknown: "npm audit --json states no creation time" },
  observedAt: { unknown: "nothing was observed" },
  builtAt: "2026-11-26T00:00:00Z",
};

const payload: Payload = {
  schemaVersion: PAYLOAD_SCHEMA_VERSION,
  timestamps,
  sources: [
    {
      kind: "audit-report",
      producer: { name: "npm", version: { unknown: "npm states no version" } },
      schemaVersion: "2",
      createdAt: { unknown: "npm states no creation time" },
      label: "report.json",
      digest: `sha256:${"b".repeat(64)}`,
    },
  ],
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
      remediation: { state: "no-reported-change", target: null },
    },
  ],
  graph: {
    nodes: [
      { id: "brace-expansion", name: "brace-expansion", severity: "low" },
      { id: "minimatch", name: "minimatch", severity: null },
    ],
    edges: [{ from: "brace-expansion", to: "minimatch" }],
    derivation,
  },
};

describe("payload schema", () => {
  it("accepts a payload the host can produce", () => {
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts a payload with no findings", () => {
    const result = PayloadSchema.safeParse({
      schemaVersion: PAYLOAD_SCHEMA_VERSION,
      sources: payload.sources,
      timestamps,
      metadata,
      findings: [],
      graph: { nodes: [], edges: [], derivation },
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
      graph: {
        nodes: payload.graph.nodes,
        edges: [{ from: "a" }],
        derivation,
      },
    });
    expect(result.success).toBe(false);
  });

  it("states the report route once", () => {
    expect(REPORT_ROUTE).toBe("/report.json");
  });

  it("requires the current payload version", () => {
    expect(PAYLOAD_SCHEMA_VERSION).toBe(7);
    expect(PayloadSchema.safeParse(payload).success).toBe(true);

    const { schemaVersion: _omitted, ...withoutVersion } = payload;

    expect(PayloadSchema.safeParse(withoutVersion).success).toBe(false);
    expect(
      PayloadSchema.safeParse({ ...payload, schemaVersion: 1 }).success,
    ).toBe(false);
  });

  it("requires at least one source descriptor", () => {
    expect(PayloadSchema.safeParse({ ...payload, sources: [] }).success).toBe(
      false,
    );

    const { sources: _omitted, ...withoutSources } = payload;

    expect(PayloadSchema.safeParse(withoutSources).success).toBe(false);
  });

  it("refuses a source label that is a path", () => {
    expect(
      PayloadSchema.safeParse({
        ...payload,
        sources: [{ ...payload.sources[0], label: "/home/me/report.json" }],
      }).success,
    ).toBe(false);
  });
});

describe("decodePayload", () => {
  const failureOf = (input: unknown): unknown => {
    const result = decodePayload(input);

    expect(result.success).toBe(false);

    return result.success ? undefined : result.error;
  };

  it("returns the payload when the version and contents are current", () => {
    const result = decodePayload(payload);

    expect(result.success).toBe(true);
    expect(result.success ? result.payload.findings : []).toEqual(
      payload.findings,
    );
  });

  it("names both versions when the payload is from another release", () => {
    const future = PAYLOAD_SCHEMA_VERSION + 1;

    expect(failureOf({ ...payload, schemaVersion: future })).toEqual({
      kind: "version",
      received: future,
      supported: PAYLOAD_SCHEMA_VERSION,
    });
  });

  it("treats an absent version as a mismatch, not as a legacy default", () => {
    const { schemaVersion: _omitted, ...withoutVersion } = payload;

    expect(failureOf(withoutVersion)).toEqual({
      kind: "version",
      received: undefined,
      supported: PAYLOAD_SCHEMA_VERSION,
    });
  });

  it("rejects a version of the wrong type instead of coercing it", () => {
    expect(failureOf({ ...payload, schemaVersion: "1" })).toEqual({
      kind: "version",
      received: "1",
      supported: PAYLOAD_SCHEMA_VERSION,
    });
  });

  it("never returns a payload alongside a version failure", () => {
    const result = decodePayload({ ...payload, schemaVersion: 8 });

    expect(result).not.toHaveProperty("payload");
    expect(result.success).toBe(false);
  });

  it("names timestamps when they are the missing object", () => {
    const { timestamps: _omitted, ...rest } = payload;
    const result = PayloadSchema.safeParse(rest);

    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((it) => it.path.join(".")),
    ).toContain("timestamps");
  });

  it("refuses an audit time that is not an instant", () => {
    const result = PayloadSchema.safeParse({
      ...payload,
      timestamps: { ...payload.timestamps, auditTime: "yesterday" },
    });

    expect(result.success).toBe(false);
  });

  it("refuses a built time that is unknown, because this process always knows it", () => {
    const result = PayloadSchema.safeParse({
      ...payload,
      timestamps: { ...payload.timestamps, builtAt: { unknown: "no clock" } },
    });

    expect(result.success).toBe(false);
  });

  it("refuses the previous version, which carried a fix object per finding", () => {
    const { remediation: _omitted, ...finding } = payload
      .findings[0] as Payload["findings"][number];
    const result = decodePayload({
      ...payload,
      schemaVersion: PAYLOAD_SCHEMA_VERSION - 1,
      findings: [
        {
          ...finding,
          fix: { available: false, name: null, version: null, major: false },
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error).toEqual({
      kind: "version",
      received: PAYLOAD_SCHEMA_VERSION - 1,
      supported: PAYLOAD_SCHEMA_VERSION,
    });
  });

  it("names the finding whose state and target disagree", () => {
    const finding = payload.findings[0] as Payload["findings"][number];
    const result = decodePayload({
      ...payload,
      findings: [
        {
          ...finding,
          remediation: {
            state: "change-target-incomplete",
            target: { name: "semver", version: "7.5.2" },
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.kind).toBe("shape");
    const paths = result.success
      ? []
      : result.error.kind === "shape"
        ? result.error.paths
        : [];

    expect(paths[0]).toMatch(/^findings\.0\.remediation/);
  });

  it("names the finding that carries no remediation state at all", () => {
    const finding = payload.findings[0] as Payload["findings"][number];
    const { remediation: _omitted, ...withoutRemediation } = finding;

    const result = decodePayload({
      ...payload,
      findings: [withoutRemediation],
    });

    expect(result.success).toBe(false);
    expect(
      result.success
        ? []
        : result.error.kind === "shape"
          ? result.error.paths
          : [],
    ).toEqual(["findings.0.remediation"]);
  });

  it("requires a digest on every descriptor", () => {
    const source = payload.sources[0] as (typeof payload.sources)[number];
    const { digest: _omitted, ...withoutDigest } = source;

    expect(
      PayloadSchema.safeParse({ ...payload, sources: [withoutDigest] }).success,
    ).toBe(false);
  });

  it("requires a derivation on the graph", () => {
    const { derivation: _omitted, ...graph } = payload.graph;

    expect(PayloadSchema.safeParse({ ...payload, graph }).success).toBe(false);
  });

  it("refuses a graph that claims npm reported its edges", () => {
    const result = PayloadSchema.safeParse({
      ...payload,
      graph: {
        ...payload.graph,
        derivation: { ...derivation, origin: "reported" },
      },
    });

    expect(result.success).toBe(false);
  });

  it("reports where a matching version carries invalid contents", () => {
    const failure = failureOf({
      schemaVersion: PAYLOAD_SCHEMA_VERSION,
      sources: payload.sources,
      timestamps,
      metadata: {},
      findings: [],
      graph: { nodes: [], edges: [], derivation },
    }) as { kind: string; paths: string[] };

    expect(failure.kind).toBe("shape");
    expect(failure.paths[0]).toBe("metadata.vulnerabilities");
    expect(failure.paths.length).toBeGreaterThan(0);
    expect(failure.paths.length).toBeLessThanOrEqual(3);
  });

  it("calls a non-object a shape failure rather than a version mismatch", () => {
    expect(failureOf([])).toEqual({ kind: "shape", paths: ["(root)"] });
    expect(failureOf("report")).toEqual({
      kind: "shape",
      paths: ["(root)"],
    });
    expect(failureOf(null)).toEqual({ kind: "shape", paths: ["(root)"] });
  });

  it("does not throw on any input", () => {
    for (const input of [
      undefined,
      null,
      0,
      "",
      [],
      {},
      { schemaVersion: PAYLOAD_SCHEMA_VERSION },
    ]) {
      expect(() => decodePayload(input)).not.toThrow();
    }
  });
});
