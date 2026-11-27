import {
  AuditReportSchema,
  PAYLOAD_SCHEMA_VERSION,
  type Payload,
} from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import matrixReport from "../../contract/test/fixtures/remediation-matrix-audit-report.json";
import matrixPayload from "../../contract/test/fixtures/remediation-matrix-payload.json";
import App from "./app";

/**
 * The matrix fixture, rendered through the app so the chips, the table, and the
 * counts are all the real ones. A boundary asserted against a component's props is
 * a boundary the page may not have.
 */
const payload = matrixPayload as Payload;

const auditReport = AuditReportSchema.parse(matrixReport);

vi.mock("./hooks/use-payload.ts", () => ({
  usePayload: () => ({ status: "loaded", payload }),
}));

vi.mock("src/components/visualizer/vulnerability-graph", () => ({
  default: () => <div>graph panel</div>,
}));

const VERSION_SHAPED = /\d+\.\d+\.\d+/;

describe("the conservative boundary", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("carries all eight rows the fixture states, in the payload's words", () => {
    expect(payload.schemaVersion).toBe(PAYLOAD_SCHEMA_VERSION);
    expect(payload.findings).toHaveLength(8);
    expect(Object.keys(auditReport.vulnerabilities)).toHaveLength(8);
  });

  it("shows a version only for a state that names a target", () => {
    render(<App />);

    const withheld = payload.findings.filter(
      (finding) => finding.remediation.target === null,
    );

    // Four rows withhold a target: the two incomplete forms, the same form from
    // `true`, and the one that reports no change. Four name one.
    expect(withheld).toHaveLength(4);
    expect(
      payload.findings.filter((finding) => finding.remediation.target !== null),
    ).toHaveLength(4);

    // The three withholding states say so, and say no version while doing it.
    expect(screen.getAllByText(/npm named no target/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/no fix reported/i).length).toBeGreaterThan(0);

    for (const finding of withheld) {
      const row = screen.getAllByRole("rowheader", {
        name: new RegExp(finding.name),
      })[0] as HTMLElement;
      const cells = row.closest("tr")?.textContent ?? "";

      expect(cells).not.toMatch(VERSION_SHAPED);
    }
  });

  it("names a target, and says when changing to it is a major change", () => {
    render(<App />);

    expect(
      screen.getAllByText("major-direct@6.0.0 · major change"),
    ).toHaveLength(2);
    expect(screen.getAllByText("reported-direct@2.0.0").length).toBeGreaterThan(
      0,
    );
  });

  it("partitions the findings across the three isolating choices", () => {
    render(<App />);

    const countOf = (label: string): number => {
      const chip = screen.getByRole("button", {
        name: new RegExp(`^${label}`, "i"),
      });
      const text = chip.textContent ?? "";
      const digits = text.match(/\((\d+)\)/);

      return Number(digits?.[1] ?? Number.NaN);
    };

    const reported = countOf("Reported fix");
    const major = countOf("Major change");
    const incomplete = countOf("No target named");
    const none = countOf("No fix reported");

    // "Reported fix" is the union of the three isolating choices that report a
    // change, so it equals the total minus the one that reports none.

    expect(reported + none).toBe(payload.findings.length);
    expect(major + incomplete + none).toBeLessThan(payload.findings.length);
  });
});
