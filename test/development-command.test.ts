import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuild } from "./ensure-build.js";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("the development command", () => {
  beforeAll(() => {
    ensureBuild();
  }, 300_000);

  it("forwards development arguments to the CLI", () => {
    // --help makes the command exit after the build, so this exercises the
    // exact `npm run dev -- ...` path without leaving a server running.
    const output = execFileSync("npm", ["run", "dev", "--", "--help"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });

    expect(output).toContain("npm-audit-visualizer --file <report.json>");
    expect(output).toContain("--no-open");
    expect(output).not.toContain("Unexpected argument");
  }, 150_000);

  it("resolves a report relative to the caller's directory", () => {
    const relativeReport =
      "packages/contract/test/fixtures/invalid-audit-report.json";
    const result = spawnSync(
      "npm",
      ["run", "start", "--", "--file", relativeReport],
      {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).not.toContain("No file exists");
    expect(output).toContain("is not an npm audit report");
  });
});
