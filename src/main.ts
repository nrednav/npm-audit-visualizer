#!/usr/bin/env node

import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import * as E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadAuditReport } from "./modules/AuditReport/Loader/index.js";
import { validateAuditReport } from "./modules/AuditReport/Validator/index.js";
import { AppError } from "./shared/errors.js";

const __filename = fileURLToPath(import.meta.url);

export const main = () => {
  console.log(chalk.green("npm-audit-visualizer"));

  const argv = yargs(hideBin(process.argv))
    .options({
      file: {
        type: "string",
        describe:
          'Path to file containing report generated by "npm audit --json"',
        alias: "f",
        demandOption: true,
      },
      web: {
        type: "boolean",
        describe: "Runs the web app",
        alias: "w",
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

  if (argv.file) {
    console.log(`Audit report file: ${chalk.blueBright(argv.file)}`);
    pipe(
      argv.file,
      loadAuditReport,
      E.flatMap(validateAuditReport),
      E.match(handleError(argv.debug), console.log),
    );
  }

  if (argv.web) {
    // Start the React application
    exec("cd web-app && pnpm run dev", (error, stdout, stderr) => {
      if (error) {
        return console.error(`exec error: ${error}`);
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
  }
};

const handleError = (isDebugMode: boolean) => (error: AppError) => {
  isDebugMode ? console.error(error) : console.error(error.message);
};

if (__filename === process.argv[1]) {
  main();
}
