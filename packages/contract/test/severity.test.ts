import { describe, expect, it } from "vitest";
import {
  isSeverity,
  SEVERITY_ORDER,
  SeveritySchema,
  severityRank,
} from "../src/severity.js";

describe("severity rank", () => {
  it("orders critical above info", () => {
    expect(severityRank("critical")).toBeGreaterThan(severityRank("high"));
    expect(severityRank("high")).toBeGreaterThan(severityRank("moderate"));
    expect(severityRank("moderate")).toBeGreaterThan(severityRank("low"));
    expect(severityRank("low")).toBeGreaterThan(severityRank("info"));
  });

  it("gives every declared severity a distinct rank", () => {
    const ranks = SEVERITY_ORDER.map(severityRank);
    expect(new Set(ranks).size).toBe(SEVERITY_ORDER.length);
  });

  it("rejects a level the report does not carry", () => {
    expect(SeveritySchema.safeParse("none").success).toBe(false);
    expect(isSeverity("none")).toBe(false);
  });

  it("accepts every declared level", () => {
    for (const severity of SEVERITY_ORDER) {
      expect(SeveritySchema.safeParse(severity).success).toBe(true);
      expect(isSeverity(severity)).toBe(true);
    }
  });
});
