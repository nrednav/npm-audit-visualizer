import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  auditProject,
  describeAuditFailure,
  MAX_AUDIT_OUTPUT_BYTES,
  npmAuditCommand,
  type ProcessCommand,
  type ProcessResult,
  type RunAuditProcess,
  runProcess,
} from "../../src/report/audit.js";
import { digestOf } from "../../src/report/identity.js";

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

const completed = (
  exitCode: number | null,
  stdout: string,
  stderr = "",
): ProcessResult => ({
  kind: "completed",
  exitCode,
  stdout: new TextEncoder().encode(stdout),
  stderr,
});

describe("auditProject identity", () => {
  it("hashes the bytes npm wrote, not the decoded text", async () => {
    const text = await fixtureText();
    const bytes = new TextEncoder().encode(text);
    const result = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => ({
        kind: "completed",
        exitCode: 1,
        stdout: bytes,
        stderr: "",
      })),
    );

    expect(result.ok && result.digest).toBe(
      `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    );
  });

  it("changes the identity when npm writes the same report differently", async () => {
    const text = await fixtureText();
    const spaced = `${text}\n`;
    const run1 = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => completed(0, text)),
    );
    const run2 = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => completed(0, spaced)),
    );

    expect(run1.ok && run1.report).toEqual(run2.ok && run2.report);
    expect(run1.ok && run1.digest).not.toBe(run2.ok && run2.digest);
  });

  it("gives the same identity to the same bytes from either path", async () => {
    const text = await fixtureText();
    const bytes = new TextEncoder().encode(text);
    const fromProcess = await auditProject(
      "/project",
      new AbortController().signal,
      run(async () => ({
        kind: "completed",
        exitCode: 0,
        stdout: bytes,
        stderr: "",
      })),
    );
    const direct = digestOf(bytes);

    expect(fromProcess.ok && fromProcess.digest).toBe(direct);
  });
});

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

const nodeProcess = (body: string): ProcessCommand => ({
  command: process.execPath,
  args: ["-e", body],
  shell: false,
});

const runNode =
  (body: string) =>
  (cwd: string, signal: AbortSignal): Promise<ProcessResult> =>
    runProcess(nodeProcess(body), cwd, signal);

describe("npmAuditCommand names the product invocation", () => {
  it("asks npm for the JSON audit without a shell", () => {
    const spec = npmAuditCommand();

    expect(spec.args).toEqual(["audit", "--json"]);

    if (process.platform === "win32") {
      expect(spec.command).toBe("npm.cmd");
      expect(spec.shell).toBe(true);
    } else {
      expect(spec.command).toBe("npm");
      expect(spec.shell).toBe(false);
    }
  });
});

describe("runProcess drives a real child process", () => {
  let project: string;

  beforeEach(async () => {
    project = await workspace();
  });

  it("runs the child in the supplied directory and reads its report", async () => {
    const body = `
const fs = require("node:fs");
const path = require("node:path");
fs.writeFileSync(
  path.join(process.cwd(), "invocation.json"),
  JSON.stringify({ cwd: process.cwd() }),
);
process.stdout.write(${JSON.stringify(await fixtureText())});
`;

    const result = await auditProject(
      project,
      new AbortController().signal,
      runNode(body),
    );

    expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);

    const record = JSON.parse(
      await readFile(path.join(project, "invocation.json"), "utf8"),
    ) as { cwd: string };

    expect(await realpath(record.cwd)).toBe(await realpath(project));
  });

  it("settles once when the command cannot start", async () => {
    const missing = path.join(project, "absent");

    const result = await auditProject(
      project,
      new AbortController().signal,
      (cwd, signal) =>
        runProcess({ command: missing, args: [], shell: false }, cwd, signal),
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind).toBe("unavailable");
    }
  });

  it("accepts a valid report from a process that exits nonzero", async () => {
    const body = `
process.stdout.write(${JSON.stringify(await fixtureText())});
process.exitCode = 1;
`;

    const result = await auditProject(
      project,
      new AbortController().signal,
      runNode(body),
    );

    expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
  });

  it("kills a producer that passes the output bound", async () => {
    const body = `
const chunk = "x".repeat(1024 * 1024);
for (let index = 0; index < 20; index += 1) {
  process.stdout.write(chunk);
}
process.stdout.write("done");
`;

    const result = await auditProject(
      project,
      new AbortController().signal,
      runNode(body),
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind, JSON.stringify(result.failure, null, 2)).toBe(
        "too-large",
      );
    }
  }, 20000);

  it("terminates the child when the caller interrupts", async () => {
    const body = `
const fs = require("node:fs");
const path = require("node:path");
// The handler is installed before "started" exists, so the marker means the
// child can report its own termination. Writing first left a window in which a
// kill arrived with no handler yet, and the test failed under load.
process.on("SIGTERM", () => {
  fs.writeFileSync(path.join(process.cwd(), "terminated"), "1");
  process.exit(0);
});
fs.writeFileSync(path.join(process.cwd(), "started"), "1");
setInterval(() => {}, 1000);
`;

    const controller = new AbortController();
    const pending = auditProject(project, controller.signal, runNode(body));

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    controller.abort();

    const result = await pending;
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.failure.kind, JSON.stringify(result.failure, null, 2)).toBe(
        "aborted",
      );
    }

    const entries = await readdir(project);
    expect(entries).toContain("started");
    expect(entries).toContain("terminated");
  }, 20000);
});
