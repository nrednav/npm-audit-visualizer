import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const readText = (relativePath: string): string =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

const readJson = (relativePath: string): unknown =>
  JSON.parse(readText(relativePath)) as unknown;

type Manifest = {
  name: string;
  version: string;
  workspaces?: string[];
  engines?: { node?: string };
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asStringRecord = (
  value: unknown,
  field: string,
): Record<string, string> => {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(`${field} must be an object`);
  }

  const entries = Object.entries(value);

  for (const [key, spec] of entries) {
    if (typeof spec !== "string") {
      throw new Error(`${field}.${key} must be a string`);
    }
  }

  return Object.fromEntries(entries) as Record<string, string>;
};

const parseManifest = (relativePath: string): Manifest => {
  const raw = readJson(relativePath);

  if (!isRecord(raw)) {
    throw new Error(`${relativePath} must contain an object`);
  }

  const { name, version, workspaces, engines, packageManager } = raw;

  if (typeof name !== "string") {
    throw new Error(`${relativePath}: name must be a string`);
  }

  if (typeof version !== "string") {
    throw new Error(`${relativePath}: version must be a string`);
  }

  if (workspaces !== undefined && !Array.isArray(workspaces)) {
    throw new Error(`${relativePath}: workspaces must be an array`);
  }

  let nodePin: string | undefined;
  if (engines !== undefined) {
    if (!isRecord(engines)) {
      throw new Error(`${relativePath}: engines must be an object`);
    }
    if (engines.node !== undefined && typeof engines.node !== "string") {
      throw new Error(`${relativePath}: engines.node must be a string`);
    }
    nodePin = engines.node;
  }

  if (packageManager !== undefined && typeof packageManager !== "string") {
    throw new Error(`${relativePath}: packageManager must be a string`);
  }

  return {
    name,
    version,
    ...(workspaces === undefined ? {} : { workspaces: workspaces as string[] }),
    ...(nodePin === undefined ? {} : { engines: { node: nodePin } }),
    ...(packageManager === undefined ? {} : { packageManager }),
    dependencies: asStringRecord(
      raw.dependencies,
      `${relativePath}:dependencies`,
    ),
    devDependencies: asStringRecord(
      raw.devDependencies,
      `${relativePath}:devDependencies`,
    ),
  };
};

const packageDirectories = readdirSync(path.join(repoRoot, "packages"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) =>
    existsSync(path.join(repoRoot, "packages", name, "package.json")),
  );

const rootManifest = parseManifest("package.json");

const packages = packageDirectories.map((directory) => ({
  directory,
  manifest: parseManifest(path.join("packages", directory, "package.json")),
}));

const workspaceVersions = new Map(
  packages.map(({ manifest }) => [manifest.name, manifest.version]),
);

type NodeVersion = [major: number, minor: number, patch: number];

const nodeVersion = (version: string): NodeVersion => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (match === null) {
    throw new Error(`Not an exact Node version: ${version}`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareVersions = (left: NodeVersion, right: NodeVersion): number => {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};

/** The comparator forms npm uses in the Vite engine declaration. */
const satisfiesComparator = (
  version: NodeVersion,
  comparator: string,
): boolean => {
  const match = /^(\^|~|>=|<=|>|<)?(\d+\.\d+\.\d+)$/.exec(comparator);

  if (match === null) {
    throw new Error(`Unsupported Node engine comparator: ${comparator}`);
  }

  const operator = match[1] ?? "=";
  const minimum = nodeVersion(match[2] ?? "");
  const comparison = compareVersions(version, minimum);

  if (operator === "^") {
    return version[0] === minimum[0] && comparison >= 0;
  }

  if (operator === "~") {
    return (
      version[0] === minimum[0] && version[1] === minimum[1] && comparison >= 0
    );
  }

  if (operator === ">=") return comparison >= 0;
  if (operator === "<=") return comparison <= 0;
  if (operator === ">") return comparison > 0;
  if (operator === "<") return comparison < 0;

  return comparison === 0;
};

const satisfiesNodeRange = (version: string, range: string): boolean =>
  range.split("||").some((alternative) =>
    alternative
      .trim()
      .split(/\s+/)
      .every((comparator) =>
        satisfiesComparator(nodeVersion(version), comparator),
      ),
  );

describe("toolchain pins", () => {
  it("declares the same Node.js version everywhere", () => {
    const nvmrc = readText(".nvmrc").trim();
    const nodeVersion = readText(".node-version").trim();

    expect(nvmrc).toMatch(/^\d+\.\d+\.\d+$/);
    expect(nodeVersion).toBe(nvmrc);
    expect(rootManifest.engines?.node).toBe(nvmrc);

    for (const { directory, manifest } of packages) {
      if (manifest.engines?.node === undefined) {
        continue;
      }

      expect(
        manifest.engines.node,
        `packages/${directory}: engines.node must match .nvmrc`,
      ).toBe(nvmrc);
    }
  });

  it("keeps the Node pin inside Vite's supported engine range", () => {
    const lockfile = readJson("package-lock.json");

    if (!isRecord(lockfile) || !isRecord(lockfile.packages)) {
      throw new Error("package-lock.json must contain packages");
    }

    const vite = lockfile.packages["node_modules/vite"];

    if (!isRecord(vite) || !isRecord(vite.engines)) {
      throw new Error("The locked Vite package must declare engines");
    }

    const range = vite.engines.node;
    const pin = rootManifest.engines?.node;

    expect(typeof range).toBe("string");
    expect(pin).toBeDefined();

    if (typeof range !== "string" || pin === undefined) {
      return;
    }

    expect(
      satisfiesNodeRange(pin, range),
      `${pin} must satisfy Vite: ${range}`,
    ).toBe(true);

    // Known inputs prove this guard can reject the failure it was added for.
    expect(satisfiesNodeRange("20.10.0", range)).toBe(false);
    expect(satisfiesNodeRange("22.12.0", range)).toBe(true);
  });

  it("pins the package manager to an exact version", () => {
    expect(rootManifest.packageManager).toMatch(/^npm@\d+\.\d+\.\d+$/);
  });

  it("declares packages/* as a workspace", () => {
    expect(rootManifest.workspaces).toContain("packages/*");
    expect(packages.length).toBeGreaterThan(0);
  });

  it("keeps one lockfile for the whole workspace", () => {
    expect(existsSync(path.join(repoRoot, "package-lock.json"))).toBe(true);

    for (const { directory } of packages) {
      expect(
        existsSync(
          path.join(repoRoot, "packages", directory, "package-lock.json"),
        ),
        `packages/${directory} must not carry its own lockfile`,
      ).toBe(false);
    }
  });

  it("points every repository-scoped dependency at a real workspace version", () => {
    const scope = "@npm-audit-visualizer/";
    const manifests = [
      { label: "(root)", manifest: rootManifest },
      ...packages.map(({ directory, manifest }) => ({
        label: `packages/${directory}`,
        manifest,
      })),
    ];

    for (const { label, manifest } of manifests) {
      const declarations = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
      };

      for (const [dependency, spec] of Object.entries(declarations)) {
        if (!dependency.startsWith(scope)) {
          continue;
        }

        const version = workspaceVersions.get(dependency);

        expect(
          version,
          `${label}: ${dependency} is scoped to this repository but is not a workspace package`,
        ).toBeDefined();
        expect(
          spec,
          `${label}: ${dependency} must track the workspace version ${version}`,
        ).toBe(version);
      }
    }
  });
});
