import { describe, expect, it } from "vitest";
import { matchesPositionChoice, POSITION_OPTIONS } from "./position-filter";

describe("the position axis", () => {
  it("isolates the placement each choice names", () => {
    expect(matchesPositionChoice(true, "direct")).toBe(true);
    expect(matchesPositionChoice(false, "direct")).toBe(false);
    expect(matchesPositionChoice(false, "transitive")).toBe(true);
    expect(matchesPositionChoice(true, "transitive")).toBe(false);
  });

  it("accepts both placements when no choice is active", () => {
    expect(matchesPositionChoice(true, null)).toBe(true);
    expect(matchesPositionChoice(false, null)).toBe(true);
  });

  it("offers two labelled choices that state no verdict", () => {
    expect(POSITION_OPTIONS.map((option) => option.label)).toEqual([
      "Direct",
      "Transitive",
    ]);
  });
});
