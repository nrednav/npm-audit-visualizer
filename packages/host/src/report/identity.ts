import { createHash } from "node:crypto";

/**
 * The identity of an artifact is the SHA-256 of the bytes it arrived as. Bytes,
 * not the parsed report: two reports that mean the same thing but differ by a
 * space are two subjects, and a digest that hid that would let a later artifact
 * claim to belong to a report it never saw.
 */
export const digestOf = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
