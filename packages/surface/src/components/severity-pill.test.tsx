import { render } from "@testing-library/react";
import { SEVERITY_ORDER, type Severity } from "src/constants";
import { describe, expect, it } from "vitest";
import { SeverityPill } from "./severity-pill";

/** The silhouette, and nothing that a colour-stripped render removes. */
const silhouetteOf = (severity: Severity): string => {
  const path = document.querySelector(
    `[data-severity="${severity}"] svg[data-marker] path`,
  );

  if (path === null) {
    throw new Error(`${severity} renders no marker`);
  }

  return path.getAttribute("d") ?? "";
};

const renderAll = (): void => {
  render(
    SEVERITY_ORDER.map((severity) => (
      <SeverityPill key={severity} severity={severity} />
    )),
  );
};

describe("the severity marker", () => {
  it("renders one marker per severity", () => {
    renderAll();

    for (const severity of SEVERITY_ORDER) {
      expect(
        silhouetteOf(severity).length,
        `${severity} draws nothing`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * V28: "Severity is distinguishable without colour and without text."
   *
   * The observation channel is the path data, which is what survives a
   * greyscale render, a monochrome print, and a colour-vision difference. The
   * label's text is deliberately not read, and neither is any fill.
   */
  it("gives every level its own silhouette", () => {
    renderAll();

    const silhouettes = SEVERITY_ORDER.map((severity) => ({
      severity,
      path: silhouetteOf(severity),
    }));

    const distinct = new Set(silhouettes.map((entry) => entry.path));

    expect(
      distinct.size,
      `two levels share a silhouette: ${silhouettes
        .map((entry) => `${entry.severity}=${entry.path}`)
        .join(" ")}`,
    ).toBe(SEVERITY_ORDER.length);
  });

  it("separates two neighbouring levels by shape alone", () => {
    renderAll();

    expect(silhouetteOf("critical")).not.toBe(silhouetteOf("moderate"));
    expect(silhouetteOf("moderate")).not.toBe(silhouetteOf("low"));
  });
});
