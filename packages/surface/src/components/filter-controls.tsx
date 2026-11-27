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

type FilterChoiceChipsProps<T extends string> = {
  label: string;
  options: readonly { id: T; label: string }[];
  active: T | null;
  counts: Record<T, number>;
  onChoose: (choice: T) => void;
};

export const FilterChoiceChips = <T extends string>(
  props: FilterChoiceChipsProps<T>,
) => {
  const { label, options, active, counts, onChoose } = props;

  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-2 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const pressed = active === option.id;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChoose(option.id)}
            className={clsx(
              "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
              pressed
                ? "border-teal/30 bg-teal-soft text-teal"
                : "border-line bg-surface text-ink-muted hover:border-ink/25 hover:text-ink",
            )}
          >
            {option.label}
            <span className={clsx("num text-xs", !pressed && "text-ink-muted")}>
              ({counts[option.id]})
            </span>
          </button>
        );
      })}
    </fieldset>
  );
};
