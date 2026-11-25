import type { Severity } from "src/constants";
import { SEVERITY_META } from "src/constants";

type SeverityPillProps = {
  severity: Severity;
  size?: "sm" | "md";
};

export const SeverityPill = (props: SeverityPillProps) => {
  const { severity, size = "sm" } = props;
  const meta = SEVERITY_META[severity];

  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold leading-none"
          : "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold leading-none"
      }
      style={{
        color: meta.cssColor,
        backgroundColor: meta.cssSurface,
        borderColor: meta.cssBorder,
      }}
      data-severity={severity}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.cssColor }}
      />
      {meta.label}
    </span>
  );
};
