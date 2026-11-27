import {
  SEVERITY_ORDER as CONTRACT_SEVERITY_ORDER,
  type Severity,
} from "@npm-audit-visualizer/contract";

export type { Severity };

/**
 * The order and the levels come from the contract. Only the presentation of
 * each level is decided here.
 */
export const SEVERITY_ORDER: readonly Severity[] = CONTRACT_SEVERITY_ORDER;

/**
 * A silhouette per level, drawn on a 12 x 12 grid.
 *
 * Colour is not the only channel. A reader in greyscale, on a monochrome print,
 * or with a colour-vision difference sees the shape and nothing else, so the
 * five levels must not share one. The shapes step from the most closed polygon
 * to the least: octagon, triangle, diamond, square, circle.
 */
type SeverityMarker = {
  shape: "octagon" | "triangle" | "diamond" | "square" | "circle";
  path: string;
};

type SeverityMeta = {
  label: string;
  marker: SeverityMarker;
  color: string;
  surface: string;
  border: string;
  onDark: string;
  cssColor: string;
  cssSurface: string;
  cssBorder: string;
};

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  critical: {
    marker: {
      shape: "octagon",
      path: "M4 1H8L11 4V8L8 11H4L1 8V4Z",
    },
    label: "Critical",
    color: "#9d174d",
    surface: "#fce7f0",
    border: "#f5c6da",
    onDark: "#f9a8d4",
    cssColor: "var(--severity-critical)",
    cssSurface: "var(--severity-critical-surface)",
    cssBorder: "var(--severity-critical-border)",
  },
  high: {
    marker: {
      shape: "triangle",
      path: "M6 1L11 10.5H1Z",
    },
    label: "High",
    color: "#c2410c",
    surface: "#ffedd5",
    border: "#fed7aa",
    onDark: "#fdba74",
    cssColor: "var(--severity-high)",
    cssSurface: "var(--severity-high-surface)",
    cssBorder: "var(--severity-high-border)",
  },
  moderate: {
    marker: {
      shape: "diamond",
      path: "M6 1L11 6L6 11L1 6Z",
    },
    label: "Moderate",
    color: "#a16207",
    surface: "#fef9c3",
    border: "#fde68a",
    onDark: "#fde047",
    cssColor: "var(--severity-moderate)",
    cssSurface: "var(--severity-moderate-surface)",
    cssBorder: "var(--severity-moderate-border)",
  },
  low: {
    marker: {
      shape: "square",
      path: "M2 2H10V10H2Z",
    },
    label: "Low",
    color: "#0b6b5c",
    surface: "#e1efea",
    border: "#c9e0d8",
    onDark: "#5eead4",
    cssColor: "var(--severity-low)",
    cssSurface: "var(--severity-low-surface)",
    cssBorder: "var(--severity-low-border)",
  },
  info: {
    marker: {
      shape: "circle",
      path: "M6 1A5 5 0 1 0 6 11A5 5 0 1 0 6 1Z",
    },
    label: "Info",
    color: "#334155",
    surface: "#edf0f2",
    border: "#d9dfe3",
    onDark: "#cbd5e1",
    cssColor: "var(--severity-info)",
    cssSurface: "var(--severity-info-surface)",
    cssBorder: "var(--severity-info-border)",
  },
};

export const COLORS = {
  ink: "#17211b",
  muted: "#5e655f",
  line: "#dfe2da",
  teal: "#0b6b5c",
  canvas: "#f4f5f0",
  surface: "#ffffff",
  critical: SEVERITY_META.critical.color,
  high: SEVERITY_META.high.color,
  moderate: SEVERITY_META.moderate.color,
  low: SEVERITY_META.low.color,
  info: SEVERITY_META.info.color,
  affectedBy: "#2f5aa8",
  /**
   * The relation hue. It sits outside the severity ramp so a traced edge can
   * never be misread as a severity level, and it stays on the cool side of the
   * two-family split.
   */
  violet: "#6d28d9",
};

/**
 * A package reached through a chain may carry no finding of its own. It gets a
 * neutral mark so it is never read as a severity level. Both values clear the
 * 3:1 floor a meaningful non-text mark needs, because a package that is present
 * must not look absent.
 */
export const NEUTRAL_NODE = {
  color: "#828a82",
  onDark: "#7a8a80",
} as const;

/**
 * A package unrelated to the current selection is held back, not erased. Below
 * the 3:1 mark floor it stops reading as present, which overstates what the
 * report does not contain.
 */
export const DIMMED_NODE = {
  light: "#878f87",
  dark: "#5f7265",
} as const;

/**
 * The graph label is the only text drawn over the WebGL layer, and Sigma fills
 * every property a reducer omits from its own defaults: a #000 glyph, the
 * generic `sans-serif` family, a 12 px size, 6 px padding, and a 12 px shadow at
 * 50% black. All of them are stated here. A partial object is how an unreadable
 * pair reached a shipped view once already.
 */
export const GRAPH_LABEL = {
  surface: { light: "#ffffff", dark: "#24312a" },
  glyph: { light: "#17211b", dark: "#e6ece7" },
  /**
   * Sigma parses a leading numeric weight out of this string, then treats the
   * rest as the family list, so the annotation keeps the page's own stack.
   */
  font: "500 Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  size: 11,
  padding: 8,
  cornerRadius: 4,
} as const;

export const SEVERITY_COLOR_MAP: Record<string, string> = {
  critical: SEVERITY_META.critical.color,
  high: SEVERITY_META.high.color,
  moderate: SEVERITY_META.moderate.color,
  low: SEVERITY_META.low.color,
  info: SEVERITY_META.info.color,
};

export const RELATIONSHIP_META = {
  affects: {
    label: "affects",
    /**
     * Violet, not teal. Teal is the low-severity mark on this same canvas, and
     * two meanings for one hue in one view is an ambiguity, not a shorthand.
     */
    color: COLORS.violet,
    darkColor: "#c4b5fd",
    cssColor: "var(--relationship-affects)",
    description: "Incoming to the selected package",
  },
  affectedBy: {
    label: "affected by",
    color: COLORS.affectedBy,
    darkColor: "#93b4ff",
    cssColor: "var(--relationship-affected-by)",
    description: "Outgoing from the selected package",
  },
} as const;
