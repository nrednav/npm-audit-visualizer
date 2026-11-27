# Vocabulary

One word, one meaning. The interface, the guides, and later companion artifacts
use these words in these senses only.

## Evidence and knowledge

| Word     | Means                                                                                             | Does not mean                       |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Reported | A source artifact states the value. npm reports a severity, a range, and a fix status.            | The visualizer verified it.         |
| Observed | A tool recorded the result of running a command or reading an environment.                        | The report stated it.               |
| Derived  | The visualizer computed the value from supplied evidence. The graph edges are derived from `via`. | npm reported the relation directly. |
| Asserted | A person recorded a judgment in an artifact.                                                      | The tool confirmed the judgment.    |
| Unknown  | The supplied artifacts do not contain the value.                                                  | False, zero, absent, or safe.       |

## Report units

| Word                  | Means                                                                                                                                      | Does not mean                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Finding               | One entry in the report's `vulnerabilities` object, keyed by a reported package. A finding can contain several advisories.                 | An advisory.                                                  |
| Advisory              | One published vulnerability record attached to a finding, with its title, source, URL, CWE, CVSS, and vulnerable range.                    | A finding. One package can carry several advisories.          |
| Install location      | A path npm listed in `nodes`, such as `node_modules/a/node_modules/b`. It is where an affected copy sits.                                  | A dependency chain, a resolved tree, or runtime reachability. |
| Reported relationship | A package name npm listed in `via`, meaning a package that introduces the finding, or in `effects`, meaning a package the finding affects. | A verified edge in a resolved tree.                           |

## Change and risk

| Word                | Means                                                                                                                                           | Does not mean                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Reported fix        | npm states that a change is available, either as `fixAvailable: true` or as a named target with a version and a major-change flag.              | A compatible change, a sufficient change, or a change that resolves every advisory in the finding. |
| Named target        | The package and version npm named for a change. A `true` value names a change and no target; the payload calls that `change-target-incomplete`. | A resolved version, a compatible version, or an instruction to upgrade.                            |
| No npm-reported fix | npm states no change, or the report carries no `fixAvailable` value.                                                                            | No patch exists anywhere, and no workaround exists.                                                |
| Major change        | npm's `isSemVerMajor` flag on a reported fix target. An incomplete target cannot be major, because there is no target to qualify.               | A breaking change for this project, which only the project can decide.                             |
| Severity            | The level npm reported for a finding or advisory: critical, high, moderate, low, info.                                                          | Project risk.                                                                                      |
| Risk                | The chance and consequence of harm in the running system. The tool does not observe it.                                                         | A sortable field.                                                                                  |

## Lifecycle and accepted risk

| Word                    | Means                                                                              | Does not mean                                              |
| ----------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Exception               | A person's documented decision to accept a finding for a stated period and reason. | A resolution, a fix, or proof that the risk is acceptable. |
| No longer reported      | A later report does not contain the finding.                                       | Fixed, verified, or resolved.                              |
| Verification incomplete | Evidence for an outcome is missing, partial, or from one source only.              | A failure, or a pass.                                      |

## Scope and view

| Word          | Means                                                                                         | Does not mean                                        |
| ------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Report total  | The count npm put in `metadata`, or the full parsed finding list before display filters.      | The count after a filter.                            |
| Filtered view | The subset shown after a search or filter. Clearing filters restores the report total.        | A new report, or a change to what the audit covered. |
| Report scope  | What the audit covered: dependency scopes, severity threshold, and audit time, when supplied. | The dependency counts alone.                         |

## Usage rule

When a value is unknown, say unknown and give the reason when it helps. Do not
print zero, "none", "clean", or "safe" in its place.
