import { execSync } from "child_process";

const run = () => {
  console.log("Running web-app dev script...");

  try {
    const [auditReportFilePath] = process.argv.slice(2);

    if (!auditReportFilePath) {
      throw new Error("No audit report file provided");
    }

    const command = [
      `npm run dev -- --export-only -f ${auditReportFilePath}`,
      "npm --prefix src/modules/web-app run dev",
    ].join(" && ");

    execSync(command, { stdio: "inherit" });

    console.log("Finished running web-app dev script.");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
