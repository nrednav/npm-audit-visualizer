import { describe, expect, it } from "vitest";
import {
  decideSupport,
  majorOfPin,
  parseSchedule,
  type ReleaseLine,
} from "../scripts/support-policy.js";

/**
 * A fixture taken from the official schedule's shape: a current line, an active
 * LTS line, a maintenance line, and a line that has ended.
 */
const schedule: ReleaseLine[] = [
  {
    major: 20,
    start: "2023-04-18",
    lts: "2023-10-24",
    maintenance: "2024-10-22",
    end: "2026-04-30",
    codename: "Iron",
  },
  {
    major: 24,
    start: "2025-05-06",
    lts: "2025-10-28",
    maintenance: "2026-10-20",
    end: "2028-04-30",
    codename: "Krypton",
  },
  {
    major: 26,
    start: "2026-05-05",
    lts: "2026-10-28",
    maintenance: "2027-10-20",
    end: "2029-04-30",
    codename: "Lithium",
  },
  {
    major: 27,
    start: "2027-04-22",
    lts: "2027-10-20",
    maintenance: null,
    end: "2030-04-30",
    codename: null,
  },
];

const today = "2026-11-25";

describe("the support policy", () => {
  it("supports the pinned line while it is Active LTS", () => {
    const verdict = decideSupport("26.13.1", schedule, today);

    expect(verdict.supported).toBe(true);
    expect(verdict.phase).toBe("active-lts");
  });

  it("supports a maintenance line before its end of life", () => {
    const verdict = decideSupport("24.11.0", schedule, today);

    expect(verdict.supported).toBe(true);
    expect(verdict.phase).toBe("maintenance");
  });

  it("rejects a line that has reached end of life", () => {
    const verdict = decideSupport("20.19.0", schedule, today);

    expect(verdict.supported).toBe(false);
    expect(verdict.phase).toBe("ended");
    expect(verdict.reason).toContain("2026-04-30");
  });

  it("rejects a line that is not in the official schedule", () => {
    const verdict = decideSupport("99.0.0", schedule, today);

    expect(verdict.supported).toBe(false);
    expect(verdict.phase).toBe("unknown");
  });

  it("rejects a line that has not entered LTS coverage", () => {
    const verdict = decideSupport("27.1.0", schedule, "2027-06-01");

    expect(verdict.supported).toBe(false);
    expect(verdict.phase).toBe("current");
  });

  it("rejects a version that is not an exact pin", () => {
    const verdict = decideSupport("^26.13.1", schedule, today);

    expect(verdict.supported).toBe(false);
    expect(verdict.phase).toBe("unknown");
  });

  it("rejects on the day after the end of life date", () => {
    const verdict = decideSupport("20.19.0", schedule, "2026-05-01");

    expect(verdict.supported).toBe(false);
  });

  it("accepts on the last supported day", () => {
    const verdict = decideSupport("20.19.0", schedule, "2026-04-30");

    expect(verdict.supported).toBe(true);
  });
});

describe("schedule parsing", () => {
  const entry = {
    start: "2026-05-05",
    lts: "2026-10-28",
    maintenance: "2027-10-20",
    end: "2029-04-30",
    codename: "Lithium",
  };

  it("reads the release lines the runtime uses", () => {
    const lines = parseSchedule({ v26: entry });

    expect(lines).toHaveLength(1);
    expect(lines[0]?.major).toBe(26);
    expect(lines[0]?.end).toBe("2029-04-30");
  });

  it("treats a missing LTS date as a line that is not yet LTS", () => {
    const lines = parseSchedule({
      v27: { start: entry.start, end: entry.end },
    });

    expect(lines[0]?.lts).toBeNull();
  });

  it("rejects a payload that is not an object of lines", () => {
    expect(() => parseSchedule([])).toThrow();
    expect(() => parseSchedule("schedule")).toThrow();
  });

  it("rejects a line with an unreadable date", () => {
    expect(() => parseSchedule({ v26: { ...entry, end: "soon" } })).toThrow(
      /ISO date/,
    );
  });

  it("rejects an empty schedule instead of reporting support", () => {
    expect(() => parseSchedule({})).toThrow(/no release lines/);
  });
});

describe("pin parsing", () => {
  it("reads a major from an exact version", () => {
    expect(majorOfPin("26.13.1")).toBe(26);
  });

  it("refuses a range", () => {
    expect(majorOfPin(">=26")).toBeNull();
  });
});
