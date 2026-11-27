import { PayloadSchema } from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";
import parsedReportFixture from "../../../contract/test/fixtures/parsed-report.json";
import { countBySeverity, countReport } from "./report-counts";

const payload = PayloadSchema.parse(parsedReportFixture);

describe("report counts", () => {
  it("states findings and advisories as separate units", () => {
    const counts = countReport(payload.findings, payload.metadata);

    expect(counts.findings).toBe(3);
    expect(counts.advisories).toBe(1);
    expect(counts.metadataTotal).toBe(3);
    expect(counts.disagrees).toBe(false);
  });

  it("names a disagreement between npm's metadata and the findings it lists", () => {
    const counts = countReport(payload.findings, {
      ...payload.metadata,
      vulnerabilities: { ...payload.metadata.vulnerabilities, total: 5 },
    });

    expect(counts.findings).toBe(3);
    expect(counts.metadataTotal).toBe(5);
    expect(counts.disagrees).toBe(true);
  });

  it("counts the findings it was given, per severity", () => {
    expect(countBySeverity(payload.findings)).toEqual({
      critical: 0,
      high: 0,
      moderate: 3,
      low: 0,
      info: 0,
    });
  });
});
