import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/cli.js";
import {
  type AuditResult,
  auditProject,
  runProcess,
} from "../src/report/audit.js";
import { readReport } from "../src/report/read.js";
import {
  createTemporaryAssets,
  type TemporaryAssets,
  waitFor,
} from "./support.js";

let assets: TemporaryAssets;

const fixturePath = (name: string): string =>
  new URL(`../../contract/test/fixtures/${name}.json`, import.meta.url)
    .pathname;

const fixtureReport = async () => {
  const read = await readReport(
    fixturePath("few-vulnerabilities-audit-report"),
  );

  if (!read.ok) {
    throw new Error("the fixture must be a valid report");
  }

  return read.report;
};

type Harness = {
  out: string[];
  err: string[];
  opened: string[];
  audited: string[];
  controller: AbortController;
  io: Parameters<typeof run>[1];
};

const harness = (
  signal?: AbortSignal,
  audit: Parameters<typeof run>[1]["auditProject"] = async () => {
    throw new Error("the automatic audit was not expected to run");
  },
): Harness => {
  const out: string[] = [];
  const err: string[] = [];
  const opened: string[] = [];
  const audited: string[] = [];
  const controller = new AbortController();

  return {
    out,
    err,
    opened,
    audited,
    controller,
    io: {
      cwd: "/caller/project",
      assetsDir: assets.directory,
      auditProject: (cwd, innerSignal) => {
        audited.push(cwd);
        return audit(cwd, innerSignal);
      },
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      openSurface: (url) => opened.push(url),
      signal: signal ?? controller.signal,
    },
  };
};

const auditReturning =
  (result: AuditResult): Parameters<typeof run>[1]["auditProject"] =>
  async () =>
    result;

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
  it("audits the caller's directory when no report is given", async () => {
    const sink = harness(
      undefined,
      auditReturning({
        ok: true,
        report: await fixtureReport(),
      }),
    );
    const done = run(["--port", "0", "--no-open"], sink.io);

    const address = await addressOf(sink);
    expect(sink.audited).toEqual(["/caller/project"]);

    const response = await fetch(`${address}/report.json`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      findings: unknown[];
      sources: { label: string; createdAt: unknown }[];
    };
    expect(body.findings.length).toBeGreaterThan(0);
    // The audit ran here, so the label must be the phrase and never the
    // caller's directory, which the run did receive as "/caller/project".
    expect(body.sources[0]?.label).toBe("npm audit in the current project");
    expect(body.sources[0]?.createdAt).toEqual({
      unknown: "npm audit --json states no creation time",
    });
    expect(JSON.stringify(body.sources)).not.toContain("/caller/project");

    sink.controller.abort();
    expect(await done).toBe(0);
  });

  it("stops with 130 when the automatic audit is interrupted", async () => {
    const sink = harness(
      undefined,
      auditReturning({ ok: false, failure: { kind: "aborted" } }),
    );
    const code = await run([], sink.io);

    expect(code).toBe(130);
    expect(sink.out.join("\n")).not.toContain("http://localhost");
    expect(sink.opened).toEqual([]);
  });

  it("names an audit failure and serves nothing", async () => {
    const sink = harness(
      undefined,
      auditReturning({
        ok: false,
        failure: { kind: "unavailable", reason: "spawn npm ENOENT" },
      }),
    );
    const code = await run([], sink.io);

    expect(code).toBe(1);
    expect(sink.err.join("\n")).toContain("ENOENT");
    expect(sink.err.join("\n")).toContain("--file");
    expect(sink.out.join("\n")).not.toContain("http://localhost");
    expect(sink.opened).toEqual([]);
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
    expect(sink.out.join("\n")).toContain("current directory");
    expect(sink.out.join("\n")).toContain("--file");
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
    expect(sink.audited).toEqual([]);

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

  it("labels a file source with the file's own name and no directory", async () => {
    const sink = harness();
    const filePath = fixturePath("few-vulnerabilities-audit-report");
    const done = run(["--file", filePath, "--port", "0", "--no-open"], sink.io);

    const address = await addressOf(sink);
    const response = await fetch(`${address}/report.json`);
    const body = (await response.json()) as {
      sources: { label: string; schemaVersion: string | null }[];
    };

    expect(body.sources[0]?.label).toBe(
      "few-vulnerabilities-audit-report.json",
    );
    expect(body.sources[0]?.schemaVersion).toBe("2");
    expect(JSON.stringify(body.sources)).not.toContain(
      path.dirname(filePath).replace(/^\//, ""),
    );

    sink.controller.abort();
    expect(await done).toBe(0);
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
  try {
    await waitFor(
      () => sink.out.some((line) => line.includes("http://localhost")),
      "the address to be printed",
    );
  } catch (error) {
    throw new Error(
      `${(error as Error).message}\nstdout: ${sink.out.join("\n")}\nstderr: ${sink.err.join("\n")}`,
    );
  }

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

describe("an automatic run reads the project through a real child process", () => {
  it("serves the findings and writes no report file", async () => {
    const project = await mkdtemp(path.join(tmpdir(), "nav-project-"));
    temporaryDirectories.push(project);

    const text = await readFile(
      fixturePath("few-vulnerabilities-audit-report"),
      "utf8",
    );
    const script = `process.stdout.write(${JSON.stringify(text)});`;

    const before = await snapshot(project);
    const sink = harness(undefined, (cwd, signal) =>
      auditProject(cwd, signal, (directory, innerSignal) =>
        runProcess(
          { command: process.execPath, args: ["-e", script], shell: false },
          directory,
          innerSignal,
        ),
      ),
    );

    const done = run(["--port", "0", "--no-open"], {
      ...sink.io,
      cwd: project,
    });
    const address = await addressOf(sink);
    const response = await fetch(`${address}/report.json`);
    const body = (await response.json()) as { findings: unknown[] };

    expect(body.findings.length).toBeGreaterThan(0);

    sink.controller.abort();
    expect(await done).toBe(0);
    expect(await snapshot(project)).toEqual(before);
  });
});
