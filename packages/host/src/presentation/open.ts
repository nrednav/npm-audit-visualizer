import { spawn } from "node:child_process";

type Platform = typeof process.platform;

const launchCommand = (
  platform: Platform,
): { command: string; args: string[] } => {
  switch (platform) {
    case "darwin":
      return { command: "open", args: [] };
    case "win32":
      return { command: "cmd", args: ["/c", "start", ""] };
    default:
      return { command: "xdg-open", args: [] };
  }
};

/**
 * Opening a browser is a convenience. A container, a remote shell, or a machine
 * without a desktop has no browser to open, and that is not a reason to stop:
 * the caller has already printed the address.
 */
export const openInBrowser = (
  url: string,
  report: (line: string) => void,
  platform: Platform = process.platform,
): void => {
  const { command, args } = launchCommand(platform);

  try {
    const child = spawn(command, [...args, url], {
      stdio: "ignore",
      detached: true,
    });

    child.on("error", () => {
      report(`Could not open a browser. Open ${url} to read the report.`);
    });
    child.unref();
  } catch {
    report(`Could not open a browser. Open ${url} to read the report.`);
  }
};
