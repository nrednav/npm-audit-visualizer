import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditProject,
  describeAuditFailure,
  MAX_AUDIT_OUTPUT_BYTES,
  type ProcessResult,
  type RunAuditProcess,
} from "../../src/report/audit.js";

const fixtureText = async (): Promise<string> => {
  const text = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      new URL(
        "../../../contract/test/fixtures/few-vulnerabilities-audit-report.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  return text;
};

const run =
  (script: () => Promise<ProcessResult>): RunAuditProcess =>
  async () =>
    script();

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const workspace = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), "nav-audit-"));
  directories.push(directory);

  return directory;
};

const fakeNpm = async (body: string): Promise<string> => {
  const directory = await workspace();
  const executable = path.join(directory, "npm");
  await writeFile(executable, `#!${process.execPath}\n${body}\n`, "utf8");
  await chmod(executable, 0o755);

  return directory;
};

const withPath = async <T>(bin: string, body: () => Promise<T>): Promise<T> => {
  const original = process.env.PATH;

  process.env.PATH = `${bin}${path.delimiter}${original ?? ""}`;

  try {
    return await body();
  } finally {
    process.env.PATH = original;
  }
};

const completed = (
  exitCode: number | null,
  stdout: string,
  stderr = "",
): ProcessResult => ({ kind: "completed", exitCode, stdout, stderr });

describe("auditProject reads a completed audit", () => {
  it("accepts a clean report that exits zero", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => completed(0, await fixtureText())),
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.report.auditReportVersion).toBe(2);
      expect(Object.keys(result.report.vulnerabilities).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("accepts the vulnerability exit when the report is valid", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => completed(1, await fixtureText())),
    );

    expect(result.ok).toBe(true);
  });
});

describe("auditProject names an operational failure", () => {
  it("carries the exit code and the error output", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () =>
        completed(
          1,
          "",
          "npm ERR! code ENOLOCK\nnpm ERR! audit requires a lockfile",
        ),
      ),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("failed");

    if (result.failure.kind !== "failed") {
      return;
    }

    expect(result.failure.exitCode).toBe(1);
    expect(describeAuditFailure(result.failure)).toContain("ENOLOCK");
    expect(describeAuditFailure(result.failure)).toContain("--file");
  });

  it("keeps a contract mismatch separate from an npm failure", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => completed(0, "{ nope")),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("report");
    expect(describeAuditFailure(result.failure)).toContain("not valid JSON");
  });

  it("names a missing npm executable", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => ({ kind: "unavailable", reason: "spawn npm ENOENT" })),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("unavailable");
    expect(describeAuditFailure(result.failure)).toContain("ENOENT");
  });

  it("refuses output beyond the bound before parsing it", async () => {
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => ({
        kind: "too-large",
        limit: MAX_AUDIT_OUTPUT_BYTES,
      })),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("too-large");
    expect(describeAuditFailure(result.failure)).toContain(
      String(MAX_AUDIT_OUTPUT_BYTES),
    );
  });
});

describe("auditProject stops at an interruption", () => {
  it("does not start a process for a signal that already fired", async () => {
    const controller = new AbortController();
    controller.abort();

    let calls = 0;
    const result = await auditProject(
      "/project",
      controller.signal,
      run(async () => {
        calls += 1;
        return completed(0, "{}");
      }),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("aborted");
    expect(calls).toBe(0);
  });

  it("reports an interruption during acquisition", async () => {
    const controller = new AbortController();
    const slow: RunAuditProcess = (_cwd, signal) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve({ kind: "aborted" }));
      });

    const pending = auditProject("/project", controller.signal, slow);
    controller.abort();

    const result = await pending;

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind).toBe("aborted");
    }
  });
});

describe("runNpmAudit drives the real npm command", () => {
  let project: string;

  beforeEach(async () => {
    project = await workspace();
  });

  it("audits the supplied directory with no shell and piped streams", async () => {
    const bin = await fakeNpm(`
const fs = require("node:fs");
const path = require("node:path");
const record = {
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  shell: process.env.SHELL ?? null,
};
fs.writeFileSync(path.join(process.cwd(), "invocation.json"), JSON.stringify(record));
process.stdout.write(${JSON.stringify(await fixtureText())});
`);

    const result = await withPath(bin, () =>
      auditProject(project, new AbortController().signal),
    );

    expect(result.ok).toBe(true);

    const record = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        path.join(project, "invocation.json"),
        "utf8",
      ),
    ) as { argv: string[]; cwd: string };

    expect(record.argv).toEqual(["audit", "--json"]);
    expect(record.cwd).toBe(project);
  });

  it("settles once when the command cannot start", async () => {
    const result = await auditProject(
      path.join(project, "absent"),
      new AbortController().signal,
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind).toBe("unavailable");
    }
  });

  it("accepts a valid report from a process that exits nonzero", async () => {
    const bin = await fakeNpm(`
process.stdout.write(${JSON.stringify(await fixtureText())});
process.exitCode = 1;
`);

    const result = await withPath(bin, () =>
      auditProject(project, new AbortController().signal),
    );

    expect(result.ok).toBe(true);
  });

  it("kills a producer that passes the output bound", async () => {
    const bin = await fakeNpm(`
const chunk = "x".repeat(1024 * 1024);
for (let index = 0; index < 20; index += 1) {
  process.stdout.write(chunk);
}
process.stdout.write("done");
`);

    const result = await withPath(bin, () =>
      auditProject(project, new AbortController().signal),
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind).toBe("too-large");
    }
  }, 20000);

  it("terminates the child when the caller interrupts", async () => {
    const bin = await fakeNpm(`
const fs = require("node:fs");
const path = require("node:path");
fs.writeFileSync(path.join(process.cwd(), "started"), "1");
process.on("SIGTERM", () => {
  fs.writeFileSync(path.join(process.cwd(), "terminated"), "1");
  process.exit(0);
});
setInterval(() => {}, 1000);
`);

    const controller = new AbortController();
    const pending = withPath(bin, () =>
      auditProject(project, controller.signal),
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    controller.abort();

    const result = await pending;
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind).toBe("aborted");
    }

    const entries = await readdir(project);
    expect(entries).toContain("started");
    expect(entries).toContain("terminated");
  }, 20000);
});
