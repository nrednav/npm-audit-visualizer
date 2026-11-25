import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AuditReportSchema } from "../src/report.js";

const readFixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url)),
      "utf8",
    ),
  ) as unknown;

describe("audit report schema", () => {
  it("accepts a report produced by npm audit", () => {
    const result = AuditReportSchema.safeParse(
      readFixture("valid-audit-report"),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a report that reports no vulnerabilities", () => {
    const result = AuditReportSchema.safeParse(
      readFixture("no-vulnerabilities-audit-report"),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a document that is not an audit report", () => {
    const result = AuditReportSchema.safeParse(
      readFixture("invalid-audit-report"),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a report version it cannot read", () => {
    const report = readFixture("valid-audit-report") as Record<string, unknown>;
    const result = AuditReportSchema.safeParse({
      ...report,
      auditReportVersion: 3,
    });
    expect(result.success).toBe(false);
  });

  it("names the path that failed", () => {
    const result = AuditReportSchema.safeParse({ auditReportVersion: 2 });
    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    const paths = result.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toContain("vulnerabilities");
    expect(paths).toContain("metadata");
  });
});
