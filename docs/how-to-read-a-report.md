# How to Read an npm Audit Report

This guide shows you how to turn an `npm audit` report into a page you can read,
filter, and act on. You should already be comfortable running commands in a
terminal and have a Node project that uses npm.

For the full list of options and the payload shape, see the
[CLI and payload reference](cli-reference.md).

## Generate the report

To produce the report file, run npm's audit command in your project and save the
JSON output:

```shell
cd your-project
npm audit --json > audit.json
```

If your project has no vulnerabilities, the report is still valid. The tool
renders an empty state rather than an error.

## Read it in a page

To open the report in a local page, pass the file to the command:

```shell
npx npm-audit-visualizer --file audit.json
```

The command prints the address it is serving and opens it in your browser.
Confirm the page loaded by looking for the audit briefing and the finding count
at the top.

If you installed the tool globally, drop the `npx`:

```shell
npm-audit-visualizer --file audit.json
```

## Serve without opening a browser

If you are on a remote machine or in a container, serve the page without
launching a browser:

```shell
npm-audit-visualizer --file audit.json --no-open
```

Read the printed address and open it yourself. The listener binds to the
loopback interface, so on a remote machine you will need to forward the port.

## Use a different port

If port `1248` is taken, either let the command pick a free port or name one.

To let the operating system choose, pass `0`:

```shell
npm-audit-visualizer --file audit.json --port 0 --no-open
```

To name a starting port, pass it directly. The command tries up to 10
consecutive ports from there:

```shell
npm-audit-visualizer --file audit.json --port 3000
```

Confirm the address in the printed output. It is the port actually bound, which
may differ from the one you asked for.

## Trace a finding to something you can fix

To act on a finding, open it in the explorer and read its dependency path and
fix field.

1. Select a severity in the ledger to narrow the list. Select it again, or use
   the reset control, to clear the filter.
2. Open a finding's row to see its advisories, vulnerable range, and dependency
   paths.
3. Follow the path to a direct dependency. A transitive finding offers a chain
   through its `effects` to a package you can act on.
4. Read the fix field. If `fix.available` is true, the named version resolves
   it; if `fix.major` is true, expect a breaking change.

## Stop the server

To stop the server and release the port, press `Ctrl-C`. The process exits
cleanly with code `0`.

## Diagnose a refusal

If the command refuses to start, read the message on stderr. It names the cause
and exits with code `1`.

| Message points to     | What to do                                                             |
| --------------------- | ---------------------------------------------------------------------- |
| no report given       | Add `--file <path>`.                                                   |
| missing file          | Check the path; the report was not found there.                        |
| unreadable            | The path is a directory, or you lack permission.                       |
| not JSON              | Re-run `npm audit --json`; the file is not valid JSON.                 |
| not a report          | The JSON does not match the audit shape; the failing fields are named. |
| unsupported version   | The report's `auditReportVersion` is not `2`.                          |
| missing surface build | The installed copy is incomplete; reinstall it.                        |

To see the stages a run goes through, add `--debug`:

```shell
npm-audit-visualizer --file audit.json --debug
```

You have read the report and traced its findings. For option defaults, exit
codes, and the payload schema, see the [CLI and payload reference](cli-reference.md).
