import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/cli.js";
import {
  type TemporaryAssets,
  createTemporaryAssets,
  waitFor,
} from "./support.js";

let assets: TemporaryAssets;

const fixturePath = (name: string): string =>
  new URL(`../../contract/test/fixtures/${name}.json`, import.meta.url)
    .pathname;

type Harness = {
  out: string[];
  err: string[];
  opened: string[];
  controller: AbortController;
  io: Parameters<typeof run>[1];
};

const harness = (signal?: AbortSignal): Harness => {
  const out: string[] = [];
  const err: string[] = [];
  const opened: string[] = [];
  const controller = new AbortController();

  return {
    out,
    err,
    opened,
    controller,
    io: {
      assetsDir: assets.directory,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      openSurface: (url) => opened.push(url),
      signal: signal ?? controller.signal,
    },
  };
};

beforeEach(async () => {
  assets = await createTemporaryAssets();
});

afterEach(async () => {
  await assets.dispose();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("run", () => {
  it("refuses when no report is given", async () => {
    const sink = harness();
    const code = await run([], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("No report given");
    expect(sink.err.join("\n")).toContain("Usage");
    expect(sink.err.join("\n")).toContain("--file");
    expect(sink.out).toEqual([]);
  });

  it("refuses a port that is not a port", async () => {
    const sink = harness();
    const code = await run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "seventy",
      ],
      sink.io,
    );

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("0 to 65535");
  });

  it("refuses an option it does not know", async () => {
    const sink = harness();
    const code = await run(["--files", "x.json"], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n").length).toBeGreaterThan(0);
  });

  it("refuses a stray argument", async () => {
    const sink = harness();
    const code = await run(["report.json"], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("--file");
  });

  it("prints usage and succeeds for --help", async () => {
    const sink = harness();
    const code = await run(["--help"], sink.io);

    expect(code).toBe(0);
    expect(sink.out.join("\n")).toContain("npm-audit-visualizer");
    expect(sink.out.join("\n")).toContain("--no-open");
  });

  it("prints the reason and fails when the report is missing", async () => {
    const sink = harness();
    const code = await run(["--file", "/no/such/report.json"], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("/no/such/report.json");
    expect(sink.out.join("\n")).not.toContain("http://localhost");
  });

  it("prints the address it is serving and opens it", async () => {
    const sink = harness();
    const done = run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "0",
      ],
      sink.io,
    );

    await waitFor(
      () => sink.out.some((line) => line.includes("http://localhost")),
      "the address to be printed",
    );

    await waitFor(() => sink.opened.length === 1, "the surface to be opened");
    expect(sink.opened[0]).toMatch(/^http:\/\/localhost:\d+$/);
    expect(sink.out.join("\n")).toContain(sink.opened[0]);
    expect(sink.out.join("\n")).toContain("Ctrl-C");

    sink.controller.abort();
    expect(await done).toBe(0);
  });

  it("does not open a browser when asked not to", async () => {
    const sink = harness();
    const done = run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "0",
        "--no-open",
      ],
      sink.io,
    );

    await waitFor(
      () => sink.out.some((line) => line.includes("http://localhost")),
      "the address to be printed",
    );

    expect(sink.opened).toEqual([]);

    sink.controller.abort();
    expect(await done).toBe(0);
  });

  it("stops with 130 when the signal has already fired", async () => {
    const controller = new AbortController();
    controller.abort();
    const sink = harness(controller.signal);
    const code = await run(
      ["--file", fixturePath("few-vulnerabilities-audit-report")],
      sink.io,
    );

    expect(code).toBe(130);
    expect(sink.out.join("\n")).not.toContain("http://localhost");
  });

  it("prints the stages it goes through when asked to debug", async () => {
    const sink = harness();
    const done = run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "0",
        "--debug",
        "--no-open",
      ],
      sink.io,
    );

    await waitFor(
      () => sink.out.some((line) => line.includes("http://localhost")),
      "the address to be printed",
    );

    expect(sink.out.join("\n")).toContain("Reading ");
    expect(sink.out.join("\n")).toContain("findings");

    sink.controller.abort();
    await done;
  });
});

const temporaryDirectories: string[] = [];

const writeReport = async (body: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), "nav-report-"));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, "report.json");
  await writeFile(filePath, body, "utf8");

  return filePath;
};

const snapshot = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  const described: string[] = [];

  for (const entry of entries) {
    const target = path.join(entry.parentPath, entry.name);
    const relative = path.relative(directory, target);

    if (entry.isDirectory()) {
      described.push(`${relative}/`);
      continue;
    }

    const stats = await stat(target);
    described.push(`${relative}:${stats.size}:${stats.mtimeMs}`);
  }

  return described.sort();
};

const addressOf = async (sink: Harness): Promise<string> => {
  await waitFor(
    () => sink.out.some((line) => line.includes("http://localhost")),
    "the address to be printed",
  );

  return (
    sink.opened[0] ??
    sink.out.join("\n").match(/http:\/\/localhost:\d+/)?.[0] ??
    ""
  );
};

describe("run refusals carry the reason and the usage", () => {
  it("names the failing field when the JSON is not an audit report", async () => {
    const filePath = await writeReport(
      JSON.stringify({ auditReportVersion: 2, vulnerabilities: {} }),
    );
    const sink = harness();
    const code = await run(["--file", filePath], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("metadata");
    expect(sink.out.join("\n")).not.toContain("http://localhost");
  });

  it("names both the found and the supported report version", async () => {
    const filePath = await writeReport(
      JSON.stringify({
        auditReportVersion: 7,
        vulnerabilities: {},
        metadata: {},
      }),
    );
    const sink = harness();
    const code = await run(["--file", filePath], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("version 7");
    expect(sink.err.join("\n")).toContain("reads version 2");
  });
});

describe("run accepts a report that reports nothing", () => {
  it("serves a report with zero findings instead of refusing it", async () => {
    const sink = harness();
    const done = run(
      ["--file", fixturePath("valid-audit-report"), "--port", "0", "--no-open"],
      sink.io,
    );

    const address = await addressOf(sink);
    expect(address).toMatch(/^http:\/\/localhost:\d+$/);

    const response = await fetch(`${address}/report.json`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { findings: unknown[] };
    expect(body.findings).toEqual([]);

    sink.controller.abort();
    expect(await done).toBe(0);
  });
});

describe("run reports the port it actually bound", () => {
  it("prints an address that answers", async () => {
    const sink = harness();
    const done = run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "0",
        "--no-open",
      ],
      sink.io,
    );

    const address = await addressOf(sink);
    const response = await fetch(`${address}/`);

    expect(response.status).toBe(200);

    sink.controller.abort();
    await done;
  });
});

describe("a complete run leaves the asset directory untouched", () => {
  it("writes nothing to disk", async () => {
    const before = await snapshot(assets.directory);
    const sink = harness();
    const done = run(
      [
        "--file",
        fixturePath("few-vulnerabilities-audit-report"),
        "--port",
        "0",
        "--no-open",
      ],
      sink.io,
    );

    const address = await addressOf(sink);
    await fetch(`${address}/`);
    await fetch(`${address}/report.json`);
    await fetch(`${address}/assets/index-abc123.js`);
    await fetch(`${address}/missing.js`);

    sink.controller.abort();
    await done;

    expect(await snapshot(assets.directory)).toEqual(before);
  });
});
