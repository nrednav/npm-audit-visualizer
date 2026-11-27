import { PayloadSchema } from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import parsedReportFixture from "../../../contract/test/fixtures/parsed-report.json";
import AuditBriefing from "./audit-briefing";
import { TRIAGE_DEFAULT, TRIAGE_NO_ACTION } from "./guidance";
import { countBySeverity, countReport } from "./report-counts";

const payload = PayloadSchema.parse(parsedReportFixture);

const renderBriefing = (
  metadata = payload.metadata,
  fixableCount = 1,
  severityCounts = countBySeverity(payload.findings),
) => {
  render(
    <AuditBriefing
      counts={countReport(payload.findings, metadata)}
      severityCounts={severityCounts}
      fixableCount={fixableCount}
    />,
  );
};

describe("AuditBriefing", () => {
  it("counts the findings it was given and names the advisories as their own unit", () => {
    renderBriefing();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "3 findings reported.",
    );
    expect(screen.getByText(/carrying/i)).toHaveTextContent("1 advisory");
    expect(screen.queryByText(/metadata states/i)).toBeNull();
  });

  it("names a disagreement between npm's metadata and the findings it lists", () => {
    renderBriefing({
      ...payload.metadata,
      vulnerabilities: { ...payload.metadata.vulnerabilities, total: 5 },
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "3 findings reported.",
    );
    const reconciliation = screen.getByText(/metadata states/i);

    expect(reconciliation).toHaveTextContent("5");
    expect(reconciliation).toHaveTextContent("3");
  });

  it("advises the default order with its basis when a serious finding exists", () => {
    renderBriefing(payload.metadata, 1, {
      ...countBySeverity(payload.findings),
      critical: 2,
      moderate: 1,
    });

    expect(screen.getByText(TRIAGE_DEFAULT)).toBeVisible();
    expect(screen.queryByText(TRIAGE_NO_ACTION)).toBeNull();
  });

  it("advises the maintenance window when no serious finding exists", () => {
    renderBriefing();

    expect(screen.getByText(TRIAGE_NO_ACTION)).toBeVisible();
    expect(screen.queryByText(TRIAGE_DEFAULT)).toBeNull();
  });

  it("states the denominator of the reported-fix sentence in findings", () => {
    renderBriefing();

    expect(
      screen.getByText(/of .* findings carry a reported fix/i),
    ).toBeVisible();
  });
});
