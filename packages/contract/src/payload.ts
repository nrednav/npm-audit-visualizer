import { z } from "zod";
import { AdvisorySchema, MetadataSchema } from "./report.js";
import { SeveritySchema } from "./severity.js";

/**
 * Where the host serves the payload and where the surface fetches it. Stated
 * once so the two sides cannot disagree about the address.
 */
export const REPORT_ROUTE = "/report.json";

export const FixSchema = z.object({
  available: z.boolean(),
  name: z.string().nullable(),
  version: z.string().nullable(),
  major: z.boolean(),
});

export type Fix = z.infer<typeof FixSchema>;

export const FindingSchema = z.object({
  /** The report's own key. Stable across runs because it is not derived. */
  id: z.string().min(1),
  name: z.string(),
  severity: SeveritySchema,
  direct: z.boolean(),
  range: z.string(),
  /** The dependency chains the advisory reaches, as npm reports them. */
  paths: z.array(z.string()),
  /** Package names that introduce this vulnerability. */
  via: z.array(z.string()),
  effects: z.array(z.string()),
  advisories: z.array(AdvisorySchema),
  fix: FixSchema,
});

export type Finding = z.infer<typeof FindingSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  /** Null when a package is reached by a chain but carries no finding itself. */
  severity: SeveritySchema.nullable(),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

/**
 * One relation exists in this graph: `from` is introduced by `to`. An edge kind
 * discriminator would carry a single value, so there is none.
 */
export const GraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const DependencyGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

export const PayloadSchema = z.object({
  metadata: MetadataSchema,
  findings: z.array(FindingSchema),
  graph: DependencyGraphSchema,
});

export type Payload = z.infer<typeof PayloadSchema>;
