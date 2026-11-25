import type { Severity } from "src/constants";
import { SEVERITY_META } from "src/constants";

type SeverityMarkerProps = {
  severity: Severity;
  /** Overrides the level's own colour. Shape is the level's; colour is not. */
  color?: string;
  className?: string;
};

/**
 * The shape is the level's silhouette. Colour is a second channel, never the
 * only one, so this stays legible in greyscale and on a monochrome print.
 */
export const SeverityMarker = (props: SeverityMarkerProps) => {
  const { severity, color, className } = props;
  const meta = SEVERITY_META[severity];

  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-3 w-3 shrink-0"}
      style={{ color: color ?? meta.cssColor }}
      data-marker={meta.marker.shape}
    >
      <path d={meta.marker.path} fill="currentColor" />
    </svg>
  );
};
