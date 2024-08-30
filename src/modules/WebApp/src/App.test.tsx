import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./hooks/use-parsed-audit-report.ts", async () => {
  const auditReportFixture = await import(
    "./fixtures/parsed-audit-report.json"
  );

  return {
    useParsedAuditReport: () => ({
      parsedAuditReport: auditReportFixture,
      loading: false,
    }),
  };
});

vi.mock("./components/Visualizer/index.tsx", () => ({
  default: () => <div>visualizer</div>,
}));

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
