import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const read = (relativePath: string): string =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

const verifyWorkflow = read(".github/workflows/verify.yml");
const driftWorkflow = read(".github/workflows/drift.yml");
const dependabot = read(".github/dependabot.yml");

/** Every `uses:` entry in a workflow, in file order. */
const usesOf = (workflow: string): string[] =>
  [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)\s*$/gm)].map(
    (match) => match[1] ?? "",
  );

const pinOf = (reference: string): string =>
  reference.slice(reference.indexOf("@") + 1);

describe("hosted verification", () => {
  it("reads the runtime from the repository pin", () => {
    expect(verifyWorkflow).toContain("node-version-file: .nvmrc");
  });

  it("installs from the lockfile before running anything else", () => {
    const install = verifyWorkflow.indexOf("run: npm ci");
    const check = verifyWorkflow.indexOf("run: npm run check");

    expect(install).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(install);
  });

  it("runs on pull requests and pushes to the trunk", () => {
    expect(verifyWorkflow).toContain("pull_request:");
    expect(verifyWorkflow).toContain("branches: [main]");
  });

  it("bounds every job instead of letting a hung step hold the queue", () => {
    expect(verifyWorkflow).toContain("timeout-minutes:");
    expect(driftWorkflow).toContain("timeout-minutes:");
  });

  it("runs on one declared runner", () => {
    // A second operating system doubles the minutes every push spends. The
    // single runner is a decision, so the workflow states it directly rather
    // than through a matrix of one.
    const runners = [
      ...verifyWorkflow.matchAll(/^\s*runs-on:\s*(\S+)\s*$/gm),
    ].map((match) => match[1]);

    expect(runners).toEqual(["ubuntu-latest"]);
    expect(verifyWorkflow).not.toContain("matrix:");
  });
});

describe("automation dependencies", () => {
  it("pins every action to an immutable commit", () => {
    const references = [...usesOf(verifyWorkflow), ...usesOf(driftWorkflow)];

    expect(references.length).toBeGreaterThan(0);

    for (const reference of references) {
      if (reference.startsWith("./")) {
        continue;
      }

      expect(pinOf(reference)).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("never runs untrusted pull request code with write access", () => {
    expect(verifyWorkflow).not.toContain("pull_request_target");
    expect(driftWorkflow).not.toContain("pull_request_target");
    expect(verifyWorkflow).toContain("permissions:\n  contents: read");
    expect(driftWorkflow).toContain("permissions:\n  contents: read");
    expect(verifyWorkflow).toContain("persist-credentials: false");
  });

  it("never turns a failing step into a green run", () => {
    expect(verifyWorkflow).not.toContain("continue-on-error");
    expect(driftWorkflow).not.toContain("continue-on-error");
  });
});

describe("scheduled drift detection", () => {
  it("runs on a weekly schedule and on demand", () => {
    expect(driftWorkflow).toContain("schedule:");
    expect(driftWorkflow).toMatch(/cron: "\d+ \d+ \* \* \d"/);
    expect(driftWorkflow).toContain("workflow_dispatch:");
  });

  it("checks the security audit, dependency freshness, and runtime support", () => {
    expect(driftWorkflow).toContain("npm audit --audit-level=high");
    expect(driftWorkflow).toContain("npm outdated --json");
    expect(driftWorkflow).toContain("npm run check:support");
  });

  it("reuses the contributor verification instead of redefining it", () => {
    expect(driftWorkflow).toContain("uses: ./.github/workflows/verify.yml");
  });

  it("distinguishes an unreadable check from a clean result", () => {
    expect(driftWorkflow).toContain('if [ "$status" -gt 1 ]');
  });
});

describe("update proposals", () => {
  it("watches both npm packages and workflow dependencies", () => {
    expect(dependabot).toContain("package-ecosystem: npm");
    expect(dependabot).toContain("package-ecosystem: github-actions");
  });

  it("proposes weekly and never merges on its own", () => {
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2);
    expect(dependabot).not.toContain("auto-merge");
  });

  it("groups routine upgrades and leaves majors reviewable on their own", () => {
    expect(dependabot).toContain("update-types:");
    expect(dependabot).toContain("- minor");
    expect(dependabot).toContain("- patch");
    expect(dependabot).not.toContain("- major");
  });
});
