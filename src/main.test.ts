import { afterEach } from "node:test";
import { describe, expect, it, vi } from "vitest";
import { main } from "./main.js";

describe("main", () => {
  const appName = "npm-audit-visualizer";
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the name of the application & input file path", () => {
    process.argv = ["node", appName, "-f", "test.audit.json"];

    main();

    const firstLog = logSpy.mock.calls[0];
    expect(firstLog).toBeDefined();
    expect(firstLog?.[0]).toContain(appName);

    const secondLog = logSpy.mock.calls[1];
    expect(secondLog).toBeDefined();
    expect(secondLog?.[0]).toContain("test.audit.json");
  });
});
