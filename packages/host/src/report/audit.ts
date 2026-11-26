import { spawn } from "node:child_process";
import type { AuditReport } from "@npm-audit-visualizer/contract";
import { describeReadFailure, type ParseFailure, parseReport } from "./read.js";

export const AUDIT_SOURCE = "npm audit --json output";
export const MAX_AUDIT_OUTPUT_BYTES = 16 * 1024 * 1024;

export type AuditFailure =
  | { kind: "unavailable"; reason: string }
  | { kind: "aborted" }
  | { kind: "too-large"; limit: number }
  | { kind: "report"; failure: ParseFailure }
  | {
      kind: "failed";
      exitCode: number;
      stderr: string;
      failure: ParseFailure;
    };

export type AuditResult =
  | { ok: true; report: AuditReport }
  | { ok: false; failure: AuditFailure };

export type ProcessResult =
  | {
      kind: "completed";
      exitCode: number | null;
      stdout: string;
      stderr: string;
    }
  | { kind: "unavailable"; reason: string }
  | { kind: "aborted" }
  | { kind: "too-large"; limit: number };

export type RunAuditProcess = (
  cwd: string,
  signal: AbortSignal,
) => Promise<ProcessResult>;

export type ProcessCommand = {
  command: string;
  args: readonly string[];
  shell: boolean;
};

/**
 * Windows starts `.cmd` shims only through a command interpreter. The command
 * and its arguments are constants, so this shell carries no caller input.
 */
export const npmAuditCommand = (): ProcessCommand => ({
  command: process.platform === "win32" ? "npm.cmd" : "npm",
  args: ["audit", "--json"],
  shell: process.platform === "win32",
});

export const runProcess = (
  spec: ProcessCommand,
  cwd: string,
  signal: AbortSignal,
): Promise<ProcessResult> =>
  new Promise<ProcessResult>((resolve) => {
    if (signal.aborted) {
      resolve({ kind: "aborted" });
      return;
    }

    const child = spawn(spec.command, [...spec.args], {
      cwd,
      shell: spec.shell,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let settled = false;

    const finish = (result: ProcessResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      signal.removeEventListener("abort", onAbort);
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      resolve(result);
    };

    const onAbort = (): void => {
      child.kill();
      finish({ kind: "aborted" });
    };

    signal.addEventListener("abort", onAbort, { once: true });

    const collect = (chunk: string, stream: "stdout" | "stderr"): void => {
      bytes += Buffer.byteLength(chunk);

      if (stream === "stdout") {
        stdout += chunk;
      } else {
        stderr += chunk;
      }

      if (bytes > MAX_AUDIT_OUTPUT_BYTES) {
        child.kill();
        finish({ kind: "too-large", limit: MAX_AUDIT_OUTPUT_BYTES });
      }
    };

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => collect(chunk, "stdout"));
    child.stderr?.on("data", (chunk: string) => collect(chunk, "stderr"));

    child.once("error", (error: Error) => {
      finish({ kind: "unavailable", reason: error.message });
    });

    child.once("close", (exitCode: number | null) => {
      finish({ kind: "completed", exitCode, stdout, stderr });
    });
  });

export const runNpmAudit: RunAuditProcess = (cwd, signal) =>
  runProcess(npmAuditCommand(), cwd, signal);

/**
 * A valid report wins over the exit status. `npm audit` exits nonzero when it
 * has vulnerabilities to report, so the status alone cannot decide validity.
 */
export const auditProject = async (
  cwd: string,
  signal: AbortSignal,
  run: RunAuditProcess = runNpmAudit,
): Promise<AuditResult> => {
  if (signal.aborted) {
    return { ok: false, failure: { kind: "aborted" } };
  }

  const outcome = await run(cwd, signal);

  switch (outcome.kind) {
    case "aborted":
      return { ok: false, failure: { kind: "aborted" } };
    case "too-large":
      return {
        ok: false,
        failure: { kind: "too-large", limit: outcome.limit },
      };
    case "unavailable":
      return {
        ok: false,
        failure: { kind: "unavailable", reason: outcome.reason },
      };
    case "completed": {
      const parsed = parseReport(outcome.stdout, AUDIT_SOURCE);

      if (parsed.ok) {
        return parsed;
      }

      if (outcome.exitCode !== null && outcome.exitCode !== 0) {
        return {
          ok: false,
          failure: {
            kind: "failed",
            exitCode: outcome.exitCode,
            stderr: outcome.stderr.trim(),
            failure: parsed.failure,
          },
        };
      }

      return {
        ok: false,
        failure: { kind: "report", failure: parsed.failure },
      };
    }
  }
};

const FALLBACK =
  'Run "npm audit --json" yourself and pass the report with --file <path>.';

export const describeAuditFailure = (failure: AuditFailure): string => {
  switch (failure.kind) {
    case "unavailable":
      return `Could not run "npm audit --json": ${failure.reason}. ${FALLBACK}`;
    case "aborted":
      return "The audit was interrupted before a report was available.";
    case "too-large":
      return `"npm audit --json" printed more than ${failure.limit} bytes. ${FALLBACK}`;
    case "report":
      return `The automatic audit did not return a usable report. ${describeReadFailure(failure.failure)} ${FALLBACK}`;
    case "failed": {
      const detail =
        failure.stderr === ""
          ? describeReadFailure(failure.failure)
          : failure.stderr;

      return `"npm audit --json" exited with code ${failure.exitCode}: ${detail} ${FALLBACK}`;
    }
  }
};
