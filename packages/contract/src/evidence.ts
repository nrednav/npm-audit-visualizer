import { z } from "zod";

/**
 * Where a stated fact comes from. `unknown` is deliberately absent: it is a
 * knowledge state, not a place the knowledge came from, and the two must not be
 * confused when a reader asks what the tool actually knows.
 */
export const EVIDENCE_ORIGINS = [
  "reported",
  "observed",
  "derived",
  "asserted",
] as const;

export const EvidenceOriginSchema = z.enum(EVIDENCE_ORIGINS);

export type EvidenceOrigin = z.infer<typeof EvidenceOriginSchema>;

export const isEvidenceOrigin = (value: unknown): value is EvidenceOrigin =>
  typeof value === "string" &&
  (EVIDENCE_ORIGINS as readonly string[]).includes(value);

const MAX_REASON_LENGTH = 200;

/**
 * A value the evidence does not supply. The reason is required because "npm
 * never states this" and "we did not look" lead a reader to different next
 * steps, and a bare absence cannot tell them apart.
 */
export const UnknownSchema = z.object({
  unknown: z.string().min(1).max(MAX_REASON_LENGTH),
});

export type Unknown = z.infer<typeof UnknownSchema>;

export const isUnknown = (candidate: unknown): candidate is Unknown =>
  typeof candidate === "object" &&
  candidate !== null &&
  "unknown" in candidate &&
  typeof (candidate as { unknown: unknown }).unknown === "string";

/**
 * A value that may be unknown. The value is tried first, so a stated value is
 * never mistaken for an object that happens to be unknown.
 */
export const unknownable = <T extends z.ZodType>(value: T) =>
  z.union([value, UnknownSchema]);

/**
 * How a computed value was computed. The origin is a literal from the roster
 * rather than the whole roster, so a derived graph cannot claim that npm reported
 * it; a test holds the literal to `EVIDENCE_ORIGINS` so the two cannot drift.
 *
 * The note is required: a marker without a sentence tells a reader that something
 * is derived without telling them what it is derived from or what it omits.
 */
export const DerivationSchema = z.object({
  origin: z.literal("derived"),
  basis: z.string().min(1).max(64),
  note: z.string().min(1).max(MAX_REASON_LENGTH),
});

export type Derivation = z.infer<typeof DerivationSchema>;

/**
 * A fact paired with its origin, for the companion artifacts, derived claims,
 * and human assertions that state one. npm's own report fields do not use this:
 * they inherit the report's `reported` origin instead of carrying a wrapper.
 */
export const EvidenceRecordSchema = z.object({
  origin: EvidenceOriginSchema,
  value: z.unknown(),
  note: z.string().min(1).max(MAX_REASON_LENGTH).optional(),
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;
