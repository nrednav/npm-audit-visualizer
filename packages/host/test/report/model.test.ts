import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type AuditReport,
  AuditReportSchema,
  type Finding,
  PAYLOAD_SCHEMA_VERSION,
  PayloadSchema,
  severityRank,
} from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";
import { buildPayload } from "../../src/report/model.js";

const readReport = (name: string): AuditReport => {
  const raw: unknown = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          `../../../contract/test/fixtures/${name}.json`,
          import.meta.url,
        ),
      ),
      "utf8",
    ),
  );

  return AuditReportSchema.parse(raw);
};

const ordered = readReport("few-vulnerabilities-audit-report");

describe("buildPayload", () => {
  it("presents every reported vulnerability and invents none", () => {
    const payload = buildPayload(ordered);
    const reported = new Set(Object.keys(ordered.vulnerabilities));
    const presented = new Set(payload.findings.map((finding) => finding.id));

    expect(presented).toEqual(reported);
    expect(payload.findings).toHaveLength(reported.size);
  });

  it("accepts a report with no vulnerabilities and produces no findings", () => {
    const payload = buildPayload(readReport("valid-audit-report"));

    expect(payload.findings).toEqual([]);
    expect(payload.graph.nodes).toEqual([]);
    expect(payload.graph.edges).toEqual([]);
  });

  it("orders findings by severity rank", () => {
    // The three-finding fixture is entirely `moderate`, so ordering over it
    // cannot fail. The wide fixture carries four distinct levels.
    const payload = buildPayload(
      readReport("many-vulnerabilities-audit-report"),
    );
    const ranks = payload.findings.map((finding) =>
      severityRank(finding.severity),
    );
    const distinct = new Set(ranks);

    expect(distinct.size).toBeGreaterThan(1);

    for (let index = 1; index < ranks.length; index += 1) {
      expect(ranks[index - 1]).toBeGreaterThanOrEqual(ranks[index] as number);
    }
  });

  it("turns every introducing package into an edge and keeps its target reachable", () => {
    const payload = buildPayload(ordered);
    const nodeIds = new Set(payload.graph.nodes.map((node) => node.id));

    for (const [id, vulnerability] of Object.entries(ordered.vulnerabilities)) {
      for (const entry of vulnerability.via) {
        if (typeof entry !== "string") {
          continue;
        }

        expect(payload.graph.edges).toContainEqual({ from: id, to: entry });
        expect(nodeIds).toContain(entry);
      }
    }
  });

  it("draws no edge for an advisory, whose name is the vulnerable package", () => {
    const payload = buildPayload(ordered);
    const selfEdges = payload.graph.edges.filter(
      (edge) => edge.from === edge.to,
    );

    expect(selfEdges).toEqual([]);
  });

  it("reaches a package that has no finding of its own", () => {
    // No fixture contains such a package, so the state is built from one by
    // naming an introducer that the report does not report on.
    const withIntroducer = structuredClone(ordered);
    const nodemon = withIntroducer.vulnerabilities.nodemon;

    expect(nodemon).toBeDefined();

    if (nodemon === undefined) {
      return;
    }

    nodemon.via = [...nodemon.via, "unreported-introducer"];

    const payload = buildPayload(withIntroducer);
    const node = payload.graph.nodes.find(
      (candidate) => candidate.id === "unreported-introducer",
    );

    expect(node).toBeDefined();
    expect(node?.severity).toBeNull();
    expect(payload.graph.edges).toContainEqual({
      from: "nodemon",
      to: "unreported-introducer",
    });
  });

  it("marks a package reached only through a chain as carrying no finding", () => {
    const withIntroducer = structuredClone(ordered);
    const nodemon = withIntroducer.vulnerabilities.nodemon;

    if (nodemon === undefined) {
      return;
    }

    nodemon.via = [...nodemon.via, "unreported-introducer"];

    const payload = buildPayload(withIntroducer);
    const reportingIds = new Set(payload.findings.map((finding) => finding.id));
    const reachedOnly = payload.graph.nodes.filter(
      (node) => !reportingIds.has(node.id),
    );

    expect(reachedOnly.length).toBeGreaterThan(0);

    for (const node of reachedOnly) {
      expect(node.severity).toBeNull();
    }
  });

  it("offers a chain from a transitive finding to a directly installed one", () => {
    // C3: a reader must be able to walk from a finding to the package they can
    // actually act on. `effects` names the dependents, so the walk follows it.
    const payload = buildPayload(ordered);
    const byId = new Map(
      payload.findings.map((finding) => [finding.id, finding]),
    );

    for (const finding of payload.findings) {
      if (finding.direct) {
        continue;
      }

      const seen = new Set<string>([finding.id]);
      const queue = [...finding.effects];
      let reached: Finding | undefined;

      while (queue.length > 0 && reached === undefined) {
        const next = queue.shift();

        if (next === undefined || seen.has(next)) {
          continue;
        }

        seen.add(next);

        const candidate = byId.get(next);

        if (candidate === undefined) {
          continue;
        }

        if (candidate.direct) {
          reached = candidate;
          break;
        }

        queue.push(...candidate.effects);
      }

      expect(
        reached,
        `${finding.id} offers no chain to a directly installed package`,
      ).toBeDefined();
    }
  });

  it("derives identifiers from the report, not from iteration", () => {
    const payload = buildPayload(ordered);
    const reordered: AuditReport = {
      ...ordered,
      vulnerabilities: Object.fromEntries(
        Object.entries(ordered.vulnerabilities).reverse(),
      ),
    };
    const other = buildPayload(reordered);

    expect(other.findings.map((finding) => finding.id).sort()).toEqual(
      payload.findings.map((finding) => finding.id).sort(),
    );
    expect(other.graph.edges).toEqual(payload.graph.edges);
  });

  it("produces a payload the contract accepts", () => {
    const result = PayloadSchema.safeParse(buildPayload(ordered));

    expect(result.success).toBe(true);
  });

  it("stamps the payload with the contract's version", () => {
    expect(buildPayload(ordered).schemaVersion).toBe(PAYLOAD_SCHEMA_VERSION);
  });

  it("keeps every reported finding and the whole graph under a version stamp", () => {
    const payload = buildPayload(
      readReport("many-vulnerabilities-audit-report"),
    );

    expect(payload.findings).toHaveLength(
      Object.keys(
        readReport("many-vulnerabilities-audit-report").vulnerabilities,
      ).length,
    );
    expect(payload.graph.nodes.length).toBeGreaterThanOrEqual(
      payload.findings.length,
    );
  });

  it("normalises each way a fix can be reported", () => {
    const payload = buildPayload(ordered);
    const available = payload.findings.filter(
      (finding) => finding.fix.available,
    );

    expect(available.length).toBeGreaterThan(0);

    for (const finding of payload.findings) {
      if (!finding.fix.available) {
        expect(finding.fix.name).toBeNull();
        expect(finding.fix.major).toBe(false);
      }
    }
  });
});

describe("committed payload fixture", () => {
  it("matches what the model produces from its source report", () => {
    const committed: unknown = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL(
            "../../../contract/test/fixtures/parsed-report.json",
            import.meta.url,
          ),
        ),
        "utf8",
      ),
    );

    expect(committed).toEqual(buildPayload(ordered));
  });
});

describe("buildPayload leaves the report alone", () => {
  it("does not mutate its input", () => {
    const many = readReport("many-vulnerabilities-audit-report");
    const before = structuredClone(many);

    buildPayload(many);

    expect(many).toEqual(before);
  });

  it("builds the whole of a large report in one pass", () => {
    const many = readReport("many-vulnerabilities-audit-report");
    const started = performance.now();
    const payload = buildPayload(many);
    const elapsed = performance.now() - started;

    expect(payload.findings).toHaveLength(
      Object.keys(many.vulnerabilities).length,
    );
    expect(elapsed).toBeLessThan(250);
  });

  it("gives the same answer on a second call", () => {
    const many = readReport("many-vulnerabilities-audit-report");

    expect(buildPayload(many)).toEqual(buildPayload(many));
  });
});
