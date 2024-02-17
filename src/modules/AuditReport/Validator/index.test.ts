import path from "path";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
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
        const filePath = path.resolve("src/shared/fixtures", fileName);

        const result = pipe(
          filePath,
          loadAuditReport,
          E.flatMap(validateAuditReport),
        );

        expect(E.isRight(result)).toStrictEqual(true);
      });

      it("can invalidate an audit report", () => {
        const filePath = path.resolve(
          "src/shared/fixtures",
          "invalid-audit-report.json",
        );

        const result = pipe(
          filePath,
          loadAuditReport,
          E.flatMap(validateAuditReport),
        );

        expect(E.isLeft(result)).toStrictEqual(true);
      });
    });
  });
});
