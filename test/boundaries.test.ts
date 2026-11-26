import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVIDENCE_ORIGINS,
  PAYLOAD_SCHEMA_VERSION,
} from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const walk = (directory: string): string[] => {
  const absolute = path.join(repoRoot, directory);

  try {
    statSync(absolute);
  } catch {
    return [];
  }

  const found: string[] = [];

  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...walk(relative));
      continue;
    }

    found.push(relative);
  }

  return found;
};

const sources = (packageName: string): string[] =>
  walk(`packages/${packageName}/src`).filter((file) => /\.tsx?$/.test(file));

const importsOf = (relativePath: string): string[] => {
  const text = readFileSync(path.join(repoRoot, relativePath), "utf8");
  const specifiers = new Set<string>();

  for (const match of text.matchAll(/from\s+"([^"]+)"/g)) {
    const specifier = match[1];

    if (specifier !== undefined) {
      specifiers.add(specifier);
    }
  }

  for (const match of text.matchAll(/import\s+"([^"]+)"/g)) {
    const specifier = match[1];

    if (specifier !== undefined) {
      specifiers.add(specifier);
    }
  }

  return [...specifiers];
};

const manifestOf = (packageName: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      path.join(repoRoot, "packages", packageName, "package.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;

const declaredDependencies = (manifest: Record<string, unknown>): string[] => {
  const names = new Set<string>();

  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const group = manifest[field];

    if (typeof group !== "object" || group === null) {
      continue;
    }

    for (const name of Object.keys(group)) {
      names.add(name);
    }
  }

  return [...names];
};

describe("the contract holds no runtime", () => {
  it("imports nothing but its own modules and zod", () => {
    // This subsumes "no Node builtin": a `node:` specifier matches neither the
    // zod arm nor the relative arms, so one allowlist covers both failures.
    const allowed = /^(zod|\.\/.*|\.\.\/.*)$/;
    const offenders: string[] = [];

    for (const file of sources("contract")) {
      for (const specifier of importsOf(file)) {
        if (!allowed.test(specifier)) {
          offenders.push(`${file}: ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the host does not carry the renderer's graph library", () => {
  it("does not declare graphology anywhere", () => {
    const declared = declaredDependencies(manifestOf("host"));

    expect(declared.filter((name) => name.startsWith("graphology"))).toEqual(
      [],
    );
    expect(declared).not.toContain("sigma");
  });

  it("does not import graphology from its source", () => {
    const offenders = sources("host").filter((file) =>
      importsOf(file).some((specifier) => /graphology|^sigma/.test(specifier)),
    );

    expect(offenders).toEqual([]);
  });
});

describe("the surface reaches the host through nothing", () => {
  it("imports no file from the host package", () => {
    const offenders: string[] = [];

    for (const file of sources("surface")) {
      for (const specifier of importsOf(file)) {
        if (/packages\/host|npm-audit-visualizer\/src/.test(specifier)) {
          offenders.push(`${file}: ${specifier}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("imports no Node builtin", () => {
    const offenders = sources("surface").filter((file) =>
      importsOf(file).some((specifier) => specifier.startsWith("node:")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("nothing terminates the process below the entry module", () => {
  it("calls process.exit from no host module", () => {
    const offenders = sources("host").filter((file) =>
      /process\.exit\s*\(/.test(
        readFileSync(path.join(repoRoot, file), "utf8"),
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("assigns the exit code only in main.ts", () => {
    const offenders = sources("host").filter(
      (file) =>
        file !== "packages/host/src/main.ts" &&
        /process\.exitCode\s*=/.test(
          readFileSync(path.join(repoRoot, file), "utf8"),
        ),
    );

    expect(offenders).toEqual([]);
  });
});

describe("no module imports across a package boundary by path", () => {
  it("resolves the old repository-root alias nowhere", () => {
    const offenders = [
      ...sources("host"),
      ...sources("surface"),
      ...sources("contract"),
    ].filter((file) =>
      importsOf(file).some((specifier) => specifier.startsWith("root/")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("no specifier resolves into another package by path", () => {
  it("keeps every surface import inside the surface or the contract", () => {
    const hostRoot = path.join(repoRoot, "packages/host");
    const surfaceRoot = path.join(repoRoot, "packages/surface");
    const contractRoot = path.join(repoRoot, "packages/contract");
    const offenders: string[] = [];

    for (const file of sources("surface")) {
      const from = path.dirname(path.join(repoRoot, file));

      for (const specifier of importsOf(file)) {
        if (!specifier.startsWith(".")) {
          continue;
        }

        const resolved = path.resolve(from, specifier);

        if (resolved.startsWith(hostRoot)) {
          offenders.push(`${file}: ${specifier} resolves into packages/host`);
          continue;
        }

        if (
          !resolved.startsWith(surfaceRoot) &&
          !resolved.startsWith(contractRoot)
        ) {
          offenders.push(
            `${file}: ${specifier} resolves outside the workspace`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the listener names its host", () => {
  const argumentList = (source: string, start: number): string => {
    let depth = 0;
    let index = start;

    while (index < source.length) {
      const character = source[index];

      if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;

        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }

      index += 1;
    }

    return source.slice(start);
  };

  it("passes a host to every listen call", () => {
    const offenders: string[] = [];

    for (const file of sources("host")) {
      const source = readFileSync(path.join(repoRoot, file), "utf8");

      for (const match of source.matchAll(/\.listen\(/g)) {
        const open = match.index + match[0].length - 1;
        const call = argumentList(source, open);
        const commas = call.split(",").length - 1;

        if (commas < 1) {
          offenders.push(`${file}: ${call}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the payload contract is documented where a reader looks", () => {
  const reference = (): string =>
    readFileSync(path.join(repoRoot, "docs/cli-reference.md"), "utf8");

  const rowStarting = (prefix: string): string | undefined =>
    reference()
      .split("\n")
      .find((line) => line.startsWith(prefix));

  it("names the payload version and its current value", () => {
    const row = rowStarting("| `schemaVersion` ");

    expect(row).toBeDefined();
    expect(row).toContain("| number |");
    expect(row).toContain(String(PAYLOAD_SCHEMA_VERSION));
  });

  it("keeps the payload version apart from the npm report version", () => {
    const text = reference();

    expect(text).toMatch(/not the npm report's `auditReportVersion`/);
    expect(text).toMatch(/`auditReportVersion`[^\n]*npm report shape/);
  });

  it("states that a mismatch and a missing version are refused", () => {
    const text = reference();

    expect(text).toMatch(/exact match on `schemaVersion`/);
    expect(text).toMatch(/A different value, a\s+missing value/);
    expect(text).toMatch(
      /never falls back to treating an incompatible payload/,
    );
  });

  it("documents every source descriptor field", () => {
    const text = reference();

    for (const field of [
      "`kind`",
      "`producer`",
      "`schemaVersion`",
      "`createdAt`",
      "`label`",
    ]) {
      expect(text).toContain(field);
    }
  });

  it("states that a label is never a path", () => {
    const text = reference();

    expect(text).toMatch(/The label is never a path/);
    expect(text).toContain("no `/` or `\\` character");
    expect(text).toMatch(/audit report from a file/);
  });

  it("states that an unstated value stays unfilled", () => {
    const text = reference();

    expect(text).toMatch(/An unstated value stays unfilled/);
    expect(text).toMatch(/modification time is not a creation time/);
  });

  it("documents each of the four evidence origins", () => {
    const text = reference();

    for (const origin of EVIDENCE_ORIGINS) {
      expect(text).toContain(`\`${origin}\``);
    }
  });

  it("states that unknown is a knowledge state and not an origin", () => {
    const text = reference();

    expect(text).toMatch(/`unknown` is \*\*not\*\* an origin/);
    expect(text).toMatch(/refuses `unknown` as an origin/);
  });

  it("states that an unknown carries a reason and that null states nothing", () => {
    const text = reference();

    expect(text).toMatch(/reason is required/i);
    expect(text).toMatch(/A `null` does not mean unknown/);
    expect(text).toMatch(/states an unknown with a\s+reason instead/);
  });

  it("documents the graph derivation and its basis", () => {
    const text = reference();

    expect(text).toMatch(/`graph\.derivation`/);
    expect(text).toMatch(/`basis`[^\n]*audit-via/);
    expect(text).toMatch(/Always `derived`/);
  });

  it("states that the graph is not a complete dependency tree", () => {
    const text = reference();

    expect(text).toMatch(/not a complete dependency tree/i);
    expect(text).toMatch(/absent package is not evidence/i);
  });

  it("states that npm fields carry no origin wrapper", () => {
    const text = reference();

    expect(text).toMatch(/inherit the report's\s+`reported` origin/);
  });
});
