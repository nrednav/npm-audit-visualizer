import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import type { Payload } from "@npm-audit-visualizer/contract";
import { createRequestHandler } from "./routes.js";

export const LOOPBACK = "127.0.0.1";

const RETRY_DELAY_MS = 100;

export type ServeFailure =
  | { kind: "assets-missing"; path: string }
  | { kind: "port-in-use"; attempted: number[] }
  | { kind: "listen-failed"; port: number; reason: string }
  | { kind: "aborted" };

export type Serving = {
  port: number;
  close: () => Promise<void>;
  whenClosed: Promise<void>;
};

export type ServeResult =
  | ({ ok: true } & Serving)
  | { ok: false; failure: ServeFailure };

export type ServeOptions = {
  assetsDir: string;
  payload: Payload;
  port: number;
  attempts: number;
  signal?: AbortSignal;
};

const wait = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
    server.closeAllConnections();
  });

type ListenOutcome = { ok: true } | { ok: false; code: string; reason: string };

const listen = async (server: Server, port: number): Promise<ListenOutcome> =>
  new Promise((resolve) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      server.off("listening", onListening);
      const code = error.code ?? "EUNKNOWN";
      resolve({ ok: false, code, reason: error.message });
    };

    const onListening = (): void => {
      server.off("error", onError);
      resolve({ ok: true });
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, LOOPBACK);
  });

/**
 * One server instance per attempt. A server that failed to listen is discarded
 * rather than told to listen again, and no port number survives an `await`, so
 * a slow retry cannot rebind a port an earlier attempt already gave up.
 */
export const startServing = async (
  options: ServeOptions,
): Promise<ServeResult> => {
  if (!existsSync(path.join(options.assetsDir, "index.html"))) {
    return {
      ok: false,
      failure: { kind: "assets-missing", path: options.assetsDir },
    };
  }

  const handler = createRequestHandler({
    assetsDir: options.assetsDir,
    payload: options.payload,
  });
  const attempted: number[] = [];

  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    if (options.signal?.aborted === true) {
      return { ok: false, failure: { kind: "aborted" } };
    }

    const port = options.port + attempt;
    attempted.push(port);

    const server = createServer((request, response) => {
      void handler(request, response);
    });
    const outcome = await listen(server, port);

    if (outcome.ok) {
      let settleClosed: () => void = () => undefined;
      const whenClosed = new Promise<void>((resolve) => {
        settleClosed = resolve;
      });

      server.once("close", () => {
        settleClosed();
      });

      const address = server.address();
      const bound =
        typeof address === "object" && address !== null ? address.port : port;

      const close = async (): Promise<void> => {
        await closeServer(server);
      };

      if (options.signal !== undefined) {
        if (options.signal.aborted) {
          void close();
        } else {
          options.signal.addEventListener(
            "abort",
            () => {
              void close();
            },
            { once: true },
          );
        }
      }

      return { ok: true, port: bound, whenClosed, close };
    }

    server.removeAllListeners();
    await closeServer(server);

    if (outcome.code !== "EADDRINUSE" && outcome.code !== "EACCES") {
      return {
        ok: false,
        failure: { kind: "listen-failed", port, reason: outcome.reason },
      };
    }

    if (outcome.code === "EACCES") {
      return {
        ok: false,
        failure: { kind: "listen-failed", port, reason: "permission denied" },
      };
    }

    if (attempt < options.attempts - 1) {
      await wait(RETRY_DELAY_MS);
    }
  }

  return { ok: false, failure: { kind: "port-in-use", attempted } };
};

export const describeServeFailure = (failure: ServeFailure): string => {
  switch (failure.kind) {
    case "assets-missing":
      return `The bundled interface is missing at ${failure.path}. Reinstall the package, or run "npm run build" in a checkout.`;
    case "port-in-use":
      return `No port was free in ${failure.attempted[0]}-${failure.attempted[failure.attempted.length - 1]}. Pass a different port with --port.`;
    case "listen-failed":
      return `Could not listen on port ${failure.port}: ${failure.reason}.`;
    case "aborted":
      return "Stopped before the server started.";
  }
};
