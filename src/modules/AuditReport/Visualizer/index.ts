import { exec } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";
import * as TE from "fp-ts/lib/TaskEither.js";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

const execAsync = promisify(exec);

export const visualizeAuditReport = (
  parsedAuditReport: ParsedAuditReport,
): TE.TaskEither<AppError, void> => {
  logger.debug("Visualizing parsed audit report");

  return TE.tryCatchK(startWebApp, (error: unknown) => {
    assertIsError(error);
    return new AppError(
      "Failed to visualize parsed audit report",
      {
        file: "modules/AuditReport/Visualizer/index.ts",
        functionName: "visualizeAuditReport",
        data: { parsedAuditReport },
      },
      error,
    );
  })();
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
