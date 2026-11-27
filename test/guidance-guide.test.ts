import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHANGE_COST_NOTE,
  EMPTY_STATE_HINT,
  TRIAGE_DEFAULT,
  TRIAGE_NO_ACTION,
} from "../packages/surface/src/components/guidance";

// A repository-level test, because the check crosses an artifact boundary: the
// surface package may not read files, and the guide is a file.
const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const guide = readFileSync(
  path.join(repoRoot, "docs/how-to-read-a-report.md"),
  "utf8",
).replace(/\s+/g, " ");

describe("the reader's guide", () => {
  it("states the same default order as the page", () => {
    expect(guide).toContain("critical and high");
    expect(guide).toMatch(/the order is a default/i);
    expect(guide).toMatch(/where a package sits/i);
    expect(guide).toMatch(/what changing it would cost/i);
  });

  it("defines a change cost the way the page does", () => {
    expect(guide).toMatch(/major\s+change/i);
    expect(guide).toMatch(/names no target/i);
  });

  it("does not state advice the page contradicts", () => {
    expect(guide).not.toMatch(/action required/i);
    expect(guide).not.toMatch(/safe to ignore/i);
  });

  it("quotes the policy rather than the page's markup", () => {
    // The guide may say the same thing; it may not paste the page's strings,
    // because a pasted string is a second copy that can drift.
    for (const sentence of [
      TRIAGE_DEFAULT,
      TRIAGE_NO_ACTION,
      CHANGE_COST_NOTE,
      EMPTY_STATE_HINT,
    ]) {
      expect(guide).not.toContain(sentence);
    }
  });
});
