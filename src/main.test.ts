import { logger } from "src/shared/modules/logger.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";

vi.mock("src/modules/audit-report/visualizer/index.js", async () => {
  const TE = await import("fp-ts/lib/TaskEither.js");

  return {
    visualizeAuditReport: () => () => TE.right(true),
  };
});

describe("main", () => {
  const appName = "npm-audit-visualizer";
  const logSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs tool name & audit report file path", () => {
    process.argv = [
      "node",
      appName,
      "-f",
      "src/shared/fixtures/valid-audit-report.json",
    ];

    main();

    const firstLog = logSpy.mock.calls[0];
    expect(firstLog).toBeDefined();
    expect(firstLog?.[0]).toContain(appName);

    const secondLog = logSpy.mock.calls[1];
    expect(secondLog).toBeDefined();
    expect(secondLog?.[0]).toContain("valid-audit-report.json");
  });
});
