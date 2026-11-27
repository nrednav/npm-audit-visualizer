# How to Read an npm Audit Report

This guide shows you how to turn an `npm audit` report into a page you can read,
filter, and act on. You should already be comfortable running commands in a
terminal and have a Node project that uses npm.

For the full list of options and the payload shape, see the
[CLI and payload reference](cli-reference.md). For the exact sense of terms such
as finding, advisory, and reported fix, see the [vocabulary](vocabulary.md).

## Audit the project

Open a terminal in the project you want to audit and run the command with no
arguments:

```shell
cd your-project
npx npm-audit-visualizer
```

The command runs `npm audit --json` in that directory, reads the result, and
opens a local page with the findings. It creates no report file. The audit uses
your npm configuration and registry, so it needs network access.

If the project has no vulnerabilities, the page shows an empty state rather than
an error. The command prints the address it is serving before it asks the
browser to open it.

If you installed the tool globally, drop the `npx`.

### Use a report you already have

If you generated a report earlier, or the project cannot run `npm audit`, pass
the file. The command reads it and does not run an audit:

```shell
npm audit --json > audit.json
npm-audit-visualizer --file audit.json
```

## Serve without opening a browser

If you are on a remote machine or in a container, serve the page without
launching a browser:

```shell
npm-audit-visualizer --no-open
```

Read the printed address and open it yourself. The listener binds to the
loopback interface, so on a remote machine you will need to forward the port.

## Use a different port

If port `1248` is taken, either let the command pick a free port or name one.

To let the operating system choose, pass `0`:

```shell
npm-audit-visualizer --port 0 --no-open
```

To name a starting port, pass it directly. The command tries up to 10
consecutive ports from there:

```shell
npm-audit-visualizer --port 3000
```

Confirm the address in the printed output. It is the port actually bound, which
may differ from the one you asked for.

## Read a finding's evidence

To act on a finding, open it in the explorer and read its reported install
locations and remediation state.

1. Select a severity in the ledger to narrow the list. Select it again, or use
   the reset control, to clear the filter.
2. Open a finding's row to see its advisories, vulnerable range, and the install
   locations npm reported.
3. Read the install locations. A nested location such as
   `node_modules/a/node_modules/b` shows which copy npm found. Read `effects` to
   see which packages npm said the finding affects.
4. Read the remediation state. `change-reported` names the package and version
   npm said to change to; `major-change-reported` adds that npm flags the change
   as semver-major; `change-target-incomplete` says npm reported a change and
   named no target; `no-reported-change` says npm reported none.

The collapsed row states seven facts for every finding, at every width: the
package name, the advisory count, the severity, whether the package is a direct
or a transitive dependency, the target npm named, whether npm flagged the change
as semver-major, and the number of install locations. The full lists stay behind
step 2, so the summary never becomes the evidence. The location count counts
distinct locations, so one npm repeated is counted once.

## Stop the server

To stop the server and release the port, press `Ctrl-C`. The process exits
cleanly with code `0`.

## Diagnose a refusal

If the command refuses to start, read the message on stderr. It names the cause
and exits with code `1`.

| Message points to     | What to do                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| npm did not start     | Check that npm is installed and on `PATH` for this shell.                 |
| npm exited nonzero    | Read the printed npm error. A lockfile or dependency tree may be missing. |
| output too large      | Pass a saved report with `--file <path>` instead.                         |
| missing file          | Check the path; the report was not found there.                           |
| unreadable            | The path is a directory, or you lack permission.                          |
| not JSON              | Re-run `npm audit --json`; the report is not valid JSON.                  |
| not a report          | The JSON does not match the audit shape; the failing fields are named.    |
| unsupported version   | The report's `auditReportVersion` is not `2`.                             |
| missing surface build | The installed copy is incomplete; reinstall it.                           |

To see the stages a run goes through, add `--debug`:

```shell
npm-audit-visualizer --debug
```

You have read the report and traced its findings. For option defaults, exit
codes, and the payload schema, see the [CLI and payload reference](cli-reference.md).
