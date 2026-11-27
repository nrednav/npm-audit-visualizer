/**
 * Every sentence that advises a reader to act. Each one states a default and the
 * evidence it rests on, and none of them ranks the project's risk: the page holds
 * severity and remediation as npm reported them, and nothing else.
 */

/** The default order, its basis, and the two adjustments the page supports. */
export const TRIAGE_DEFAULT =
  "Review critical and high findings first by default, then adjust for dependency position and change cost.";

/** The same policy when the default has nothing to order. */
export const TRIAGE_NO_ACTION =
  "This report lists no critical or high findings. Work through the moderate and low findings when it suits the maintenance window.";

/** What makes a change expensive, in the words the table and the chips use. */
export const CHANGE_COST_NOTE =
  "Change cost rises with a major change, and again when npm reports a fix without naming a target. Neither is a reason to skip a finding.";

/** Every constraint that can hide a row, so the instruction holds in any state. */
export const EMPTY_STATE_HINT =
  "Adjust the search, the severity level, the reported change, or the dependency position to see findings from this report.";
