import type { Payload } from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportContext from "./report-context";

const metadata: Payload["metadata"] = {
  vulnerabilities: {
    info: 0,
    low: 1,
    moderate: 2,
    high: 0,
    critical: 0,
    total: 3,
  },
  dependencies: {
    prod: 10,
    dev: 4,
    optional: 1,
    peer: 0,
    peerOptional: 0,
    total: 15,
  },
};

const reportSource: Payload["sources"][number] = {
  kind: "audit-report",
  producer: {
    name: "npm",
    version: { unknown: "npm audit --json does not state the npm version" },
  },
  schemaVersion: "2",
  createdAt: { unknown: "npm audit --json states no creation time" },
  label: "report.json",
};

const renderContext = (sources: Payload["sources"]) =>
  render(<ReportContext metadata={metadata} sources={sources} />);

describe("ReportContext", () => {
  it("shows the source label and the scope counts", () => {
    renderContext([reportSource]);

    expect(screen.getByText("report.json")).toBeVisible();
    expect(screen.getByText("15")).toBeVisible();
    expect(screen.getByText("Production")).toBeVisible();
  });

  it("names the reason the creation time is not supplied, instead of inventing one", () => {
    renderContext([reportSource]);

    expect(screen.getByText("Created")).toBeVisible();
    expect(
      screen.getByText(
        "not supplied (npm audit --json states no creation time)",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}/)).toBeNull();
    expect(screen.queryByText(/today|ago|just now/i)).toBeNull();
  });

  it("states the producer version and its reason rather than a bare name", () => {
    renderContext([reportSource]);

    expect(
      screen.getByText(
        "npm (version not supplied: npm audit --json does not state the npm version)",
      ),
    ).toBeVisible();
  });

  it("shows a stated creation time and producer version when the artifact has them", () => {
    renderContext([
      {
        ...reportSource,
        producer: { name: "npm", version: "11.2.0" },
        createdAt: "2026-11-26T00:00:00Z",
      },
    ]);

    expect(screen.getByText("npm 11.2.0")).toBeVisible();
    expect(screen.getByText("2026-11-26T00:00:00Z")).toBeVisible();
    expect(screen.queryByText(/not supplied/)).toBeNull();
  });

  it("renders the scope without a source row when no report source is described", () => {
    renderContext([]);

    expect(screen.getByText("Report scope")).toBeVisible();
    expect(screen.queryByText("Source")).toBeNull();
  });
});
