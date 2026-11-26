import { z } from "zod";

/**
 * The only artifact a payload can be built from today. A second member is added
 * when a second artifact exists, so no member here names something nothing can
 * produce.
 */
export const SourceKindSchema = z.literal("audit-report");

export type SourceKind = z.infer<typeof SourceKindSchema>;

/**
 * What produced the artifact, as the artifact or its producer states it. A null
 * version means the artifact did not state one, which is different from knowing
 * a version.
 */
export const ProducerSchema = z.object({
  name: z.string().min(1).max(64),
  version: z.string().min(1).max(64).nullable(),
});

export type Producer = z.infer<typeof ProducerSchema>;

const MAX_LABEL_LENGTH = 120;

const DRIVE_PREFIX = /^[A-Za-z]:/;

/**
 * A label names an artifact without describing where it lives. A path leaks the
 * local filesystem layout, which the tool already promises not to do with report
 * contents, so the same rule holds for the report's own address.
 */
export const isSafeLabel = (candidate: string): boolean =>
  candidate.length > 0 &&
  candidate.length <= MAX_LABEL_LENGTH &&
  !candidate.includes("/") &&
  !candidate.includes("\\") &&
  !DRIVE_PREFIX.test(candidate);

export const SourceDescriptorSchema = z.object({
  kind: SourceKindSchema,
  producer: ProducerSchema,
  /** The artifact's own schema version, when it states one. */
  schemaVersion: z.string().min(1).nullable(),
  /** Creation time as the artifact states it. Null when it states none. */
  createdAt: z.iso.datetime({ offset: true }).nullable(),
  label: z.string().refine(isSafeLabel, {
    message:
      "a label names an artifact and must not be a path: no separators, no drive prefix, at most 120 characters",
  }),
});

export type SourceDescriptor = z.infer<typeof SourceDescriptorSchema>;
