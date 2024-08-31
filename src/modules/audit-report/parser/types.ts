import type {
  Attributes,
  GraphOptions,
  SerializedEdge,
  SerializedNode,
} from "graphology-types";
import {
  MetadataSchema,
  Vulnerability,
  VulnerabilitySchema,
} from "src/modules/audit-report/validator/schema.js";
import { z } from "zod";

export const VulnerabilityGraphSchema = z.object({
  attributes: z.custom<Attributes>(),
  options: z.custom<GraphOptions>(),
  nodes: z.array(z.custom<SerializedNode<Attributes>>()),
  edges: z.array(z.custom<SerializedEdge<Attributes>>()),
});

export type VulnerabilityGraph = z.infer<typeof VulnerabilityGraphSchema>;

export type VulnerabilityTable = Vulnerability[];

export const ParsedAuditReportSchema = z.object({
  metadata: MetadataSchema,
  vulnerability: z.object({
    graph: VulnerabilityGraphSchema,
    table: z.array(VulnerabilitySchema),
  }),
});

export type ParsedAuditReport = z.infer<typeof ParsedAuditReportSchema>;
