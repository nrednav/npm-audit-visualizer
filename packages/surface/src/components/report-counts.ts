import type { Finding, Payload } from "@npm-audit-visualizer/contract";
import { SEVERITY_ORDER, type Severity } from "src/constants";

export type ReportCounts = {
  findings: number;
  advisories: number;
  metadataTotal: number;
  disagrees: boolean;
};

/**
 * Three numbers, three populations. `findings` is what the table shows and every
 * filter counts from. `advisories` is how many published records those findings
 * carry, which is a different unit and is never added to `findings`.
 * `metadataTotal` is what npm stated in the report's metadata, kept only so a
 * disagreement can be named instead of hidden.
 */
export const countReport = (
  findings: readonly Finding[],
  metadata: Payload["metadata"],
): ReportCounts => {
  const metadataTotal = metadata.vulnerabilities.total;

  return {
    findings: findings.length,
    advisories: findings.reduce(
      (total, finding) => total + finding.advisories.length,
      0,
    ),
    metadataTotal,
    disagrees: metadataTotal !== findings.length,
  };
};

/**
 * The severity distribution the explorer actually holds, so a level's number is
 * the number of rows its click leaves. npm's metadata can disagree with the
 * findings it accompanies, and a clickable count must describe the click.
 */
export const countBySeverity = (
  findings: readonly Finding[],
): Record<Severity, number> => {
  const counts = Object.fromEntries(
    SEVERITY_ORDER.map((severity) => [severity, 0]),
  ) as Record<Severity, number>;

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
};
