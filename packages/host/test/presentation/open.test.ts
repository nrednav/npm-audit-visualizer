import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openInBrowser } from "../../src/presentation/open.js";

let emptyPath: string;
let originalPath: string | undefined;

beforeEach(async () => {
  originalPath = process.env.PATH;
  emptyPath = await mkdtemp(path.join(tmpdir(), "nav-nowhere-"));
  // An empty PATH guarantees the launcher cannot be found, which is the
  // condition a container or a remote shell produces on its own.
  process.env.PATH = emptyPath;
});

afterEach(async () => {
  process.env.PATH = originalPath;
  await rm(emptyPath, { recursive: true, force: true });
});

const settle = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 250);
  });

describe("openInBrowser", () => {
  it("reports a launcher that cannot be started", async () => {
    const reported: string[] = [];

    openInBrowser(
      "http://localhost:1248",
      (line) => reported.push(line),
      "linux",
    );
    await settle();

    expect(reported).toHaveLength(1);
    expect(reported[0]).toContain("http://localhost:1248");
  });

  it("does not throw when no browser is available", async () => {
    expect(() => {
      openInBrowser("http://localhost:1248", () => undefined, "linux");
    }).not.toThrow();

    await settle();
  });

  it("starts nothing it cannot name", async () => {
    const reported: string[] = [];

    openInBrowser(
      "http://localhost:1248",
      (line) => reported.push(line),
      "darwin",
    );
    await settle();

    expect(reported.join("\n")).toMatch(/could not open a browser/i);
  });
});
