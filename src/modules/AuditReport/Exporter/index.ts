import fs from "node:fs";
import path from "node:path";
import * as E from "fp-ts/lib/Either.js";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { WEB_APP_BUILD_DIR } from "src/shared/constants.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

export const exportParsedAuditReport =
  (outputDir: string = WEB_APP_BUILD_DIR) =>
  (parsedAuditReport: ParsedAuditReport) => {
    logger.debug(`Exporting parsed audit report to ${outputDir}`);

    const serializedReport = JSON.stringify(parsedAuditReport, null, 2);
    const filename = "parsed-audit-report.json";
    const outputPath = path.resolve(outputDir, filename);

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
            data: { parsedAuditReport, outputDir },
          },
          error,
        );
      },
    )();
  };
