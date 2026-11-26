import { spawn } from "node:child_process";
import type { AuditReport } from "@npm-audit-visualizer/contract";
import { digestOf } from "./identity.js";
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
  | {
      ok: true;
      report: AuditReport;
      digest: string;
      /**
       * When the audit finished, which is the instant this project was observed.
       * Stamped here because this is the only place that observed anything.
       */
      observedAt: string;
    }
  | { ok: false; failure: AuditFailure };

export type ProcessResult =
  | {
      kind: "completed";
      exitCode: number | null;
      /**
       * The bytes npm wrote, not a decoded string. A string here would be hashed
       * after a lossy decode, and the digest would name something nobody received.
       */
      stdout: Uint8Array;
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

/** Long enough for a producer to write its last byte and exit on SIGTERM. */
export const KILL_GRACE_MS = 2_000;

/** If a killed child never reports its exit, the caller is not held forever. */
export const KILL_GIVE_UP_MS = 2_000;

export const runProcess = (
  spec: ProcessCommand,
  cwd: string,
  signal: AbortSignal,
  killGraceMs: number = KILL_GRACE_MS,
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

    const stdout: Uint8Array[] = [];
    let stderr = "";
    let bytes = 0;
    let settled = false;
    /** Set once the caller has demanded the child stop, by abort or by size. */
    let stopping: "aborted" | "too-large" | null = null;
    let escalate: ReturnType<typeof setTimeout> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;

    const clearTimers = (): void => {
      if (escalate !== undefined) {
        clearTimeout(escalate);
      }
      if (giveUp !== undefined) {
        clearTimeout(giveUp);
      }
    };

    const finish = (result: ProcessResult): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimers();
      signal.removeEventListener("abort", onAbort);
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      resolve(result);
    };

    const stoppingResult = (): ProcessResult =>
      stopping === "too-large"
        ? { kind: "too-large", limit: MAX_AUDIT_OUTPUT_BYTES }
        : { kind: "aborted" };

    /**
     * A killed child is still a running child until it reports its exit. The
     * promise settles on `close`, never on the kill, so a caller that has been
     * told the run finished is not left with a live producer behind it.
     */
    const stop = (reason: "aborted" | "too-large"): void => {
      if (stopping !== null || settled) {
        return;
      }

      stopping = reason;
      child.kill();

      escalate = setTimeout(() => {
        child.kill("SIGKILL");
      }, killGraceMs);

      giveUp = setTimeout(() => {
        finish(stoppingResult());
      }, killGraceMs + KILL_GIVE_UP_MS);
    };

    const onAbort = (): void => {
      stop("aborted");
    };

    signal.addEventListener("abort", onAbort, { once: true });

    const collect = (chunk: Buffer, stream: "stdout" | "stderr"): void => {
      bytes += chunk.length;

      if (stream === "stdout") {
        stdout.push(chunk);
      } else {
        stderr += chunk.toString("utf8");
      }

      if (bytes > MAX_AUDIT_OUTPUT_BYTES) {
        stop("too-large");
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => collect(chunk, "stdout"));
    child.stderr?.on("data", (chunk: Buffer) => collect(chunk, "stderr"));

    child.once("error", (error: Error) => {
      finish({ kind: "unavailable", reason: error.message });
    });

    child.once("close", (exitCode: number | null) => {
      // A run that was told to stop reports why, not what it managed to print.
      if (stopping !== null) {
        finish(stoppingResult());
        return;
      }

      finish({
        kind: "completed",
        exitCode,
        stdout: new Uint8Array(Buffer.concat(stdout)),
        stderr,
      });
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
  now: () => Date = () => new Date(),
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
      const parsed = parseReport(
        Buffer.from(outcome.stdout).toString("utf8"),
        AUDIT_SOURCE,
      );

      if (parsed.ok) {
        return {
          ...parsed,
          digest: digestOf(outcome.stdout),
          observedAt: now().toISOString(),
        };
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
