import parsedAuditReport from "@/fixtures/parsed-audit-report.json";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import AuditReportMetadata from "./AuditReportMetadata";

describe("AuditReportMetadata", () => {
  it("renders 2 tabs: vulnerabilities & dependencies", () => {
    render(<AuditReportMetadata metadata={parsedAuditReport.metadata} />);
    expect(screen.getByRole("tab", { name: /vulnerabilities/i })).toBeVisible();
    expect(screen.getByRole("tab", { name: /dependencies/i })).toBeVisible();
  });

  describe("given vulnerabilities tab is selected", () => {
    beforeAll(async () => {
      const user = userEvent.setup();
      render(<AuditReportMetadata metadata={parsedAuditReport.metadata} />);
      await user.click(screen.getByRole("tab", { name: /vulnerabilities/i }));
    });

    it("renders an element for each severity level", () => {
      const severityLevels = Object.keys(
        parsedAuditReport.metadata.vulnerabilities,
      );

      for (const severityLevel of severityLevels) {
        expect(screen.getByText(severityLevel)).toBeVisible();
      }
    });
  });

  describe("given dependencies tab is selected", () => {
    beforeAll(async () => {
      const user = userEvent.setup();
      render(<AuditReportMetadata metadata={parsedAuditReport.metadata} />);
      await user.click(screen.getByRole("tab", { name: /dependencies/i }));
    });

    it("renders an element for each dependency type", () => {
      const dependencyTypes = Object.keys(
        parsedAuditReport.metadata.dependencies,
      );
      for (const dependencyType of dependencyTypes) {
        expect(screen.getByText(dependencyType)).toBeVisible();
      }
    });
  });
});
