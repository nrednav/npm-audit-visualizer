import path from "path";
import { flatMap, isRight, map } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { describe, expect, test } from "vitest";
import { importAuditReport } from "../Importer/index.js";
import { validateAuditReport } from "../Validator/index.js";
import { MetadataSchema, VulnerabilitySchema } from "../Validator/schema.js";
import { parseAuditReport } from "./index.js";
import { VulnerabilityGraphSchema } from "./types.js";

describe("AuditReport", () => {
  describe("Parser", () => {
    describe("parseAuditReport", () => {
      test.each([
        "no-vulnerabilities-audit-report.json",
        "one-vulnerability-audit-report.json",
        "few-vulnerabilities-audit-report.json",
        "many-vulnerabilities-audit-report.json",
      ])("can parse %s", (fileName) => {
        const filePath = path.resolve("src/shared/fixtures", fileName);

        const result = pipe(
          filePath,
          importAuditReport,
          flatMap(validateAuditReport),
          map(parseAuditReport),
        );

        expect(isRight(result)).toStrictEqual(true);

        if (isRight(result)) {
          const parsedAuditReport = result.right;

          const metadataParsingResult = MetadataSchema.safeParse(
            parsedAuditReport.metadata,
          );

          expect(metadataParsingResult.success).toStrictEqual(true);

          const vulnerabilityTableParsingResult =
            VulnerabilitySchema.array().safeParse(
              parsedAuditReport.vulnerability.table,
            );

          expect(vulnerabilityTableParsingResult.success).toStrictEqual(true);

          const vulnerabilityGraphParsingResult =
            VulnerabilityGraphSchema.safeParse(
              parsedAuditReport.vulnerability.graph,
            );

          expect(vulnerabilityGraphParsingResult.success).toStrictEqual(true);
        }
      });
    });
  });
});
