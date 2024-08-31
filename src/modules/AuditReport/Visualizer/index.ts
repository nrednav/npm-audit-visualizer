import http from "http";
import { AddressInfo } from "net";
import chalk from "chalk";
import { TaskEither, tryCatchK } from "fp-ts/lib/TaskEither.js";
import handler from "serve-handler";
import { ParsedAuditReport } from "src/modules/AuditReport/Parser/types.js";
import { WEB_APP_BUILD_DIR } from "src/shared/constants.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import { assertIsError } from "src/shared/utils.js";

export const visualizeAuditReport =
  (port: number) =>
  (parsedAuditReport: ParsedAuditReport): TaskEither<AppError, void> => {
    logger.debug("Visualizing parsed audit report");

    return tryCatchK(startWebApp(port), (error: unknown) => {
      assertIsError(error);

      return new AppError(
        "Failed to visualize parsed audit report",
        {
          file: "modules/AuditReport/Visualizer/index.ts",
          functionName: "visualizeAuditReport",
          data: { port, parsedAuditReport },
        },
        error,
      );
    })();
  };

const startWebApp = (port: number) => async () => {
  logger.debug("Starting web app");

  let alternatePort = port;

  const server = http.createServer((request, response) => {
    return handler(request, response, { public: WEB_APP_BUILD_DIR });
  });

  server.listen(port, () => {
    const serverAddress = server.address() as AddressInfo;

    logger.info(
      "Web app started at",
      chalk.green(`http://localhost:${serverAddress.port}`),
    );
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.info(
        chalk.yellow(
          `Port ${alternatePort} is already in use, retrying on port ${
            alternatePort + 1
          }`,
        ),
      );

      alternatePort += 1;

      setTimeout(() => {
        server.close();
        server.listen(alternatePort);
      }, 1000);

      return;
    }

    logger.error(error);

    server.close().once("close", () => logger.info("Web app stopped"));

    process.exit(1);
  });
};
