import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./modules/importParsedAuditReport.ts", async () => {
  const auditReportFixture = await import(
    "./fixtures/parsed-audit-report.json"
  );
  return {
    importParsedAuditReport: () => Promise.resolve(auditReportFixture),
  };
});

describe("App", () => {
  it("renders a heading with the tool's name", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "npm-audit-visualizer" }),
      ).toBeVisible();
    });
  });
});
