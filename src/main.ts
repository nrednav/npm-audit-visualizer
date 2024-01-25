#!/usr/bin/env node

import { exec } from "node:child_process";
import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("run", {
    describe: "Run the application",
    type: "boolean",
  })
  .help()
  .alias("help", "h")
  .parseSync();

const run = () => {
  console.log(chalk.green("npm-audit-visualizer"));

  // Start the React application
  exec("cd src/web-app && pnpm run dev", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
};

if (argv.run) {
  run();
}
