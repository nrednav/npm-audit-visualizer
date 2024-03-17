#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import chalk from "chalk";
import * as E from "fp-ts/lib/Either.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import { pipe } from "fp-ts/lib/function.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { exportParsedAuditReport } from "./modules/AuditReport/Exporter/index.js";
import { importAuditReport } from "./modules/AuditReport/Importer/index.js";
import { parseAuditReport } from "./modules/AuditReport/Parser/index.js";
import { validateAuditReport } from "./modules/AuditReport/Validator/index.js";
import { visualizeAuditReport } from "./modules/AuditReport/Visualizer/index.js";
import { AppError } from "./shared/errors.js";
import { logger } from "./shared/modules/logger.js";

const __filename = fileURLToPath(import.meta.url);

export const main = () => {
  logger.info(chalk.green("npm-audit-visualizer"));

  const argv = yargs(hideBin(process.argv))
    .options({
      file: {
        type: "string",
        describe:
          'Path to file containing report generated by "npm audit --json"',
        alias: "f",
        demandOption: true,
      },
      debug: {
        type: "boolean",
        describe: "Runs the app in debug mode with verbose logging",
        alias: "d",
        default: false,
      },
    })
    .help()
    .alias("help", "h")
    .parseSync();

  if (argv.debug) {
    logger.enableDebugMode();
  }

  if (argv.file) {
    logger.info(`Audit report file: ${chalk.blueBright(argv.file)}`);
    const run = pipe(
      argv.file,
      importAuditReport,
      E.flatMap(validateAuditReport),
      E.map(parseAuditReport),
      E.flatMap(exportParsedAuditReport()),
      TE.fromEither,
      TE.flatMap(visualizeAuditReport),
      TE.match(handleError(argv.debug), () => {}),
    );
    run();
  }
};

const handleError = (isDebugMode: boolean) => (error: AppError) => {
  logger.error(isDebugMode ? error : error.message);
};

if (__filename === process.argv[1]) {
  main();

  process.on("SIGINT", () => {
    logger.info("\nExiting.");
    process.exit(0);
  });
}
