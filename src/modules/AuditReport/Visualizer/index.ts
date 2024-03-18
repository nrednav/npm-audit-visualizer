import http from "http";
import chalk from "chalk";
import * as TE from "fp-ts/lib/TaskEither.js";
import handler from "serve-handler";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { WEB_APP_BUILD_DIR } from "src/shared/constants.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

const server = http.createServer((request, response) => {
  return handler(request, response, { public: WEB_APP_BUILD_DIR });
});

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

  const appServer = server.listen(1248, () => {
    logger.info("Web app started at", chalk.green("http://localhost:1248"));
  });

  appServer.on("error", (error) => {
    logger.error(error);
    appServer.close().once("close", () => logger.info("Web app stopped"));
    process.exit(1);
  });
};
