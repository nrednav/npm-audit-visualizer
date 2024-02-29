import { exec } from "node:child_process";
import { writeFile } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import chalk from "chalk";
import * as E from "fp-ts/lib/Either.js";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

const writeFileAsync = promisify(writeFile);
const execAsync = promisify(exec);

export const visualizeAuditReport = async (
  parsedAuditReport: ParsedAuditReport,
): Promise<E.Either<AppError, void>> => {
  logger.debug("Visualizing parsed audit report");
  try {
    await writeReportToDisk(parsedAuditReport);
    await startWebApp();
    return E.right(void 0);
  } catch (error) {
    assertIsError(error);
    return E.left(
      new AppError(
        "Failed to visualize parsed audit report",
        {
          file: "modules/AuditReport/Visualizer/index.ts",
          functionName: "visualizeAuditReport",
          data: { parsedAuditReport },
        },
        error,
      ),
    );
  }
};

const writeReportToDisk = async (auditReport: ParsedAuditReport) => {
  logger.debug("Saving parsed audit report");
  const serializedReport = JSON.stringify(auditReport, null, 2);
  const filename = "parsed-audit-report.json";
  const outputPath = path.resolve(
    process.cwd(),
    "src/modules/WebApp/src/data",
    filename,
  );
  await writeFileAsync(outputPath, serializedReport, "utf-8");
};

const startWebApp = async () => {
  logger.debug("Starting web app");
  const script = "pnpm run start:web-app";
  const process = execAsync(script);
  process.child.stdout?.once("data", () => {
    logger.info("Web app started at", chalk.green("http://localhost:1248"));
  });
  await process;
};
