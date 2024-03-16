import fs from "node:fs";
import path from "node:path";
import * as E from "fp-ts/lib/Either.js";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

export const exportParsedAuditReport = (
  parsedAuditReport: ParsedAuditReport,
): E.Either<AppError, ParsedAuditReport> => {
  logger.debug("Exporting parsed audit report");

  const serializedReport = JSON.stringify(parsedAuditReport, null, 2);
  const filename = "parsed-audit-report.json";
  const outputPath = path.resolve(
    process.cwd(),
    "src/modules/WebApp/src/data",
    filename,
  );

  return E.tryCatchK(
    () => {
      fs.writeFileSync(outputPath, serializedReport, "utf-8");
      return parsedAuditReport;
    },
    (error: unknown) => {
      assertIsError(error);
      return new AppError(
        "Failed to export parsed audit report",
        {
          file: "modules/AuditReport/Exporter/index.ts",
          functionName: "exportParsedAuditReport",
          data: { parsedAuditReport },
        },
        error,
      );
    },
  )();
};
