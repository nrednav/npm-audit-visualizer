import path from "path";
import { flatMap, isLeft, isRight } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { importAuditReport } from "src/modules/audit-report/importer/index.js";
import { describe, expect, it, test } from "vitest";
import { validateAuditReport } from "./index.js";

describe("AuditReport", () => {
  describe("Validator", () => {
    describe("validateAuditReport", () => {
      test.each([
        "no-vulnerabilities-audit-report.json",
        "one-vulnerability-audit-report.json",
        "few-vulnerabilities-audit-report.json",
        "many-vulnerabilities-audit-report.json",
      ])("returns true for %s", (fileName) => {
        const filePath = path.resolve("src/shared/fixtures", fileName);

        const result = pipe(
          filePath,
          importAuditReport,
          flatMap(validateAuditReport),
        );

        expect(isRight(result)).toStrictEqual(true);
      });

      it("returns false for invalid-audit-report.json", () => {
        const filePath = path.resolve(
          "src/shared/fixtures",
          "invalid-audit-report.json",
        );

        const result = pipe(
          filePath,
          importAuditReport,
          flatMap(validateAuditReport),
        );

        expect(isLeft(result)).toStrictEqual(true);
      });
    });
  });
});
