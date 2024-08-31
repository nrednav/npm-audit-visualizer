import { execSync } from "child_process";

const run = () => {
  console.log("Running pre-build script...");

  const command = [
    "npm run clean",
    "npm run type-check",
    "npm run build:web-app",
  ].join(" && ");

  execSync(command, { stdio: "inherit" });

  try {
    console.log("Finished running pre-build script.");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
