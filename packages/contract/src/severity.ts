import { z } from "zod";

/**
 * The report carries these five levels. `none` is not among them: npm emits it
 * only as a count of zero, never as a vulnerability's severity. Including it
 * would give one severity with no finding to classify.
 */
export const SEVERITY_ORDER = [
  "critical",
  "high",
  "moderate",
  "low",
  "info",
] as const;

export type Severity = (typeof SEVERITY_ORDER)[number];

export const SeveritySchema = z.enum(SEVERITY_ORDER);

/**
 * Larger is more urgent. Both sides sort by this, so it is stated once.
 */
export const severityRank = (severity: Severity): number => {
  return SEVERITY_ORDER.length - SEVERITY_ORDER.indexOf(severity);
};

export const isSeverity = (value: string): value is Severity => {
  return (SEVERITY_ORDER as readonly string[]).includes(value);
};
