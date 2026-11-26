import {
  isSafeLabel,
  SourceDescriptorSchema,
} from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";
import { sourceOfAudit, sourceOfFile } from "../../src/report/source.js";

describe("sourceOfFile", () => {
  it("uses only the file's own name, never a directory", () => {
    const descriptor = sourceOfFile("/home/me/projects/acme/report.json");

    expect(descriptor.label).toBe("report.json");
  });

  it("reduces a relative path the same way", () => {
    expect(sourceOfFile("./reports/audit.json").label).toBe("audit.json");
    expect(sourceOfFile("audit.json").label).toBe("audit.json");
  });

  it("produces a label the contract accepts for both separator styles", () => {
    for (const candidate of [
      "/home/me/report.json",
      "C:\\work\\report.json",
      "\\\\server\\share\\report.json",
      "report.json",
    ]) {
      const descriptor = sourceOfFile(candidate);

      expect(isSafeLabel(descriptor.label)).toBe(true);
      expect(SourceDescriptorSchema.safeParse(descriptor).success).toBe(true);
    }
  });

  it("falls back to a phrase when the name itself cannot be a safe label", () => {
    // A backslash is a legal filename character where it is not a separator, so
    // this path names one file whose own name still looks like a path.
    const descriptor = sourceOfFile("C:\\work\\report.json");

    expect(descriptor.label).toBe("audit report from a file");
    expect(SourceDescriptorSchema.safeParse(descriptor).success).toBe(true);
  });

  it("never refuses a report it can read, whatever the name", () => {
    for (const candidate of ["", "..", ".", "/", "a\\b", "x".repeat(200)]) {
      expect(
        SourceDescriptorSchema.safeParse(sourceOfFile(candidate)).success,
      ).toBe(true);
    }
  });

  it("states the artifact's own version and leaves what npm does not state unfilled", () => {
    expect(sourceOfFile("report.json")).toEqual({
      kind: "audit-report",
      producer: { name: "npm", version: null },
      schemaVersion: "2",
      createdAt: null,
      label: "report.json",
    });
  });

  it("gives the same answer for the same path", () => {
    expect(sourceOfFile("/a/b/report.json")).toEqual(
      sourceOfFile("/a/b/report.json"),
    );
  });
});

describe("sourceOfAudit", () => {
  it("labels an automatic audit with a phrase, not a path", () => {
    const descriptor = sourceOfAudit();

    expect(descriptor.label).toBe("npm audit in the current project");
    expect(isSafeLabel(descriptor.label)).toBe(true);
  });

  it("differs from a file source, so the two origins stay distinguishable", () => {
    expect(sourceOfAudit().label).not.toBe(sourceOfFile("report.json").label);
  });

  it("produces a descriptor the contract accepts", () => {
    expect(SourceDescriptorSchema.safeParse(sourceOfAudit()).success).toBe(
      true,
    );
  });
});
