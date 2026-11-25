import { PayloadSchema } from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import parsedReportFixture from "../../../contract/test/fixtures/parsed-report.json";
import SeverityLedger from "./severity-ledger";

describe("SeverityLedger", () => {
  it("renders one filter control per severity level", () => {
    render(
      <SeverityLedger
        metadata={PayloadSchema.parse(parsedReportFixture).metadata}
        selected={null}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /critical/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /high/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /moderate/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /low/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /info/i })).toBeVisible();
  });

  it("reports the selected severity when a level is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SeverityLedger
        metadata={PayloadSchema.parse(parsedReportFixture).metadata}
        selected={null}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /high/i }));

    expect(onSelect).toHaveBeenCalledWith("high");
  });

  it("marks the active level and offers a reset", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SeverityLedger
        metadata={PayloadSchema.parse(parsedReportFixture).metadata}
        selected="moderate"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: /moderate/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: /show all/i }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
