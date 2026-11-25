import { parseArgs } from "node:util";
import { buildPayload } from "./report/model.js";
import { describeReadFailure, readReport } from "./report/read.js";
import { describeServeFailure, startServing } from "./serve/server.js";

export const DEFAULT_PORT = 1248;
export const PORT_ATTEMPTS = 10;

const USAGE = `npm-audit-visualizer — read an npm audit report in a local page

Usage
  npm-audit-visualizer --file <report.json>

Options
  -f, --file <path>   Report written by "npm audit --json". Required.
  -p, --port <number> First port to try, 0 for any free port. Default ${DEFAULT_PORT}.
      --no-open       Serve the page without opening a browser.
  -d, --debug         Print the stages the run goes through.
  -h, --help          Print this message.

The page is served from this machine only. Nothing is sent anywhere.`;

export type CliIo = {
  /** Where the built interface is served from. The entry module locates it. */
  assetsDir: string;
  out: (line: string) => void;
  err: (line: string) => void;
  openSurface: (url: string) => void;
  signal: AbortSignal;
};

type Options = {
  file: string;
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
      `Unexpected argument: ${positionals.join(" ")}. Pass the report with --file <path>.`,
    );
  }

  if (values.file === undefined || values.file.trim() === "") {
    return refuse(
      'No report given. Pass the path of a report written by "npm audit --json" with --file <path>.',
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
      file: values.file,
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

  if (options.debug) {
    io.out(`Reading ${options.file}`);
  }

  const read = await readReport(options.file);

  if (!read.ok) {
    io.err(describeReadFailure(read.failure));
    return 1;
  }

  const payload = buildPayload(read.report);

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
