import {
  isSafeLabel,
  SourceDescriptorSchema,
} from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";
import { sourceOfAudit, sourceOfFile } from "../../src/report/source.js";

const DIGEST = `sha256:${"3".repeat(64)}`;

describe("sourceOfFile", () => {
  it("uses only the file's own name, never a directory", () => {
    const descriptor = sourceOfFile(
      "/home/me/projects/acme/report.json",
      DIGEST,
    );

    expect(descriptor.label).toBe("report.json");
  });

  it("reduces a relative path the same way", () => {
    expect(sourceOfFile("./reports/audit.json", DIGEST).label).toBe(
      "audit.json",
    );
    expect(sourceOfFile("audit.json", DIGEST).label).toBe("audit.json");
  });

  it("produces a label the contract accepts for both separator styles", () => {
    for (const candidate of [
      "/home/me/report.json",
      "C:\\work\\report.json",
      "\\\\server\\share\\report.json",
      "report.json",
    ]) {
      const descriptor = sourceOfFile(candidate, DIGEST);

      expect(isSafeLabel(descriptor.label)).toBe(true);
      expect(SourceDescriptorSchema.safeParse(descriptor).success).toBe(true);
    }
  });

  it("falls back to a phrase when the name itself cannot be a safe label", () => {
    // A backslash is a legal filename character where it is not a separator, so
    // this path names one file whose own name still looks like a path.
    const descriptor = sourceOfFile("C:\\work\\report.json", DIGEST);

    expect(descriptor.label).toBe("audit report from a file");
    expect(SourceDescriptorSchema.safeParse(descriptor).success).toBe(true);
  });

  it("never refuses a report it can read, whatever the name", () => {
    for (const candidate of ["", "..", ".", "/", "a\\b", "x".repeat(200)]) {
      expect(
        SourceDescriptorSchema.safeParse(sourceOfFile(candidate, DIGEST))
          .success,
      ).toBe(true);
    }
  });

  it("states the artifact's own version and records why npm states nothing else", () => {
    expect(sourceOfFile("report.json", DIGEST)).toEqual({
      kind: "audit-report",
      producer: {
        name: "npm",
        version: { unknown: "npm audit --json does not state the npm version" },
      },
      schemaVersion: "2",
      createdAt: { unknown: "npm audit --json states no creation time" },
      label: "report.json",
      digest: DIGEST,
    });
  });

  it("never states an absence as null, which no longer means anything", () => {
    expect(JSON.stringify(sourceOfFile("report.json", DIGEST))).not.toContain(
      "null",
    );
  });

  it("gives the same answer for the same path", () => {
    expect(sourceOfFile("/a/b/report.json", DIGEST)).toEqual(
      sourceOfFile("/a/b/report.json", DIGEST),
    );
  });
});

describe("sourceOfAudit", () => {
  it("labels an automatic audit with a phrase, not a path", () => {
    const descriptor = sourceOfAudit(DIGEST);

    expect(descriptor.label).toBe("npm audit in the current project");
    expect(isSafeLabel(descriptor.label)).toBe(true);
  });

  it("differs from a file source, so the two origins stay distinguishable", () => {
    expect(sourceOfAudit(DIGEST).label).not.toBe(
      sourceOfFile("report.json", DIGEST).label,
    );
  });

  it("produces a descriptor the contract accepts", () => {
    expect(
      SourceDescriptorSchema.safeParse(sourceOfAudit(DIGEST)).success,
    ).toBe(true);
  });
});

describe("digest placement", () => {
  it("carries the identity it was given, unchanged, on both paths", () => {
    expect(sourceOfFile("report.json", DIGEST).digest).toBe(DIGEST);
    expect(sourceOfAudit(DIGEST).digest).toBe(DIGEST);
  });

  it("refuses an identity that is not the stated encoding", () => {
    const descriptor = { ...sourceOfFile("report.json", DIGEST) };

    for (const digest of [
      `sha256:${"A".repeat(64)}`,
      "a".repeat(64),
      `sha256:${"a".repeat(63)}`,
      "",
    ]) {
      expect(
        SourceDescriptorSchema.safeParse({ ...descriptor, digest }).success,
      ).toBe(false);
    }
  });
});
