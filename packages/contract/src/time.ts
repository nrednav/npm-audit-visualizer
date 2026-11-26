import { z } from "zod";
import { unknownable } from "./evidence.js";

/**
 * An instant with an offset. No bare local time: a time without an offset cannot
 * be compared to another, and the four times this payload names are meant to be
 * compared by a reader who is deciding what is fresh.
 */
export const TimestampSchema = z.iso.datetime({ offset: true });

export type Timestamp = z.infer<typeof TimestampSchema>;

/**
 * The four times, three of them here. The companion artifact's creation time is
 * `sources[].createdAt` and is not repeated: one fact, one home.
 *
 * `auditTime` is when npm produced the report and `observedAt` is when this tool
 * observed the project. Both can be unknown, and each unknown says why, because
 * "npm never says" and "nothing was observed" lead a reader to different next
 * steps. `builtAt` is never unknown: this process built this payload and knows
 * when, and it is the only one of the three the tool can state without evidence.
 */
export const TimestampsSchema = z.object({
  auditTime: unknownable(TimestampSchema),
  observedAt: unknownable(TimestampSchema),
  builtAt: TimestampSchema,
});

export type Timestamps = z.infer<typeof TimestampsSchema>;
