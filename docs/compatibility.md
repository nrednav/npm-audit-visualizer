# Compatibility Rules

What this tool accepts, what it refuses, and what a refusal tells you. Every
statement on this page is executed by `test/compatibility.test.ts`, so a change to
the behaviour fails the page rather than leaving it wrong.

## The version axes

Four numbers exist and they answer different questions. None can stand in for
another.

| Number                    | Lives in               | Answers                                          | Compared against                     |
| ------------------------- | ---------------------- | ------------------------------------------------ | ------------------------------------ |
| payload `schemaVersion`   | the payload, top level | which payload shape the page can read            | `PAYLOAD_SCHEMA_VERSION` in Contract |
| `sources[].schemaVersion` | a source descriptor    | which version the artifact declared about itself | nothing; recorded, not compared      |
| `auditReportVersion`      | the raw npm report     | which npm report shape the Host accepted         | `SUPPORTED_AUDIT_REPORT_VERSION`     |
| package version           | `package.json`         | which release of the command you installed       | nothing at runtime                   |

## Artifacts

| Artifact            | Required                                           | Version mismatch                                                                                                                            | Shape mismatch                                                                                                               |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| npm audit report    | Required. The payload has no valid form without it | Refused at read time with `unsupported-version`, naming the file, the version it holds, and the version this tool reads                     | Refused at read time with `not-json` or `not-a-report`, naming the source and the paths that could not be read               |
| Companion artifacts | None exists yet                                    | Policy, not behaviour: a companion whose declared schema version this tool does not support is refused by name, and is never read partially | Policy, not behaviour: a companion that does not match its schema is refused by name, and never fills a field with a default |

**Nothing is optional today except what does not exist.** A payload carries at least
one source descriptor, and its only kind is the audit report. The companion row is
written now because the first companion, when it arrives, must not be admitted
under a rule someone invents at that moment.

## What a refusal names

Every refusal names both sides of the comparison. A refusal that says only
"invalid" leaves the reader to guess which side is wrong.

| Refusal                              | Kind                  | Names                                      |
| ------------------------------------ | --------------------- | ------------------------------------------ |
| Payload version mismatch             | `version`             | `received` and `supported`                 |
| Payload shape mismatch               | `shape`               | the `paths` that could not be read         |
| Unsupported report version           | `unsupported-version` | `source`, `found`, and `supported`         |
| A report that is not JSON            | `not-json`            | `source` and the parse `reason`            |
| A report that is not an audit report | `not-a-report`        | `source` and the `paths` that were missing |

A payload that fails compatibility is never rendered as a report. The page has
three states and no fourth: loading, failed, and loaded. A version failure, a shape
failure, a failed request, and a payload that is not JSON all land on `failed`, each
with its own sentence, so none can be drawn as a report that happens to have no
findings.

## What an unknown means

An unknown is `{ "unknown": "<reason>" }`. It is a knowledge state, not a value.

- It is **not absent**: the field is present and says what is missing and why.
- It is **not false**: an unknown never reads as "no findings", "not vulnerable", or
  "no fix".
- It is **not current**: an unknown audit time does not become fresh because the
  page was opened now.
- It is **not safe**: an unknown package state is not a cleared package.

A `null` is not a way to say any of this. A `null` appears only where a value does
not apply, as in `fix` when no fix is reported. Where the evidence does not supply a
value, the payload states an unknown with a reason, and a consumer that fills the
gap with a default has replaced evidence with a guess.

An unknown is never dismissed silently either: the page shows the reason, and the
reason is the payload's, not the page's.

## What this page does not claim

Two limits are stated here on purpose, because a policy page that only lists rules
invites the reader to assume the rest.

1. **`sources[].schemaVersion` is recorded, not compared.** There is one artifact
   kind, and its version is already checked by the parser against
   `SUPPORTED_AUDIT_REPORT_VERSION`. Comparing this field as well would refuse
   nothing today and would imply a check that no artifact needs yet.
2. **No companion artifact exists.** Its row above is a policy for the first one,
   not a description of behaviour. When a companion arrives, its admission rule must
   be implemented before that row can be read as a promise.

## When this page changes

A claim on this page that the code stops honouring makes
`test/compatibility.test.ts` fail. A behaviour that changes without a claim here
leaves the page silent, which is the gap to close first: the page is the inventory
of what is admitted, and an admitted artifact with no row is the next item's work.
