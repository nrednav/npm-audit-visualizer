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
};

/**
 * A package reached through a chain may carry no finding of its own. It gets a
 * neutral mark so it is never read as a severity level.
 */
export const NEUTRAL_NODE = {
  color: "#9aa5a0",
  onDark: "#5b6a62",
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
    color: COLORS.teal,
    darkColor: "#5eead4",
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
