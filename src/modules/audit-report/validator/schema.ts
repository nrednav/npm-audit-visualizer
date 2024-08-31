import { z } from "zod";

const SeveritySchema = z.enum(["info", "low", "moderate", "high", "critical"]);

const DependencySchema = z.union([
  z.string(),
  z.object({
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
  }),
]);

export const VulnerabilitySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  severity: SeveritySchema,
  isDirect: z.boolean(),
  via: z.array(DependencySchema),
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

export type Vulnerability = z.infer<typeof VulnerabilitySchema>;

export const MetadataSchema = z.object({
  vulnerabilities: z.object({
    info: z.number(),
    low: z.number(),
    moderate: z.number(),
    high: z.number(),
    critical: z.number(),
    total: z.number(),
  }),
  dependencies: z.object({
    prod: z.number(),
    dev: z.number(),
    optional: z.number(),
    peer: z.number(),
    peerOptional: z.number(),
    total: z.number(),
  }),
});

export const AuditReportSchema = z.object({
  auditReportVersion: z.literal(2),
  vulnerabilities: z.record(VulnerabilitySchema),
  metadata: MetadataSchema,
});

export type AuditReport = z.infer<typeof AuditReportSchema>;
