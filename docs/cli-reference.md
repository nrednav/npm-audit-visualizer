# CLI and Payload Reference

`npm-audit-visualizer` obtains an `npm audit --json` report from the current
project, or from a file you name, and serves it as a local page. This reference
describes the command's options, its exit codes, the route it serves, and the
shape of the payload that route returns. It is part of the published command,
not of the two internal workspace packages.

See the [how-to guide](how-to-read-a-report.md) for using the command in practice.

## Command

```
npm-audit-visualizer [--file <report.json>] [options]
```

With no arguments, the command runs `npm audit --json` in the directory it was
invoked from. With `--file`, it reads that report and runs no audit. Either way
it validates one report, starts a local HTTP server on the loopback interface,
and opens the page in a browser unless told not to.

An automatic run uses the caller's npm executable, npm configuration, registry,
and network. It writes no report file.

## Options

| Option                  | Type                | Default | Required | Description                                                         |
| ----------------------- | ------------------- | ------- | -------- | ------------------------------------------------------------------- |
| `-f`, `--file <path>`   | path                | none    | no       | Read this report instead of auditing the current directory.         |
| `-p`, `--port <number>` | integer `0`–`65535` | `1248`  | no       | First port to try. `0` asks the operating system for any free port. |
| `--no-open`             | flag                | open    | no       | Serve the page without launching a browser.                         |
| `-d`, `--debug`         | flag                | off     | no       | Print the stages the run goes through to stderr.                    |
| `-h`, `--help`          | flag                | —       | no       | Print usage and exit.                                               |

Port retry: the command tries up to 10 consecutive ports starting at the
requested one. Each attempt uses a fresh server, and the address printed is the
port actually bound, read from the socket. With `--port 0`, the operating system
chooses the port and the command reports it.

The listener binds to the loopback interface only. It does not accept
connections from other machines.

## Exit codes

| Code  | Condition                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`   | `--help` printed, or the server stopped cleanly on an interrupt.                                                                                                                            |
| `1`   | Refusal: an unknown option, a stray argument, a port outside `0`–`65535`, an audit that could not produce a valid report, an unreadable or invalid report file, or a missing surface build. |
| `130` | An interrupt arrived before serving began, including during the audit.                                                                                                                      |

## Report requirements

The report, from a file or from an automatic audit, must be the output of
`npm audit --json` with `auditReportVersion: 2`. A report with zero
vulnerabilities is accepted and renders an empty state.

`npm audit --json` exits with a nonzero status when it finds vulnerabilities. A
valid report is accepted whatever that status is. A nonzero status matters only
when the output is not a valid report; the command then prints the status and
npm's error output.

Read failures are distinguished. Each names the source and the cause.

| Kind                  | Cause                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| `missing`             | No file exists at the path.                                                        |
| `unreadable`          | The path is a directory, or permission was denied.                                 |
| `not-json`            | The bytes are not valid JSON.                                                      |
| `not-a-report`        | The JSON does not match the audit report shape; the failing field paths are named. |
| `unsupported-version` | `auditReportVersion` is not `2`; the found and supported versions are named.       |

Automatic-audit failures are also distinguished.

| Kind          | Cause                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| `unavailable` | npm could not be started; the spawn error is named.                        |
| `aborted`     | The caller interrupted before a report was complete; the child is stopped. |
| `too-large`   | Combined output passed 16 MiB; the child is stopped before parsing.        |
| `failed`      | npm exited nonzero and its output was not a valid report.                  |
| `report`      | npm exited zero and its output was not a valid report.                     |

## HTTP routes

| Route              | Response                                | Cache                                    |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| `/`                | The entry document, `text/html`.        | Revalidated so a new build is picked up. |
| `/report.json`     | The parsed payload, `application/json`. | `no-store`.                              |
| `/assets/<hashed>` | A content-hashed asset.                 | Cached indefinitely.                     |
| any other path     | `404`.                                  | —                                        |

An unknown path returns `404`. It never falls through to the entry document. A
path that escapes the asset root returns `404` rather than `403`, so the
response does not describe the served tree.

## Payload

The `/report.json` route returns a payload with five top-level fields.

| Field           | Type   | Description                                                      |
| --------------- | ------ | ---------------------------------------------------------------- |
| `schemaVersion` | number | The payload contract this document describes. Currently `5`.     |
| `sources`       | array  | The artifacts this payload was built from. At least one.         |
| `metadata`      | object | Vulnerability and dependency counts.                             |
| `findings`      | array  | One entry per reported vulnerability, ordered most urgent first. |
| `graph`         | object | Nodes and edges for the dependency view.                         |

### `schemaVersion`

`schemaVersion` identifies the payload contract between the host and the page.
It is not the npm report's `auditReportVersion` and not the package version.

Version `2` added `sources`, which is required. Version `3` made two descriptor
fields a union of a value and an unknown, so a `null` is no longer how an absence
is stated. Each change moved the version, and a payload from an earlier version is
refused by name rather than read as if it carried the new shape. The versions a
payload mentions are compared below.

The page requires an exact match on `schemaVersion`. A different value, a
missing value, or a value of another type is a compatibility failure. The page
names the version it received and the version it supports, and shows no
findings. It never falls back to treating an incompatible payload as a report
with no findings.

An incompatible payload is not repaired in the browser. The fix is to run a
host and a page built from the same contract, which means reinstalling the
package or rebuilding the workspace.

### `sources`

Each entry describes one artifact the payload was built from. The array holds at
least one entry. Today the only artifact is the audit report itself, so the
array holds exactly one.

| Field           | Type              | Description                                                   |
| --------------- | ----------------- | ------------------------------------------------------------- |
| `kind`          | string            | The artifact kind. Currently `audit-report`.                  |
| `producer`      | object            | `{ name, version }`. `version` is a string or an unknown.     |
| `schemaVersion` | string or null    | The artifact's own schema version, as the artifact states it. |
| `createdAt`     | string or unknown | ISO 8601 creation time, or an unknown carrying the reason.    |
| `label`         | string            | A name for the artifact that is not a path.                   |

**The label is never a path.** It must be between 1 and 120 characters and
contain no `/` or `\` character, no drive prefix such as `C:`, and must not be
`.` or `..`. When a report is read from a file, the label is that file's own
name, with no directory. When the tool runs the audit itself, the label is the
phrase `npm audit in the current project`. If a filename cannot be a safe label,
the label falls back to `audit report from a file` rather than exposing it.

### `sources[].digest`

The digest names the exact bytes of the artifact, so a later file can bind to a
report without naming a path, a time, or a version that two runs could share.

```json
"digest": "sha256:9f2c…"
```

**The encoding is exact.** The prefix is `sha256:`, the body is 64 lowercase
hexadecimal characters, and nothing else is accepted. Uppercase is refused because
two spellings of one digest would compare unequal as strings, which is the one
thing an identity may never do.

**The bytes are hashed, not the meaning.** A report and a copy of that report have
one identity. A report and a reformatted report with the same findings have two,
because a trailing newline or a change in spacing changes the bytes. This is
deliberate: no canonical form is defined, so two artifacts that differ on disk are
two subjects. If a canonical identity is ever wanted, it is a separate, chosen
digest, not a silent change to this one.

The file path hashes the bytes read from the file. The automatic audit hashes the
bytes npm wrote to standard output. Neither hashes a parsed object, and the page
never computes a digest; it shows the one the payload carries.

**An unstated value stays unfilled, and says why.** `npm audit --json` states
neither a creation time nor its own version, so both are unknown and the page
shows `not supplied` followed by the reason:

```json
"createdAt": { "unknown": "npm audit --json states no creation time" }
```

A file's modification time is not a creation time and is never used in its place.

### Evidence origins and unknowns

Every stated fact has one origin:

| Origin     | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| `reported` | A source artifact states the value. npm reports a severity. |
| `observed` | A tool observes a command or environment result.            |
| `derived`  | The visualizer computes the value from supplied evidence.   |
| `asserted` | A person records a judgment.                                |

`unknown` is **not** an origin. It is a knowledge state: the tool does not know
the value. An origin says where a value came from, so a value that does not exist
has no origin to state. The payload refuses `unknown` as an origin.

An unknown is an object with a required reason, between 1 and 200 characters:

```json
{ "unknown": "npm audit --json states no creation time" }
```

The reason is required because "the artifact never states this" and "we did not
look" lead a reader to different next steps.

A `null` does not mean unknown. In this payload a `null` appears only where a
value does not apply: `fix.name` and `fix.version` are `null` when no fix is
reported, and a graph node carries `severity: null` when no finding sits on it.
Where a value is missing because the evidence does not supply it, the payload
states an unknown with a reason instead.

npm's own report fields do not carry an origin object. They inherit the report's
`reported` origin, so `findings[].severity` is a plain string. An explicit
evidence record, `{ origin, value, note? }`, is used only for companion artifacts,
derived claims, and human assertions.

These four numbers answer different questions and are not interchangeable:

| Number                    | Where it lives            | Answers                                      |
| ------------------------- | ------------------------- | -------------------------------------------- |
| `schemaVersion`           | payload, top level        | Which payload shape the page can read.       |
| `sources[].schemaVersion` | inside a descriptor       | Which version the artifact itself declared.  |
| `auditReportVersion`      | inside the raw npm report | Which npm report shape the host accepted.    |
| package version           | `package.json`            | Which release of this command was installed. |

### Severity

Severity is an ordered enum: `critical`, `high`, `moderate`, `low`, `info`.
Findings are sorted by this rank, most urgent first. Each level also has a
silhouette used by the page: octagon, triangle, diamond, square, circle, in that
order.

### `metadata`

| Field                      | Type                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `metadata.vulnerabilities` | counts per severity plus `total`                                      |
| `metadata.dependencies`    | counts for `prod`, `dev`, `optional`, `peer`, `peerOptional`, `total` |

### `findings[]`

| Field        | Type     | Description                                                  |
| ------------ | -------- | ------------------------------------------------------------ |
| `id`         | string   | The report's key for this vulnerability. Stable across runs. |
| `name`       | string   | The vulnerable package's name.                               |
| `severity`   | enum     | One of the five levels.                                      |
| `direct`     | boolean  | Whether the package is a direct dependency.                  |
| `range`      | string   | The vulnerable version range.                                |
| `paths`      | string[] | Dependency paths the finding was reported against.           |
| `via`        | string[] | Names of packages that introduce this vulnerability.         |
| `effects`    | string[] | Names of packages this vulnerability affects.                |
| `advisories` | array    | Advisory records for this finding.                           |
| `fix`        | object   | Fix availability.                                            |

`fix` fields: `available` (boolean), `name` (string or null), `version` (string
or null), `major` (boolean, whether the fix is a semver-major change).

`advisories[]` fields: `source` (number, optional), `name`, `dependency`,
`title`, `url`, `severity`, `cwe` (string[]), `cvss` (`score` and
`vectorString`), `range`.

### `graph`

| Field              | Type                                       |
| ------------------ | ------------------------------------------ |
| `graph.nodes`      | array of `{ id, name, severity }`          |
| `graph.edges`      | array of `{ from, to }`                    |
| `graph.derivation` | `{ origin, basis, note }`, always required |

A node reached only through a dependency chain carries `severity: null`. An edge
`{ from, to }` means `from` is introduced by `to`. An advisory never produces a
self-edge.

### `graph.derivation`

The graph is computed by this tool, not reported by npm, and the payload says so:

```json
"derivation": {
  "origin": "derived",
  "basis": "audit-via",
  "note": "Derived from the via relationships npm reported. This is not a complete dependency tree: a package npm did not report is absent."
}
```

| Field    | Meaning                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `origin` | Always `derived`, one of the [four origins](#evidence-origins-and-unknowns). A graph cannot claim npm reported its edges. |
| `basis`  | What the graph was computed from. Currently `audit-via`.                                                                  |
| `note`   | A sentence the page shows beside the graph, stating what it omits.                                                        |

**The graph is not a complete dependency tree.** It contains the packages npm
reported as involved in a vulnerability and the introductions it named. A package
that npm did not report is absent, so an absent package is not evidence that it
is not installed. The page shows the note wherever it draws the graph, because a
graph without that sentence invites exactly that misreading.

## Environment

The command requires Node `26.13.1`. It installs with no dependency tree:
everything it needs is bundled into one file. The published tarball carries a
`LICENSE` file and is verified by the registry's SHA-512 integrity hash.

See the [how-to guide](how-to-read-a-report.md) to run it, and the
[README](../README.md) for the workspace layout.
