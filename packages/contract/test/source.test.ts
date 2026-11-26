import { describe, expect, it } from "vitest";
import { isSafeLabel, SourceDescriptorSchema } from "../src/source.js";

const descriptor = {
  kind: "audit-report" as const,
  producer: { name: "npm", version: { unknown: "npm states no version" } },
  schemaVersion: "2",
  createdAt: { unknown: "npm states no creation time" },
  label: "report.json",
};

describe("source descriptor", () => {
  it("accepts a descriptor built from a bare name", () => {
    expect(SourceDescriptorSchema.safeParse(descriptor).success).toBe(true);
  });

  it("accepts a phrase, which is what an automatic audit supplies", () => {
    expect(
      SourceDescriptorSchema.safeParse({
        ...descriptor,
        label: "npm audit in the current project",
      }).success,
    ).toBe(true);
  });

  it("accepts a stated creation time and rejects a malformed one", () => {
    expect(
      SourceDescriptorSchema.safeParse({
        ...descriptor,
        createdAt: "2026-11-26T00:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      SourceDescriptorSchema.safeParse({
        ...descriptor,
        createdAt: "yesterday",
      }).success,
    ).toBe(false);
  });

  it("requires a producer name and a stated artifact version", () => {
    expect(
      SourceDescriptorSchema.safeParse({
        ...descriptor,
        producer: { name: "", version: null },
      }).success,
    ).toBe(false);
    expect(
      SourceDescriptorSchema.safeParse({ ...descriptor, schemaVersion: 2 })
        .success,
    ).toBe(false);
  });

  it("refuses an unknown artifact kind", () => {
    expect(
      SourceDescriptorSchema.safeParse({ ...descriptor, kind: "exceptions" })
        .success,
    ).toBe(false);
  });
});

describe("isSafeLabel", () => {
  it("accepts a name with no separators", () => {
    expect(isSafeLabel("report.json")).toBe(true);
    expect(isSafeLabel("npm audit in the current project")).toBe(true);
  });

  it("refuses an absolute or relative path in either separator style", () => {
    expect(isSafeLabel("/home/me/report.json")).toBe(false);
    expect(isSafeLabel("./report.json")).toBe(false);
    expect(isSafeLabel("reports/report.json")).toBe(false);
    expect(isSafeLabel("C:\\work\\report.json")).toBe(false);
    expect(isSafeLabel("\\\\server\\share\\report.json")).toBe(false);
  });

  it("refuses an empty label and one past the stated length", () => {
    expect(isSafeLabel("")).toBe(false);
    expect(isSafeLabel("a".repeat(121))).toBe(false);
    expect(isSafeLabel("a".repeat(120))).toBe(true);
  });

  it("refuses a drive-letter prefix that has no separator", () => {
    expect(isSafeLabel("C:report.json")).toBe(false);
    expect(isSafeLabel("c:report.json")).toBe(false);
  });

  it("answers for any string without throwing", () => {
    for (const candidate of ["", " ", "\u0000", "é", "\u{1F600}report"]) {
      expect(() => isSafeLabel(candidate)).not.toThrow();
    }
  });
});
