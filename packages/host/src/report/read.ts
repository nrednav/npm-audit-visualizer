import { readFile } from "node:fs/promises";
import {
  type AuditReport,
  AuditReportSchema,
  SUPPORTED_AUDIT_REPORT_VERSION,
} from "@npm-audit-visualizer/contract";

export type ReadFailure =
  | { kind: "missing"; path: string }
  | { kind: "unreadable"; path: string; reason: string }
  | { kind: "not-json"; path: string; reason: string }
  | { kind: "not-a-report"; path: string; paths: string[] }
  | {
      kind: "unsupported-version";
      path: string;
      found: string;
      supported: number;
    };

export type ReadResult =
  | { ok: true; report: AuditReport }
  | { ok: false; failure: ReadFailure };

const MAX_REPORTED_PATHS = 3;

const errorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;

  return typeof code === "string" ? code : undefined;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const describeFileError = (filePath: string, error: unknown): ReadFailure => {
  const code = errorCode(error);

  if (code === "ENOENT") {
    return { kind: "missing", path: filePath };
  }

  if (code === "EISDIR") {
    return { kind: "unreadable", path: filePath, reason: "it is a directory" };
  }

  if (code === "EACCES" || code === "EPERM") {
    return { kind: "unreadable", path: filePath, reason: "permission denied" };
  }

  return {
    kind: "unreadable",
    path: filePath,
    reason: code === undefined ? errorMessage(error) : code,
  };
};

const parseJson = (
  filePath: string,
  text: string,
): { ok: true; value: unknown } | { ok: false; failure: ReadFailure } => {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "not-json",
        path: filePath,
        reason: errorMessage(error),
      },
    };
  }
};

export const readReport = async (filePath: string): Promise<ReadResult> => {
  let text: string;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    return { ok: false, failure: describeFileError(filePath, error) };
  }

  const parsed = parseJson(filePath, text);

  if (!parsed.ok) {
    return parsed;
  }

  const raw = parsed.value;

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      failure: { kind: "not-a-report", path: filePath, paths: ["(root)"] },
    };
  }

  const version = (raw as Record<string, unknown>).auditReportVersion;

  if (version !== SUPPORTED_AUDIT_REPORT_VERSION) {
    return {
      ok: false,
      failure: {
        kind: "unsupported-version",
        path: filePath,
        found: String(version),
        supported: SUPPORTED_AUDIT_REPORT_VERSION,
      },
    };
  }

  const report = AuditReportSchema.safeParse(raw);

  if (!report.success) {
    return {
      ok: false,
      failure: {
        kind: "not-a-report",
        path: filePath,
        paths: report.error.issues
          .slice(0, MAX_REPORTED_PATHS)
          .map((issue) => issue.path.join(".") || "(root)"),
      },
    };
  }

  return { ok: true, report: report.data };
};

/**
 * One sentence per failure kind, so that "not a report" can never be mistaken
 * for "a report with no findings".
 */
export const describeReadFailure = (failure: ReadFailure): string => {
  switch (failure.kind) {
    case "missing":
      return `No file exists at ${failure.path}. Pass the path of a report written by "npm audit --json > report.json".`;
    case "unreadable":
      return `Cannot read ${failure.path}: ${failure.reason}.`;
    case "not-json":
      return `${failure.path} is not valid JSON: ${failure.reason}`;
    case "not-a-report":
      return `${failure.path} is not an npm audit report. Could not read: ${failure.paths.join(", ")}.`;
    case "unsupported-version":
      return `${failure.path} is audit report version ${failure.found}. This tool reads version ${failure.supported}.`;
  }
};
