import { z } from "zod";
import { SeveritySchema } from "./severity.js";

export const AdvisorySchema = z.object({
  source: z.number().optional(),
  name: z.string(),
  dependency: z.string(),
  title: z.string(),
  url: z.string().url(),
  severity: SeveritySchema,
  cwe: z.array(z.string()),
  cvss: z.object({
    score: z.number(),
    vectorString: z.string().nullable(),
  }),
  range: z.string(),
});

export type Advisory = z.infer<typeof AdvisorySchema>;

/**
 * `via` is either the name of a package that introduces this vulnerability, or
 * an advisory record. Keeping that union here, at the boundary, is the only
 * place it exists: the parsed payload splits it into names and advisories.
 */
export const ViaSchema = z.union([z.string(), AdvisorySchema]);

export const ReportedVulnerabilitySchema = z.object({
  name: z.string(),
  severity: SeveritySchema,
  isDirect: z.boolean(),
  via: z.array(ViaSchema),
  effects: z.array(z.string()).optional(),
  range: z.string(),
  nodes: z.array(z.string()),
  fixAvailable: z
    .union([
      z.boolean(),
      z.object({
        name: z.string(),
        version: z.string(),
        isSemVerMajor: z.boolean(),
      }),
    ])
    .optional(),
});

export type ReportedVulnerability = z.infer<typeof ReportedVulnerabilitySchema>;

export const VulnerabilityCountsSchema = z.object({
  info: z.number(),
  low: z.number(),
  moderate: z.number(),
  high: z.number(),
  critical: z.number(),
  total: z.number(),
});

export const DependencyCountsSchema = z.object({
  prod: z.number(),
  dev: z.number(),
  optional: z.number(),
  peer: z.number(),
  peerOptional: z.number(),
  total: z.number(),
});

export const MetadataSchema = z.object({
  vulnerabilities: VulnerabilityCountsSchema,
  dependencies: DependencyCountsSchema,
});

export type Metadata = z.infer<typeof MetadataSchema>;

export const SUPPORTED_AUDIT_REPORT_VERSION = 2;

export const AuditReportSchema = z.object({
  auditReportVersion: z.literal(SUPPORTED_AUDIT_REPORT_VERSION),
  vulnerabilities: z.record(ReportedVulnerabilitySchema),
  metadata: MetadataSchema,
});

export type AuditReport = z.infer<typeof AuditReportSchema>;
