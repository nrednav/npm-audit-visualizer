import { parseArgs } from "node:util";
import type {
  AuditReport,
  SourceDescriptor,
} from "@npm-audit-visualizer/contract";
import { type AuditResult, describeAuditFailure } from "./report/audit.js";
import { buildPayload } from "./report/model.js";
import { describeReadFailure, readReport } from "./report/read.js";
import { sourceOfAudit, sourceOfFile } from "./report/source.js";
import { describeServeFailure, startServing } from "./serve/server.js";

export const DEFAULT_PORT = 1248;
export const PORT_ATTEMPTS = 10;

const USAGE = `npm-audit-visualizer — audit the current project and read the report in a local page

Usage
  npm-audit-visualizer [--file <report.json>]

Runs "npm audit --json" in the current directory, then serves the findings.

Options
  -f, --file <path>   Read a report written by "npm audit --json" instead of
                      running an audit in the current directory.
  -p, --port <number> First port to try, 0 for any free port. Default ${DEFAULT_PORT}.
      --no-open       Serve the page without opening a browser.
  -d, --debug         Print the stages the run goes through.
  -h, --help          Print this message.

The page is served from this machine only. Nothing is sent anywhere.`;

export type CliIo = {
  /** The caller's project directory. The entry module reads it from the process. */
  cwd: string;
  /** Where the built interface is served from. The entry module locates it. */
  assetsDir: string;
  /** Obtains a report from the caller's project when no file is given. */
  auditProject: (cwd: string, signal: AbortSignal) => Promise<AuditResult>;
  out: (line: string) => void;
  err: (line: string) => void;
  openSurface: (url: string) => void;
  signal: AbortSignal;
};

type Options = {
  file: string | null;
  port: number;
  open: boolean;
  debug: boolean;
};

type Intent =
  | { kind: "help" }
  | { kind: "run"; options: Options }
  | { kind: "refuse"; message: string };

const refuse = (message: string): Intent => ({ kind: "refuse", message });

const parsePort = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const port = Number(raw);

  return port >= 0 && port <= 65535 ? port : null;
};

const parse = (argv: string[]): Intent => {
  let values: {
    file?: string;
    port?: string;
    open?: boolean;
    "no-open"?: boolean;
    debug?: boolean;
    help?: boolean;
  };
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        file: { type: "string", short: "f" },
        port: { type: "string", short: "p" },
        open: { type: "boolean" },
        "no-open": { type: "boolean" },
        debug: { type: "boolean", short: "d" },
        help: { type: "boolean", short: "h" },
      },
    });

    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error));
  }

  if (values.help === true) {
    return { kind: "help" };
  }

  if (positionals.length > 0) {
    return refuse(
      `Unexpected argument: ${positionals.join(" ")}. Pass a report with --file <path>, or run without arguments to audit the current directory.`,
    );
  }

  let port = DEFAULT_PORT;

  if (values.port !== undefined) {
    const parsed = parsePort(values.port);

    if (parsed === null) {
      return refuse(
        `Port must be a whole number from 0 to 65535. Received "${values.port}".`,
      );
    }

    port = parsed;
  }

  return {
    kind: "run",
    options: {
      file:
        values.file === undefined || values.file.trim() === ""
          ? null
          : values.file,
      port,
      open: values.open !== false && values["no-open"] !== true,
      debug: values.debug === true,
    },
  };
};

export const run = async (argv: string[], io: CliIo): Promise<number> => {
  const intent = parse(argv);

  if (intent.kind === "help") {
    io.out(USAGE);
    return 0;
  }

  if (intent.kind === "refuse") {
    io.err(intent.message);
    io.err("");
    io.err(USAGE);
    return 1;
  }

  const { options } = intent;
  let report: AuditReport;
  let sources: SourceDescriptor[];

  if (options.file === null) {
    if (options.debug) {
      io.out(`Auditing ${io.cwd}`);
    }

    const audited = await io.auditProject(io.cwd, io.signal);

    if (!audited.ok) {
      io.err(describeAuditFailure(audited.failure));

      return audited.failure.kind === "aborted" ? 130 : 1;
    }

    report = audited.report;
    sources = [sourceOfAudit()];
  } else {
    if (options.debug) {
      io.out(`Reading ${options.file}`);
    }

    const read = await readReport(options.file);

    if (!read.ok) {
      io.err(describeReadFailure(read.failure));
      return 1;
    }

    report = read.report;
    sources = [sourceOfFile(options.file)];
  }

  const payload = buildPayload(report, sources);

  if (options.debug) {
    io.out(
      `Read ${payload.findings.length} findings and ${payload.graph.edges.length} relationships.`,
    );
  }

  const serving = await startServing({
    assetsDir: io.assetsDir,
    payload,
    port: options.port,
    attempts: PORT_ATTEMPTS,
    signal: io.signal,
  });

  if (!serving.ok) {
    io.err(describeServeFailure(serving.failure));

    return serving.failure.kind === "aborted" ? 130 : 1;
  }

  const url = `http://localhost:${serving.port}`;

  io.out(`Reading the audit report at ${url}`);
  io.out("Press Ctrl-C to stop.");

  if (options.open) {
    io.openSurface(url);
  }

  await serving.whenClosed;

  return 0;
};
