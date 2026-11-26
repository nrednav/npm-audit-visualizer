import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  EVIDENCE_ORIGINS,
  type EvidenceOrigin,
  EvidenceOriginSchema,
  EvidenceRecordSchema,
  isEvidenceOrigin,
  isUnknown,
  UnknownSchema,
  unknownable,
} from "../src/evidence.js";

describe("evidence origins", () => {
  it("accepts each of the four origins", () => {
    for (const origin of ["reported", "observed", "derived", "asserted"]) {
      expect(EvidenceOriginSchema.safeParse(origin).success).toBe(true);
    }
  });

  it("has exactly four origins, so a fifth cannot appear unnoticed", () => {
    expect(EVIDENCE_ORIGINS).toEqual([
      "reported",
      "observed",
      "derived",
      "asserted",
    ]);
  });

  it("refuses unknown as an origin, in the schema and in the guard", () => {
    expect(EvidenceOriginSchema.safeParse("unknown").success).toBe(false);
    expect(isEvidenceOrigin("unknown")).toBe(false);
  });

  it("answers the guard the same way the schema answers", () => {
    for (const candidate of [...EVIDENCE_ORIGINS, "unknown", "", 7, null, {}]) {
      expect(isEvidenceOrigin(candidate)).toBe(
        EvidenceOriginSchema.safeParse(candidate).success,
      );
    }
  });
});

describe("unknown", () => {
  it("carries a reason", () => {
    const value = { unknown: "npm audit --json states no creation time" };

    expect(UnknownSchema.safeParse(value).success).toBe(true);
  });

  it("refuses an empty reason and one past the stated length", () => {
    expect(UnknownSchema.safeParse({ unknown: "" }).success).toBe(false);
    expect(UnknownSchema.safeParse({ unknown: "a".repeat(201) }).success).toBe(
      false,
    );
    expect(UnknownSchema.safeParse({ unknown: "a".repeat(200) }).success).toBe(
      true,
    );
  });

  it("refuses a bare string, so an unknown is never a plain absence", () => {
    expect(UnknownSchema.safeParse("not supplied").success).toBe(false);
    expect(UnknownSchema.safeParse(null).success).toBe(false);
  });

  it("is told apart from a stated value for any input", () => {
    const reasons = ["a reason", "", 200];

    expect(isUnknown({ unknown: "a reason" })).toBe(true);
    expect(isUnknown("2026-11-26T00:00:00Z")).toBe(false);
    expect(isUnknown(null)).toBe(false);
    expect(isUnknown(undefined)).toBe(false);
    expect(isUnknown(42)).toBe(false);
    expect(isUnknown({})).toBe(false);
    expect(isUnknown({ unknown: 42 })).toBe(false);

    for (const candidate of reasons) {
      expect(() => isUnknown(candidate)).not.toThrow();
    }
  });
});

describe("unknownable", () => {
  const stated = unknownable(z.iso.datetime({ offset: true }));

  it("passes a stated value through unchanged", () => {
    const result = stated.safeParse("2026-11-26T00:00:00Z");

    expect(result.success).toBe(true);
    expect(result.success ? result.data : undefined).toBe(
      "2026-11-26T00:00:00Z",
    );
  });

  it("accepts an unknown in place of the value", () => {
    const result = stated.safeParse({ unknown: "nobody recorded it" });

    expect(result.success).toBe(true);
  });

  it("still refuses a malformed stated value", () => {
    expect(stated.safeParse("yesterday").success).toBe(false);
  });

  it("refuses an unknown with no reason", () => {
    expect(stated.safeParse({ unknown: "" }).success).toBe(false);
  });
});

describe("evidence record", () => {
  it("pairs a value with an origin", () => {
    const record = { origin: "derived", value: 3 };

    expect(EvidenceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("carries an optional note", () => {
    const record = {
      origin: "derived",
      value: 3,
      note: "counted from via relationships",
    };

    expect(EvidenceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("requires an origin from the roster", () => {
    expect(
      EvidenceRecordSchema.safeParse({ origin: "unknown", value: 3 }).success,
    ).toBe(false);
    expect(EvidenceRecordSchema.safeParse({ value: 3 }).success).toBe(false);
  });

  it("accepts any origin name the roster defines", () => {
    for (const origin of EVIDENCE_ORIGINS satisfies readonly EvidenceOrigin[]) {
      expect(
        EvidenceRecordSchema.safeParse({ origin, value: null }).success,
      ).toBe(true);
    }
  });
});
