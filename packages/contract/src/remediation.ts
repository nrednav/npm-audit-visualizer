import { z } from "zod";

/**
 * What npm reported about a possible change to one finding. npm states this in
 * three shapes: `true`, `false` or absent, and a named target. The first shape
 * names a change without naming what to change to, so it is its own state
 * rather than a `true` with two nulls beside it.
 *
 * The four states are the whole vocabulary. Two of them name a target and two
 * withhold it, so a target cannot exist without a state that names one, and no
 * state can be read as a recommendation to upgrade.
 */
export const REMEDIATION_STATES = [
  "change-reported",
  "major-change-reported",
  "change-target-incomplete",
  "no-reported-change",
] as const;

export const RemediationTargetSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export type RemediationTarget = z.infer<typeof RemediationTargetSchema>;

/**
 * A discriminated union rather than four loose fields, so that "a target whose
 * state withholds it" is not a payload this contract can read.
 */
export const RemediationSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("change-reported"),
    target: RemediationTargetSchema,
  }),
  z.object({
    state: z.literal("major-change-reported"),
    target: RemediationTargetSchema,
  }),
  z.object({ state: z.literal("change-target-incomplete"), target: z.null() }),
  z.object({ state: z.literal("no-reported-change"), target: z.null() }),
]);

export type Remediation = z.infer<typeof RemediationSchema>;

export type RemediationState = Remediation["state"];

/**
 * The one statement of "this finding has a reported change". The row label, the
 * filter, and the count all read it from here, so they cannot disagree about a
 * finding the way two severity orderings did before the contract owned one.
 */
export const reportsChange = (state: RemediationState): boolean => {
  return state !== "no-reported-change";
};
