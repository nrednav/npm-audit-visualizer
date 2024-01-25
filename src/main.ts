#!/usr/bin/env node

import { exec } from "child_process";
import yargs from "yargs";

const argv = yargs
  .option("run", {
    describe: "Run the application",
    type: "boolean",
  })
  .help()
  .alias("help", "h")
  .parseSync();

const run = () => {
  console.log("npm-audit-visualizer");

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
