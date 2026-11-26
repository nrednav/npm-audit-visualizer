import { describe, expect, it } from "vitest";
import { TimestampSchema, TimestampsSchema } from "../src/time.js";

const builtAt = "2026-11-26T03:30:00Z";

const timestamps = {
  auditTime: { unknown: "npm audit --json states no creation time" },
  observedAt: { unknown: "nothing was observed" },
  builtAt,
};

describe("timestamp", () => {
  it("accepts an instant with an offset", () => {
    expect(TimestampSchema.safeParse(builtAt).success).toBe(true);
    expect(TimestampSchema.safeParse("2026-11-26T03:30:00+02:00").success).toBe(
      true,
    );
  });

  it("refuses a local time with no offset, which cannot be compared", () => {
    expect(TimestampSchema.safeParse("2026-11-26T03:30:00").success).toBe(
      false,
    );
  });

  it("refuses prose, a bare date, and a number", () => {
    for (const candidate of ["yesterday", "2026-11-26", 1_763_600_000_000]) {
      expect(TimestampSchema.safeParse(candidate).success).toBe(false);
    }
  });
});

describe("timestamps", () => {
  it("separates audit time, observation time, and build time", () => {
    const parsed = TimestampsSchema.safeParse(timestamps);

    expect(parsed.success).toBe(true);
    expect(parsed.success && Object.keys(parsed.data).sort()).toEqual([
      "auditTime",
      "builtAt",
      "observedAt",
    ]);
  });

  it("keeps the three in different fields, so none can stand for another", () => {
    const parsed = TimestampsSchema.parse({
      auditTime: builtAt,
      observedAt: builtAt,
      builtAt,
    });

    expect(parsed.auditTime).toBe(parsed.observedAt);
    expect(parsed.builtAt).not.toBe(undefined);
    expect(new Set(Object.keys(parsed)).size).toBe(3);
  });

  it("refuses a null for either time that may be unknown", () => {
    for (const field of ["auditTime", "observedAt"]) {
      expect(
        TimestampsSchema.safeParse({ ...timestamps, [field]: null }).success,
      ).toBe(false);
    }
  });

  it("requires a reason beside each unknown", () => {
    expect(
      TimestampsSchema.safeParse({
        ...timestamps,
        auditTime: { unknown: "" },
      }).success,
    ).toBe(false);
    expect(
      TimestampsSchema.safeParse({
        ...timestamps,
        observedAt: { unknown: 4 },
      }).success,
    ).toBe(false);
  });

  it("requires a build time, because this process always knows it", () => {
    const { builtAt: _omitted, ...withoutBuilt } = timestamps;

    expect(TimestampsSchema.safeParse(withoutBuilt).success).toBe(false);
    expect(
      TimestampsSchema.safeParse({
        ...timestamps,
        builtAt: { unknown: "no clock" },
      }).success,
    ).toBe(false);
  });
});
