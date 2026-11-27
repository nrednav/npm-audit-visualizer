import {
  type Finding,
  PayloadSchema,
  type RemediationState,
} from "@npm-audit-visualizer/contract";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CHANGE_COST_NOTE,
  EMPTY_STATE_HINT,
  TRIAGE_DEFAULT,
} from "src/components/guidance";
import type { Severity } from "src/constants";
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

  describe("the remediation filters", () => {
    const base = payload.findings[0] as Finding;

    const states: RemediationState[] = [
      "major-change-reported",
      "change-reported",
      "major-change-reported",
      "no-reported-change",
      "change-target-incomplete",
    ];
    const severities = [
      "critical",
      "critical",
      "moderate",
      "moderate",
      "high",
    ] as const;
    const names = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const placements = [true, true, false, false, true];

    const remediationFor = (
      state: RemediationState,
    ): Finding["remediation"] => {
      if (state === "major-change-reported") {
        return {
          state,
          target: { name: "react-scripts", version: "5.0.1" },
        };
      }

      if (state === "change-reported") {
        return { state, target: { name: "semver", version: "7.5.2" } };
      }

      return { state, target: null };
    };

    const findings: Finding[] = names.map((name, index) => ({
      ...base,
      id: name,
      name,
      severity: severities[index],
      direct: placements[index],
      remediation: remediationFor(states[index]),
    }));

    const renderWith = (
      severity: Severity | null = null,
      data: Finding[] = findings,
    ) => {
      render(
        <Visualizer
          findings={data}
          graph={payload.graph}
          severityFilter={severity}
          onClearSeverity={() => undefined}
        />,
      );
    };

    const rowNames = (): string[] =>
      screen
        .queryAllByRole("rowheader")
        .map((row) => row.textContent ?? "")
        .map((text) => names.find((name) => text.includes(name)) ?? text);

    const chip = (label: RegExp) => screen.getByRole("button", { name: label });

    const chipNumber = (label: RegExp): number => {
      const match = chip(label).textContent?.match(/\((\d+)\)/);
      return Number(match?.[1]);
    };

    it("offers four choices, each with the number the report gives it", () => {
      renderWith();

      expect(chipNumber(/^reported fix/i)).toBe(4);
      expect(chipNumber(/^major change/i)).toBe(2);
      expect(chipNumber(/^no target named/i)).toBe(1);
      expect(chipNumber(/^no fix reported/i)).toBe(1);
    });

    it("shows exactly the findings the choice names", async () => {
      const user = userEvent.setup();
      renderWith();

      await user.click(chip(/^major change/i));
      expect(rowNames()).toEqual(["alpha", "gamma"]);

      await user.click(chip(/^no fix reported/i));
      expect(rowNames()).toEqual(["delta"]);

      await user.click(chip(/^no target named/i));
      expect(rowNames()).toEqual(["epsilon"]);
    });

    it("combines a choice with a severity", async () => {
      const user = userEvent.setup();
      renderWith("critical");

      expect(chipNumber(/^reported fix/i)).toBe(2);
      expect(chipNumber(/^major change/i)).toBe(1);
      expect(chipNumber(/^no target named/i)).toBe(0);

      await user.click(chip(/^major change/i));

      expect(rowNames()).toEqual(["alpha"]);
      expect(summaryText()).toContain("1 of 5 findings");
    });

    it("combines a choice with the search", async () => {
      const user = userEvent.setup();
      renderWith();

      await user.type(
        screen.getByRole("searchbox", { name: /search findings/i }),
        "gamma",
      );

      expect(chipNumber(/^major change/i)).toBe(1);
      expect(chipNumber(/^reported fix/i)).toBe(1);
      expect(chipNumber(/^no fix reported/i)).toBe(0);

      await user.click(chip(/^major change/i));

      expect(rowNames()).toEqual(["gamma"]);
    });

    it("states the number the click will show, under the other constraints", async () => {
      const user = userEvent.setup();

      for (const setup of [
        "no constraints",
        "a severity",
        "a search",
      ] as const) {
        const view = render(
          <Visualizer
            findings={findings}
            graph={payload.graph}
            severityFilter={setup === "a severity" ? "critical" : null}
            onClearSeverity={() => undefined}
          />,
        );

        if (setup === "a search") {
          await user.type(
            screen.getByRole("searchbox", { name: /search findings/i }),
            "a",
          );
        }

        for (const label of [
          /^reported fix/i,
          /^major change/i,
          /^no target named/i,
          /^no fix reported/i,
          /^direct/i,
          /^transitive/i,
        ]) {
          const active = chip(label);
          if (active.getAttribute("aria-pressed") === "true") {
            await user.click(active);
          }

          const stated = chipNumber(label);

          await user.click(chip(label));

          expect(
            screen.queryAllByRole("rowheader").length,
            `${setup}: ${label} states ${stated}`,
          ).toBe(stated);

          await user.click(chip(label));
        }

        view.unmount();
      }
    });

    it("replaces the choice and clears it when chosen twice", async () => {
      const user = userEvent.setup();
      renderWith();

      const major = chip(/^major change/i);
      const none = chip(/^no fix reported/i);

      await user.click(major);
      expect(major).toHaveAttribute("aria-pressed", "true");

      await user.click(none);

      expect(major).toHaveAttribute("aria-pressed", "false");
      expect(none).toHaveAttribute("aria-pressed", "true");
      expect(rowNames()).toEqual(["delta"]);

      await user.click(none);

      expect(none).toHaveAttribute("aria-pressed", "false");
      expect(rowNames()).toEqual(names);
    });

    it("isolates the two placements npm distinguishes", async () => {
      const user = userEvent.setup();
      renderWith();

      expect(chipNumber(/^direct/i)).toBe(3);
      expect(chipNumber(/^transitive/i)).toBe(2);

      await user.click(chip(/^direct/i));
      expect(rowNames()).toEqual(["alpha", "beta", "epsilon"]);

      await user.click(chip(/^transitive/i));
      expect(rowNames()).toEqual(["gamma", "delta"]);
    });

    it("combines a placement with a reported change", async () => {
      const user = userEvent.setup();
      renderWith();

      await user.click(chip(/^major change/i));
      expect(chipNumber(/^direct/i)).toBe(1);
      expect(chipNumber(/^transitive/i)).toBe(1);

      await user.click(chip(/^transitive/i));

      expect(rowNames()).toEqual(["gamma"]);
      expect(summaryText()).toContain("1 of 5 findings");
    });

    it("clears its own filters and asks the caller for the severity", async () => {
      const user = userEvent.setup();
      const onClearSeverity = vi.fn();

      render(
        <Visualizer
          findings={findings}
          graph={payload.graph}
          severityFilter="critical"
          onClearSeverity={onClearSeverity}
        />,
      );

      await user.click(chip(/^major change/i));
      expect(rowNames()).toEqual(["alpha"]);

      await user.click(screen.getByRole("button", { name: /clear all/i }));

      expect(onClearSeverity).toHaveBeenCalledTimes(1);
      // The severity is the caller's, so the stub cannot restore it here; the
      // explorer's own two filters are gone, which is all it owns.
      expect(rowNames()).toEqual(["alpha", "beta"]);
      expect(chip(/^major change/i)).toHaveAttribute("aria-pressed", "false");
      expect(summaryText()).toContain("2 of 5 findings");
    });
  });

  it("keeps the bar's rows and its reset slot whatever is active", async () => {
    const user = userEvent.setup();
    renderVisualizer();

    const bar = () =>
      document.querySelector("[data-filter-bar]") as HTMLElement;
    const slot = () =>
      document.querySelector("[data-reset-slot]") as HTMLElement;
    const buttonsInSlot = () => slot().querySelectorAll("button").length;

    // The row count is the invariant, not a literal: a caption may join the bar,
    // but no filter may add or remove a row.
    const rows = bar().children.length;
    expect(rows).toBeGreaterThanOrEqual(3);
    expect(slot().className).toContain("min-w-");
    expect(buttonsInSlot()).toBe(0);

    await user.click(screen.getByRole("button", { name: /^major change/i }));

    expect(bar().children).toHaveLength(rows);
    expect(buttonsInSlot()).toBe(1);

    await user.type(
      screen.getByRole("searchbox", { name: /search findings/i }),
      "a",
    );

    expect(bar().children).toHaveLength(rows);
    expect(buttonsInSlot()).toBe(1);

    await user.click(screen.getByRole("button", { name: /^direct/i }));

    expect(bar().children).toHaveLength(rows);
    expect(buttonsInSlot()).toBe(1);
  });

  it("explains what raises a change cost, beside the axis that reports it", () => {
    renderVisualizer();

    expect(screen.getByText(CHANGE_COST_NOTE)).toBeVisible();
  });

  it("names every constraint in the empty state, and only once in the page", async () => {
    const user = userEvent.setup();
    renderVisualizer();

    await user.type(
      screen.getByRole("searchbox", { name: /search findings/i }),
      "nothing matches this",
    );

    expect(screen.getByText(EMPTY_STATE_HINT)).toBeVisible();

    const occurrences =
      document.body.textContent?.split(EMPTY_STATE_HINT).length;
    expect(occurrences).toBe(2);
  });

  it("reserves the digits of a chip's number, not the whole phrase", () => {
    renderVisualizer();

    const counts = document.querySelectorAll("[data-chip-count]");

    expect(counts.length).toBeGreaterThan(0);

    for (const count of counts) {
      // The reserved box must hold digits only. Parentheses in the box would
      // make the reservation one character short at the first two-digit count.
      expect(count.textContent).toMatch(/^\d+$/);
      expect(count.className).toContain("min-w-[2ch]");
    }
  });

  it("does not repeat the briefing's advice in the bar", () => {
    renderVisualizer();

    const occurrences = document.body.textContent?.split(TRIAGE_DEFAULT).length;
    expect(occurrences).toBe(1);
  });

  it("states the graph's basis and what it leaves out", async () => {
    renderVisualizer();

    await userEvent.click(screen.getByRole("tab", { name: /graph/i }));

    expect(screen.getByText(payload.graph.derivation.note)).toBeVisible();
    expect(screen.getByText(/not a complete dependency tree/i)).toBeVisible();
  });

  it("shows the basis only where the graph is, not on the table", () => {
    renderVisualizer();

    expect(screen.queryByText(payload.graph.derivation.note)).toBeNull();
  });

  it("counts the packages and relationships the graph will draw", () => {
    renderVisualizer();

    expect(screen.getByRole("tab", { name: /graph/i }).textContent).toContain(
      String(payload.graph.nodes.length),
    );
  });
});
