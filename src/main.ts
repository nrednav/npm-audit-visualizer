#!/usr/bin/env node

import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export const main = () => {
  console.log(chalk.green("npm-audit-visualizer"));

  const argv = yargs(hideBin(process.argv))
    .options({
      file: {
        type: "string",
        describe: 'Path to file containing output of "npm audit --json"',
        alias: "f",
        demandOption: true,
      },
      web: {
        type: "boolean",
        describe: "Runs the web app",
        alias: "w",
      },
    })
    .help()
    .alias("help", "h")
    .parseSync();

  if (argv.file) {
    console.log(`Audit File: ${chalk.blueBright(argv.file)}`);
  }

  if (argv.web) {
    // Start the React application
    exec("cd src/web-app && pnpm run dev", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
  }
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
