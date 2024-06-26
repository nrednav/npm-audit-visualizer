import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";
import { logger } from "./shared/modules/logger.js";

vi.mock("./modules/AuditReport/Visualizer/index.js", async () => {
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

  it("logs the name of the tool & the audit report file path", () => {
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
