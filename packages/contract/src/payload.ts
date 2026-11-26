import { z } from "zod";
import { DerivationSchema } from "./evidence.js";
import { AdvisorySchema, MetadataSchema } from "./report.js";
import { SeveritySchema } from "./severity.js";
import { SourceDescriptorSchema } from "./source.js";

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
  /** Required, so no graph can be served without saying how it was built. */
  derivation: DerivationSchema,
});

export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;

/**
 * The payload contract's own identity. It is not the npm report's
 * `auditReportVersion` and not the package version: both sides must agree on
 * this wire shape even when their releases differ.
 *
 * 2 added `sources`, a required field, so a version-1 payload is refused rather
 * than read as if it had no provenance. 3 made two descriptor fields unions of a
 * value and an unknown, so a version-2 payload is refused rather than read as if
 * `null` were the only way to say a value is missing. 4 added `graph.derivation`,
 * so a version-3 payload is refused rather than read as a graph of unknown origin.
 * 5 added `sources[].digest`, so a version-4 payload is refused rather than read
 * as an artifact with no identity.
 */
export const PAYLOAD_SCHEMA_VERSION = 5;

export const PayloadSchema = z.object({
  schemaVersion: z.literal(PAYLOAD_SCHEMA_VERSION),
  /**
   * The artifacts this payload was built from, in the order they were supplied.
   * At least one, because a payload with no stated origin is the ambiguity this
   * field exists to remove.
   */
  sources: z.array(SourceDescriptorSchema).min(1),
  metadata: MetadataSchema,
  findings: z.array(FindingSchema),
  graph: DependencyGraphSchema,
});

export type Payload = z.infer<typeof PayloadSchema>;

export type PayloadDecodeFailure =
  | {
      kind: "version";
      /** What the payload claimed, or undefined when the field was absent. */
      received: unknown;
      supported: typeof PAYLOAD_SCHEMA_VERSION;
    }
  | { kind: "shape"; paths: string[] };

export type PayloadDecodeResult =
  | { success: true; payload: Payload }
  | { success: false; error: PayloadDecodeFailure };

const MAX_REPORTED_PATHS = 3;

const statedVersion = (input: object): unknown =>
  "schemaVersion" in input ? input.schemaVersion : undefined;

/**
 * Compatibility is decided before report contents are accepted, so an
 * incompatible payload never reaches a reader as an empty report. The check is
 * exact: no coercion, and an absent version is a mismatch rather than a
 * legacy default.
 */
export const decodePayload = (input: unknown): PayloadDecodeResult => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: { kind: "shape", paths: ["(root)"] } };
  }

  const received = statedVersion(input);

  if (received !== PAYLOAD_SCHEMA_VERSION) {
    return {
      success: false,
      error: { kind: "version", received, supported: PAYLOAD_SCHEMA_VERSION },
    };
  }

  const parsed = PayloadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        kind: "shape",
        paths: parsed.error.issues
          .slice(0, MAX_REPORTED_PATHS)
          .map((issue) => issue.path.map(String).join(".") || "(root)"),
      },
    };
  }

  return { success: true, payload: parsed.data };
};
