import { PayloadSchema } from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import parsedReportFixture from "../../../../contract/test/fixtures/parsed-report.json";
import Visualizer from "./index";

const payload = PayloadSchema.parse(parsedReportFixture);

vi.mock("./vulnerability-graph", () => ({
  default: () => <div>graph panel</div>,
}));

const summaryText = (): string =>
  document.querySelector('p[aria-live="polite"]')?.textContent ?? "";

describe("Visualizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderVisualizer = (severity: "moderate" | null = null) => {
    const onClearSeverity = vi.fn();

    render(
      <Visualizer
        findings={payload.findings}
        graph={payload.graph}
        severityFilter={severity}
        onClearSeverity={onClearSeverity}
      />,
    );

    return { onClearSeverity };
  };

  it("shows every finding before anything restricts it", () => {
    renderVisualizer();

    expect(screen.getAllByRole("rowheader")).toHaveLength(3);
    expect(summaryText()).toContain("3 of 3 findings");
  });

  it("narrows to a search term and reports how many remain", async () => {
    const user = userEvent.setup();
    renderVisualizer();

    await user.type(
      screen.getByRole("searchbox", { name: /search findings/i }),
      "node_modules/nodemon",
    );

    expect(screen.getAllByRole("rowheader")).toHaveLength(1);
    expect(summaryText()).toContain("1 of 3 findings");
  });

  it("finds a finding by its advisory title", async () => {
    const user = userEvent.setup();
    renderVisualizer();

    await user.type(
      screen.getByRole("searchbox", { name: /search findings/i }),
      "regular expression denial",
    );

    expect(screen.getAllByRole("rowheader")).toHaveLength(1);
    expect(summaryText()).toContain("1 of 3 findings");
  });

  it("derives the restriction, so clearing it restores the full set", async () => {
    const user = userEvent.setup();
    renderVisualizer();

    await user.type(
      screen.getByRole("searchbox", { name: /search findings/i }),
      "nothing matches this",
    );

    expect(screen.getByText(/no findings match/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(screen.getAllByRole("rowheader")).toHaveLength(3);
    expect(screen.queryByText(/no findings match/i)).toBeNull();
  });

  it("clears a severity filter held by the caller", async () => {
    const user = userEvent.setup();
    const { onClearSeverity } = renderVisualizer("moderate");

    expect(screen.queryByText(/no findings match/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(onClearSeverity).toHaveBeenCalledOnce();
  });

  it("counts the packages and relationships the graph will draw", () => {
    renderVisualizer();

    expect(screen.getByRole("tab", { name: /graph/i }).textContent).toContain(
      String(payload.graph.nodes.length),
    );
  });
});
