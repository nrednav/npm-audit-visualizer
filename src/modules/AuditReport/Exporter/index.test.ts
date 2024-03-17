import fs from "node:fs";
import path from "node:path";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { importAuditReport } from "../Importer/index.js";
import { parseAuditReport } from "../Parser/index.js";
import { validateAuditReport } from "../Validator/index.js";
import { exportParsedAuditReport } from "./index.js";

describe("AuditReport", () => {
  describe("Exporter", () => {
    describe("exportParsedAuditReport", () => {
      let tempDir: string;

      beforeAll(() => {
        tempDir = fs.mkdtempSync("temp-");
      });

      afterAll(() => {
        fs.rmdirSync(tempDir);
      });

      test.each([
        "no-vulnerabilities-audit-report.json",
        "one-vulnerability-audit-report.json",
        "few-vulnerabilities-audit-report.json",
        "many-vulnerabilities-audit-report.json",
      ])("can export a parsed version of %s", (fileName) => {
        const filePath = path.resolve("src/shared/fixtures", fileName);

        const result = pipe(
          filePath,
          importAuditReport,
          E.flatMap(validateAuditReport),
          E.map(parseAuditReport),
          E.flatMap(exportParsedAuditReport(tempDir)),
        );

        expect(E.isRight(result)).toStrictEqual(true);

        const parsedAuditReportPath = `${tempDir}/parsed-audit-report.json`;
        expect(fs.existsSync(parsedAuditReportPath)).toStrictEqual(true);

        fs.rmSync(parsedAuditReportPath);
      });
    });
  });
});
