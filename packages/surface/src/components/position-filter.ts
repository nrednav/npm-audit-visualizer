import type { Finding } from "@npm-audit-visualizer/contract";

export type PositionChoice = "direct" | "transitive";

/**
 * Where npm placed the package. `direct` means the audited project names it in
 * its own dependencies; `transitive` means npm found it below another package.
 * The distinction is npm's, not a claim about reachability.
 */
const CHOICES: Record<PositionChoice, { label: string; direct: boolean }> = {
  direct: { label: "Direct", direct: true },
  transitive: { label: "Transitive", direct: false },
};

export const POSITION_CHOICES = Object.keys(CHOICES) as PositionChoice[];

export const POSITION_OPTIONS: readonly {
  id: PositionChoice;
  label: string;
}[] = POSITION_CHOICES.map((id) => ({ id, label: CHOICES[id].label }));

export const matchesPositionChoice = (
  direct: Finding["direct"],
  choice: PositionChoice | null,
): boolean => {
  return choice === null || CHOICES[choice].direct === direct;
};
