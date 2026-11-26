import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CONTRACT_BUNDLE,
  ensureBuild,
  HOST_ENTRY,
  readBuilt,
  repoRoot,
  SURFACE_ENTRY,
  waitFor,
} from "./ensure-build.js";

const fixture = path.join(
  repoRoot,
  "packages/contract/test/fixtures/few-vulnerabilities-audit-report.json",
);

let workspace: string;

beforeAll(async () => {
  ensureBuild();
  workspace = await mkdtemp(path.join(tmpdir(), "nav-artifact-"));
}, 300_000);

afterAll(async () => {
  if (workspace === undefined) {
    return;
  }

  await rm(workspace, { recursive: true, force: true });
});

describe("a build produces both runnable artifacts", () => {
  it("leaves the command and the interface on disk", async () => {
    const exists = async (target: string): Promise<boolean> =>
      readdir(path.dirname(target))
        .then((entries) => entries.includes(path.basename(target)))
        .catch(() => false);

    expect(await exists(HOST_ENTRY)).toBe(true);
    expect(await exists(SURFACE_ENTRY)).toBe(true);
  });

  it("leaves the interface's assets beside its entry document", async () => {
    const assets = await readdir(
      path.join(path.dirname(SURFACE_ENTRY), "assets"),
    );

    expect(assets.some((file) => file.endsWith(".js"))).toBe(true);
    expect(assets.some((file) => file.endsWith(".css"))).toBe(true);
  });
});

describe("the built contract runs where no runtime is offered", () => {
  it("imports with no Node builtin and no browser global", async () => {
    const source = readBuilt(CONTRACT_BUNDLE);

    expect(source).not.toMatch(/from\s*"node:/);
    expect(source).not.toMatch(/\bwindow\b/);
    expect(source).not.toMatch(/\bdocument\b/);
    expect(source).not.toMatch(/\bprocess\./);
  });

  it("loads in a bare ESM context", () => {
    const moduleUrl = pathToFileURL(CONTRACT_BUNDLE).href;

    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `const m = await import(${JSON.stringify(moduleUrl)});
         if (typeof m.severityRank !== "function") { process.exitCode = 3 }
         else { process.stdout.write(String(m.severityRank("critical") > m.severityRank("info"))) }`,
      ],
      { cwd: workspace, encoding: "utf8" },
    );

    expect(output).toBe("true");
  });
});

describe("the host bundle carries no renderer", () => {
  it("contains no graphology marker", () => {
    expect(readBuilt(HOST_ENTRY)).not.toMatch(/graphology/i);
  });

  it("imports nothing outside the Node standard library", () => {
    const specifiers = new Set(
      [...readBuilt(HOST_ENTRY).matchAll(/from\s*"([^"]+)"/g)].map(
        (match) => match[1],
      ),
    );

    expect([...specifiers].sort()).toEqual([
      "child_process",
      "crypto",
      "fs",
      "fs/promises",
      "http",
      "path",
      "url",
      "util",
    ]);
  });
});

type PackEntry = { filename: string; files: { path: string }[] };

const packInto = (destination: string): PackEntry => {
  const output = execFileSync(
    "npm",
    [
      "pack",
      "--json",
      "--pack-destination",
      destination,
      "-w",
      "npm-audit-visualizer",
    ],
    { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );

  const parsed = JSON.parse(output) as PackEntry[];
  const [first] = parsed;

  if (first === undefined) {
    throw new Error("npm pack produced no entry");
  }

  return first;
};

describe("the published package", () => {
  it("carries the command and the interface", async () => {
    const entry = packInto(workspace);
    const files = entry.files.map((file) => file.path);

    expect(files).toContain("dist/main.js");
    expect(files).toContain("dist/surface/index.html");
    expect(files.some((file) => file.startsWith("dist/surface/assets/"))).toBe(
      true,
    );
  });

  it("ships the license the manifest declares", async () => {
    const entry = packInto(workspace);
    const files = entry.files.map((file) => file.path);

    // A tarball with no LICENSE carries the terms nowhere a recipient reads
    // them. npm only ships a root-level license file from the package root.
    expect(files).toContain("LICENSE");
  });

  it("carries nothing that only the repository needs", async () => {
    const entry = packInto(workspace);
    const files = entry.files.map((file) => file.path);

    expect(files.filter((file) => file.startsWith("src/"))).toEqual([]);
    expect(files.filter((file) => /\/test\//.test(file))).toEqual([]);
    expect(files.filter((file) => file.includes("node_modules"))).toEqual([]);
    expect(files.filter((file) => file.endsWith(".tsbuildinfo"))).toEqual([]);
  });

  it("declares no runtime dependencies, so install adds one package", () => {
    const manifest = JSON.parse(
      readBuilt(path.join(repoRoot, "packages/host/package.json")),
    ) as { dependencies?: Record<string, string> };

    // Everything the command needs, including zod, is bundled into dist/main.js.
    // A declared runtime dependency would make a global install download a tree.
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it("serves a working page from a clean directory", async () => {
    const entry = packInto(workspace);
    const extractRoot = await mkdtemp(path.join(workspace, "install-"));

    execFileSync("tar", [
      "-xzf",
      path.join(workspace, entry.filename),
      "-C",
      extractRoot,
    ]);

    const installed = path.join(extractRoot, "package");
    const printed: string[] = [];

    const child = spawn(
      process.execPath,
      [
        path.join(installed, "dist/main.js"),
        "--file",
        fixture,
        "--port",
        "0",
        "--no-open",
      ],
      { cwd: extractRoot, stdio: ["ignore", "pipe", "pipe"] },
    );

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      printed.push(...chunk.split("\n").filter((line) => line.length > 0));
    });

    try {
      await waitFor(
        () => printed.some((line) => line.includes("http://localhost:")),
        "the installed command to print an address",
      );

      const address = printed.join("\n").match(/http:\/\/localhost:\d+/)?.[0];

      expect(address).toBeDefined();

      if (address === undefined) {
        return;
      }

      const page = await fetch(`${address}/`);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain('<div id="root">');

      const payload = await fetch(`${address}/report.json`);
      expect(payload.status).toBe(200);

      const body = (await payload.json()) as { findings: unknown[] };
      expect(body.findings).toHaveLength(3);
    } finally {
      child.kill("SIGINT");
      await new Promise((resolve) => {
        child.once("exit", resolve);
      });
    }
  }, 120_000);
});
