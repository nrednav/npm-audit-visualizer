export type Severity = "info" | "low" | "moderate" | "high" | "critical";

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "moderate",
  "low",
  "info",
];

type SeverityMeta = {
  label: string;
  color: string;
  surface: string;
  border: string;
  description: string;
  onDark: string;
  cssColor: string;
  cssSurface: string;
  cssBorder: string;
};

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  critical: {
    label: "Critical",
    color: "#9d174d",
    surface: "#fce7f0",
    border: "#f5c6da",
    description: "Immediate action",
    onDark: "#f9a8d4",
    cssColor: "var(--severity-critical)",
    cssSurface: "var(--severity-critical-surface)",
    cssBorder: "var(--severity-critical-border)",
  },
  high: {
    label: "High",
    color: "#c2410c",
    surface: "#ffedd5",
    border: "#fed7aa",
    description: "Act soon",
    onDark: "#fdba74",
    cssColor: "var(--severity-high)",
    cssSurface: "var(--severity-high-surface)",
    cssBorder: "var(--severity-high-border)",
  },
  moderate: {
    label: "Moderate",
    color: "#a16207",
    surface: "#fef9c3",
    border: "#fde68a",
    description: "Plan a fix",
    onDark: "#fde047",
    cssColor: "var(--severity-moderate)",
    cssSurface: "var(--severity-moderate-surface)",
    cssBorder: "var(--severity-moderate-border)",
  },
  low: {
    label: "Low",
    color: "#0b6b5c",
    surface: "#e1efea",
    border: "#c9e0d8",
    description: "Monitor",
    onDark: "#5eead4",
    cssColor: "var(--severity-low)",
    cssSurface: "var(--severity-low-surface)",
    cssBorder: "var(--severity-low-border)",
  },
  info: {
    label: "Info",
    color: "#334155",
    surface: "#edf0f2",
    border: "#d9dfe3",
    description: "Context only",
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

export const resolveSeverity = (value: string): Severity => {
  return (SEVERITY_ORDER as string[]).includes(value)
    ? (value as Severity)
    : "info";
};
