import type { RemediationState } from "@npm-audit-visualizer/contract";
import { describe, expect, it } from "vitest";
import {
  matchesRemediationChoice,
  REMEDIATION_CHOICES,
  REMEDIATION_OPTIONS,
} from "./remediation-filter";

const states: RemediationState[] = [
  "change-reported",
  "major-change-reported",
  "change-target-incomplete",
  "no-reported-change",
];

describe("the remediation axis", () => {
  it("isolates the state each refinement names, and the union isolates three", () => {
    const expected: Record<string, RemediationState[]> = {
      reported: [
        "change-reported",
        "major-change-reported",
        "change-target-incomplete",
      ],
      major: ["major-change-reported"],
      incomplete: ["change-target-incomplete"],
      none: ["no-reported-change"],
    };

    for (const choice of REMEDIATION_CHOICES) {
      const accepted = states.filter((state) =>
        matchesRemediationChoice(state, choice),
      );

      expect(accepted, choice).toEqual(expected[choice]);
    }
  });

  it("accepts every state when no choice is active", () => {
    for (const state of states) {
      expect(matchesRemediationChoice(state, null), state).toBe(true);
    }
  });

  it("offers four labelled choices, none of which states an action", () => {
    expect(REMEDIATION_OPTIONS.map((option) => option.label)).toEqual([
      "Reported fix",
      "Major change",
      "No target named",
      "No fix reported",
    ]);

    for (const option of REMEDIATION_OPTIONS) {
      expect(option.label).not.toMatch(/upgrade|safe|compatible|should/i);
    }
  });
});
