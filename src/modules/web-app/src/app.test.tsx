import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./app";

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

vi.mock("./components/visualizer/index.tsx", () => ({
  default: () => <div>visualizer</div>,
}));

describe("App", () => {
  it("leads with the audit briefing and its finding count", async () => {
    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /3 findings need a decision/i,
        }),
      ).toBeVisible();
    });

    expect(screen.getByText("Audit briefing")).toBeVisible();
  });

  it("offers a skip link to the findings", () => {
    render(<App />);

    expect(
      screen.getByRole("link", { name: /skip to audit findings/i }),
    ).toBeVisible();
  });

  it("renders the severity ledger and report scope", () => {
    render(<App />);

    const ledger = screen.getByRole("region", {
      name: /what needs attention/i,
    });

    expect(within(ledger).getByText("Moderate")).toBeVisible();
    expect(ledger.querySelectorAll("button[aria-pressed]")).toHaveLength(5);
    expect(screen.getByRole("region", { name: /report scope/i })).toBeVisible();
  });
});
