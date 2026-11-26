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

const timestamps: Payload["timestamps"] = {
  auditTime: { unknown: "npm audit --json states no creation time" },
  observedAt: { unknown: "the report was read from a file" },
  builtAt: "2026-11-26T03:30:00.000Z",
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
  digest: `sha256:${"5".repeat(64)}`,
};

const renderContext = (
  sources: Payload["sources"],
  times: Payload["timestamps"] = timestamps,
) =>
  render(
    <ReportContext metadata={metadata} sources={sources} timestamps={times} />,
  );

describe("ReportContext", () => {
  it("shows the source label and the scope counts", () => {
    renderContext([reportSource]);

    expect(screen.getByText("report.json")).toBeVisible();
    expect(screen.getByText("15")).toBeVisible();
    expect(screen.getByText("Production")).toBeVisible();
  });

  it("names the reason the creation time is not supplied, instead of inventing one", () => {
    renderContext([reportSource]);

    expect(screen.getByText("Artifact created")).toBeVisible();
    expect(
      screen.getAllByText(
        "not supplied (npm audit --json states no creation time)",
      ).length,
    ).toBeGreaterThan(0);
    // The only date-shaped text is the build instant the payload supplied.
    expect(screen.getAllByText(/^\d{4}-\d{2}-\d{2}/)).toHaveLength(1);
    expect(screen.getByText("2026-11-26T03:30:00.000Z")).toBeVisible();
    expect(screen.queryByText(/today|ago|just now/i)).toBeNull();
  });

  it("shows the payload's identity, shortened, with the whole value available", () => {
    renderContext([reportSource]);

    const shown = screen.getByText(/^sha256:[0-9a-f]{12}…$/);

    expect(shown).toBeVisible();
    expect(shown.getAttribute("title")).toBe(reportSource.digest);
    expect(shown.textContent?.length).toBeLessThan(reportSource.digest.length);
  });

  it("shows the digest it was given, not one it computed from what it has", () => {
    const other = `sha256:${"9".repeat(64)}`;

    renderContext([{ ...reportSource, digest: other }]);

    expect(screen.getByText(`sha256:${"9".repeat(12)}…`)).toBeVisible();
    expect(screen.queryByText(/^sha256:[0-9a-f]{12}…$/)).not.toBeNull();
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
    expect(screen.queryByText(/version not supplied/)).toBeNull();
  });

  it("renders the scope without a source row when no report source is described", () => {
    renderContext([]);

    expect(screen.getByText("Report scope")).toBeVisible();
    expect(screen.queryByText("Source")).toBeNull();
  });
});

describe("ReportContext times", () => {
  it("names each time separately, so none can be read as another", () => {
    renderContext([reportSource]);

    for (const label of [
      "Artifact created",
      "Audit time",
      "Observed",
      "Payload built",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it("states why a time is unknown instead of showing a plausible instant", () => {
    renderContext([reportSource]);

    // The artifact's creation time and the audit time are both unstated by npm,
    // so the same sentence appears beside two different labels.
    expect(
      screen.getAllByText(
        "not supplied (npm audit --json states no creation time)",
      ),
    ).toHaveLength(2);
    expect(
      screen.getByText("not supplied (the report was read from a file)"),
    ).toBeVisible();
  });

  it("shows the instant it was given, and no date it was not given", () => {
    renderContext([reportSource]);

    expect(screen.getByText("2026-11-26T03:30:00.000Z")).toBeVisible();
    // Neither the page's clock nor a relative age may appear.
    expect(screen.queryByText(/ago|just now|today|minutes?/i)).toBeNull();
    expect(screen.queryByText(/^\d{4}-\d{2}-\d{2}$/)).toBeNull();
  });

  it("shows a stated audit time when one is supplied, in its own field", () => {
    renderContext(
      [
        {
          ...reportSource,
          producer: { name: "npm", version: "11.2.0" },
          createdAt: "2026-11-25T01:00:00.000Z",
        },
      ],
      {
        auditTime: "2026-11-26T02:00:00.000Z",
        observedAt: "2026-11-26T03:00:00.000Z",
        builtAt: "2026-11-26T03:30:00.000Z",
      },
    );

    expect(screen.getByText("2026-11-25T01:00:00.000Z")).toBeVisible();
    expect(screen.getByText("2026-11-26T02:00:00.000Z")).toBeVisible();
    expect(screen.getByText("2026-11-26T03:00:00.000Z")).toBeVisible();
    expect(screen.getByText("2026-11-26T03:30:00.000Z")).toBeVisible();
    expect(screen.queryByText(/not supplied/)).toBeNull();
  });
});
