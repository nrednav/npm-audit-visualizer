import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

export const HOST_ENTRY = path.join(repoRoot, "packages/host/dist/main.js");
export const SURFACE_ENTRY = path.join(
  repoRoot,
  "packages/host/dist/surface/index.html",
);
export const CONTRACT_BUNDLE = path.join(
  repoRoot,
  "packages/contract/dist/index.js",
);

/**
 * The artifact assertions read the built output, so a missing build is produced
 * rather than skipped. A skipped check would leave "an install works" unverified
 * in exactly the situation where it matters.
 */
export const ensureBuild = (): void => {
  if (existsSync(HOST_ENTRY) && existsSync(SURFACE_ENTRY)) {
    return;
  }

  try {
    execFileSync("npm", ["run", "build"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      // The outer npm invocation exports its own lifecycle variables. Clearing
      // them keeps the nested build from inheriting the test run's context.
      env: withoutLifecycleVariables(process.env),
    });
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String((error as { stderr?: unknown }).stderr ?? "")
        : "";

    throw new Error(
      `The artifact assertions could not build the workspace.\n${stderr}`,
    );
  }
};

export const readBuilt = (absolutePath: string): string =>
  readFileSync(absolutePath, "utf8");

/** Removes the variables npm sets for the script that is currently running. */
const withoutLifecycleVariables = (
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv => {
  const cleaned: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(environment)) {
    if (key.startsWith("npm_lifecycle_") || key === "npm_package_json") {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
};

export const waitFor = async (
  condition: () => boolean,
  description: string,
  timeoutMs = 10_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }

  throw new Error(`Timed out waiting for ${description}`);
};
