import { readFile } from "node:fs/promises";
import {
  type AuditReport,
  AuditReportSchema,
  SUPPORTED_AUDIT_REPORT_VERSION,
} from "@npm-audit-visualizer/contract";

export type ReadFailure =
  | { kind: "missing"; source: string }
  | { kind: "unreadable"; source: string; reason: string }
  | { kind: "not-json"; source: string; reason: string }
  | { kind: "not-a-report"; source: string; paths: string[] }
  | {
      kind: "unsupported-version";
      source: string;
      found: string;
      supported: number;
    };

export type ParseFailure = Extract<
  ReadFailure,
  { kind: "not-json" | "not-a-report" | "unsupported-version" }
>;

export type ParseResult =
  | { ok: true; report: AuditReport }
  | { ok: false; failure: ParseFailure };

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

const describeFileError = (source: string, error: unknown): ReadFailure => {
  const code = errorCode(error);

  if (code === "ENOENT") {
    return { kind: "missing", source };
  }

  if (code === "EISDIR") {
    return { kind: "unreadable", source, reason: "it is a directory" };
  }

  if (code === "EACCES" || code === "EPERM") {
    return { kind: "unreadable", source, reason: "permission denied" };
  }

  return {
    kind: "unreadable",
    source,
    reason: code === undefined ? errorMessage(error) : code,
  };
};

/**
 * One parser for every report source. File reading and process execution only
 * differ in how they obtain `text`, so validation cannot drift between them.
 */
export const parseReport = (text: string, source: string): ParseResult => {
  let raw: unknown;

  try {
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    return {
      ok: false,
      failure: { kind: "not-json", source, reason: errorMessage(error) },
    };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      failure: { kind: "not-a-report", source, paths: ["(root)"] },
    };
  }

  const version = (raw as Record<string, unknown>).auditReportVersion;

  if (version !== SUPPORTED_AUDIT_REPORT_VERSION) {
    return {
      ok: false,
      failure: {
        kind: "unsupported-version",
        source,
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
        source,
        paths: report.error.issues
          .slice(0, MAX_REPORTED_PATHS)
          .map((issue) => issue.path.join(".") || "(root)"),
      },
    };
  }

  return { ok: true, report: report.data };
};

export const readReport = async (filePath: string): Promise<ReadResult> => {
  let text: string;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    return { ok: false, failure: describeFileError(filePath, error) };
  }

  return parseReport(text, filePath);
};

/**
 * One sentence per failure kind, so that "not a report" can never be mistaken
 * for "a report with no findings".
 */
export const describeReadFailure = (failure: ReadFailure): string => {
  switch (failure.kind) {
    case "missing":
      return `No file exists at ${failure.source}. Pass the path of a report written by "npm audit --json > report.json".`;
    case "unreadable":
      return `Cannot read ${failure.source}: ${failure.reason}.`;
    case "not-json":
      return `${failure.source} is not valid JSON: ${failure.reason}`;
    case "not-a-report":
      return `${failure.source} is not an npm audit report. Could not read: ${failure.paths.join(", ")}.`;
    case "unsupported-version":
      return `${failure.source} is audit report version ${failure.found}. This tool reads version ${failure.supported}.`;
  }
};
