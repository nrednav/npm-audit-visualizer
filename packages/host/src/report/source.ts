import path from "node:path";
import {
  isSafeLabel,
  type SourceDescriptor,
  SUPPORTED_AUDIT_REPORT_VERSION,
} from "@npm-audit-visualizer/contract";

const FILE_LABEL_FALLBACK = "audit report from a file";

/**
 * npm states neither its own version nor a completion time in its report, so
 * both stay unfilled rather than being replaced by anything this process knows.
 *
 * The label carries only the file's own name: the directory is none of the
 * reader's business. A basename can still be unsafe, because a backslash is a
 * legal filename character wherever the platform does not treat it as a
 * separator, so the fallback keeps construction total instead of letting an
 * unusual filename make the tool refuse a report it can read.
 */
export const sourceOfFile = (filePath: string): SourceDescriptor => {
  const name = path.basename(filePath);

  return {
    kind: "audit-report",
    producer: { name: "npm", version: null },
    schemaVersion: String(SUPPORTED_AUDIT_REPORT_VERSION),
    createdAt: null,
    label: isSafeLabel(name) ? name : FILE_LABEL_FALLBACK,
  };
};

/**
 * An automatic audit has no file, so its label is a phrase rather than a name.
 * It deliberately omits the project directory for the same reason the file
 * path is reduced to its basename.
 */
export const sourceOfAudit = (): SourceDescriptor => ({
  kind: "audit-report",
  producer: { name: "npm", version: null },
  schemaVersion: String(SUPPORTED_AUDIT_REPORT_VERSION),
  createdAt: null,
  label: "npm audit in the current project",
});
