import clsx from "clsx";
import type { Severity } from "src/constants";
import { SEVERITY_META } from "src/constants";

type SeverityChipProps = {
  severity: Severity;
  onClear: () => void;
};

export const SeverityChip = (props: SeverityChipProps) => {
  const { severity, onClear } = props;
  const meta = SEVERITY_META[severity];

  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold"
      style={{
        color: meta.cssColor,
        backgroundColor: meta.cssSurface,
        borderColor: meta.cssBorder,
      }}
    >
      {meta.label}
      <span aria-hidden="true" className="text-sm leading-none">
        ×
      </span>
      <span className="sr-only">. Remove filter</span>
    </button>
  );
};

type FilterToggleProps = {
  active: boolean;
  onClick: () => void;
};

export const FixableToggle = (props: FilterToggleProps) => {
  const { active, onClick } = props;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
        active
          ? "border-teal/30 bg-teal-soft text-teal"
          : "border-line bg-surface text-ink-muted hover:border-ink/25 hover:text-ink",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border",
          active ? "border-teal bg-teal text-onink" : "border-ink/25",
        )}
      >
        {active && (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
            <path
              d="M1.5 5.2 4 7.5 8.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      Reported fix
    </button>
  );
};
