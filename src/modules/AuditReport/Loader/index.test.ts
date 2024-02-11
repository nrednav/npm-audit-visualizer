import path from "path";
import { isLeft, isRight } from "fp-ts/lib/Either.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { loadAuditReport } from "./index.js";

describe("AuditReport", () => {
  describe("Loader", () => {
    describe("loadAuditReport", () => {
      it("can load audit report as raw JSON", () => {
        const filePath = path.resolve(
          "src/shared/fixtures/valid-audit-report.json",
        );
        const auditReport = loadAuditReport(filePath);
        expect(isRight(auditReport)).toStrictEqual(true);
        expectTypeOf(auditReport).toBeObject();
      });

      it("returns error when audit report does not exist at file path", () => {
        const filePath = path.resolve("non-existent-report.json");
        const auditReport = loadAuditReport(filePath);
        expect(isLeft(auditReport)).toStrictEqual(true);
      });
    });
  });
});
