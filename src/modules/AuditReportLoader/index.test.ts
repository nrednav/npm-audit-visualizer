import path from "path";
import { isLeft, isRight } from "fp-ts/lib/Either.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { loadAuditReport } from "./index.js";

describe("AuditReportLoader", () => {
  describe("loadAuditReport", () => {
    it("can load audit report as raw JSON", () => {
      const filePath = path.join(__dirname, "test-audit-report.json");
      const auditReport = loadAuditReport(filePath);
      expect(isRight(auditReport)).toEqual(true);
      expectTypeOf(auditReport).toBeObject();
    });

    it("returns error when audit report does not exist at file path", () => {
      const filePath = path.join(__dirname, "non-existent-report.json");
      const auditReport = loadAuditReport(filePath);
      expect(isLeft(auditReport)).toEqual(true);
    });
  });
});
