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

The `/report.json` route returns a payload with three top-level fields.

| Field      | Type   | Description                                                      |
| ---------- | ------ | ---------------------------------------------------------------- |
| `metadata` | object | Vulnerability and dependency counts.                             |
| `findings` | array  | One entry per reported vulnerability, ordered most urgent first. |
| `graph`    | object | Nodes and edges for the dependency view.                         |

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

| Field         | Type                              |
| ------------- | --------------------------------- |
| `graph.nodes` | array of `{ id, name, severity }` |
| `graph.edges` | array of `{ from, to }`           |

A node reached only through a dependency chain carries `severity: null`. An edge
`{ from, to }` means `from` is introduced by `to`. An advisory never produces a
self-edge.

## Environment

The command requires Node `26.13.1`. It installs with no dependency tree:
everything it needs is bundled into one file. The published tarball carries a
`LICENSE` file and is verified by the registry's SHA-512 integrity hash.

See the [how-to guide](how-to-read-a-report.md) to run it, and the
[README](../README.md) for the workspace layout.
