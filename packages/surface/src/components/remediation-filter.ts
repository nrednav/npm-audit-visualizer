import {
  type RemediationState,
  reportsChange,
} from "@npm-audit-visualizer/contract";

export type RemediationChoice = "reported" | "major" | "incomplete" | "none";

type ChoiceDefinition = {
  label: string;
  matches: (state: RemediationState) => boolean;
};

/**
 * Four ways to read the remediation axis. "Reported fix" is the union the row,
 * the briefing count, and the graph already use; the other three isolate one
 * state each. A reader picks one at a time, so the overlapping union cannot be
 * combined with its own refinement into an empty request.
 */
const CHOICES: Record<RemediationChoice, ChoiceDefinition> = {
  reported: { label: "Reported fix", matches: reportsChange },
  major: {
    label: "Major change",
    matches: (state) => state === "major-change-reported",
  },
  incomplete: {
    label: "No target named",
    matches: (state) => state === "change-target-incomplete",
  },
  none: {
    label: "No fix reported",
    matches: (state) => state === "no-reported-change",
  },
};

export const REMEDIATION_CHOICES = Object.keys(CHOICES) as RemediationChoice[];

export const REMEDIATION_OPTIONS: readonly {
  id: RemediationChoice;
  label: string;
}[] = REMEDIATION_CHOICES.map((id) => ({ id, label: CHOICES[id].label }));

export const choiceLabel = (choice: RemediationChoice): string => {
  return CHOICES[choice].label;
};

export const matchesRemediationChoice = (
  state: RemediationState,
  choice: RemediationChoice | null,
): boolean => {
  return choice === null || CHOICES[choice].matches(state);
};
