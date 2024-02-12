import path from "path";
import { fold, isLeft, isRight } from "fp-ts/lib/Either.js";
import type { RawJson } from "src/shared/types.js";
import { describe, expect, it, test } from "vitest";
import { loadAuditReport } from "../Loader/index.js";
import { validateAuditReport } from "./index.js";

describe("AuditReport", () => {
  describe("Validator", () => {
    describe("validateAuditReport", () => {
      test.each([
        "no-vulnerabilities-audit-report.json",
        "one-vulnerability-audit-report.json",
        "many-vulnerabilities-audit-report.json",
      ])("can validate %s", (fileName) => {
        const filePath = path.resolve(__dirname, "./fixtures", fileName);

        fold(
          (error) => {
            throw error;
          },
          (rawAuditReport: RawJson) => {
            const validationResult = validateAuditReport(rawAuditReport);
            expect(isRight(validationResult)).toStrictEqual(true);
          },
        )(loadAuditReport(filePath));
      });

      it("can invalidate an audit report", () => {
        const filePath = path.resolve(
          __dirname,
          "./fixtures/invalid-audit-report.json",
        );

        fold(
          (error) => {
            throw error;
          },
          (rawAuditReport: RawJson) => {
            const validationResult = validateAuditReport(rawAuditReport);
            expect(isLeft(validationResult)).toStrictEqual(true);
          },
        )(loadAuditReport(filePath));
      });
    });
  });
});
