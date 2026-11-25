import { readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuild, readBuilt, repoRoot } from "./ensure-build.js";

const SURFACE_ASSETS = path.join(repoRoot, "packages/surface/dist/assets");

/**
 * The stylesheet is compiled from a CSS-first entry that still reads the token
 * configuration. If the migration dropped the configuration, the build would
 * still emit a stylesheet, and only the utilities the interface actually uses
 * would go missing. That is the failure this file exists to catch.
 */
const compiledStylesheet = (): string => {
  ensureBuild();

  const candidates = readdirSync(SURFACE_ASSETS).filter((file) =>
    file.endsWith(".css"),
  );

  expect(candidates).toHaveLength(1);

  return readBuilt(path.join(SURFACE_ASSETS, candidates[0] ?? ""));
};

describe("the compiled stylesheet", () => {
  let css: string;

  beforeAll(() => {
    css = compiledStylesheet();
  });

  it("carries the project's own utilities", () => {
    for (const utility of [
      ".bg-surface",
      ".bg-subtle",
      ".text-ink-muted",
      ".border-line",
      ".rounded-card",
    ]) {
      expect(
        css,
        `${utility} is missing from the compiled stylesheet`,
      ).toContain(utility);
    }
  });

  it("keeps the theme tokens in one place per theme", () => {
    expect(css).toContain("--color-surface");
    expect(css).toContain(".dark");
  });

  it("still ships the base reset Tailwind supplies", () => {
    expect(css).toContain("box-sizing");
    expect(css.length).toBeGreaterThan(10_000);
  });
});

describe("the compiled entry document", () => {
  it("loads the emitted script and stylesheet by built name", () => {
    const html = readBuilt(
      path.join(repoRoot, "packages/surface/dist/index.html"),
    );

    expect(html).toMatch(/<script[^>]+src="\/assets\/[^"]+\.js"/);
    expect(html).toMatch(/<link[^>]+href="\/assets\/[^"]+\.css"/);
  });
});
