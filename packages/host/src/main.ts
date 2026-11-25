import { fileURLToPath } from "node:url";
import { run } from "./cli.js";
import { openInBrowser } from "./presentation/open.js";

const controller = new AbortController();

const writeLine =
  (stream: NodeJS.WriteStream) =>
  (line: string): void => {
    stream.write(`${line}\n`);
  };

const onSignal = (): void => {
  controller.abort();
};

process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);

const toStderr = writeLine(process.stderr);

/**
 * The only place a process exit code is assigned. Everything below returns a
 * number, so every failure is testable without spawning a process.
 */
process.exitCode = await run(process.argv.slice(2), {
  assetsDir: fileURLToPath(new URL("./surface", import.meta.url)),
  out: writeLine(process.stdout),
  err: toStderr,
  openSurface: (url) => {
    openInBrowser(url, toStderr);
  },
  signal: controller.signal,
});
