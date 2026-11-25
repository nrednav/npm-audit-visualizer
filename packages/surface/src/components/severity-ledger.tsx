import type { Payload } from "@npm-audit-visualizer/contract";
import { ResetIcon } from "src/components/icons";
import { SeverityMarker } from "src/components/severity-marker";
import { SEVERITY_META, SEVERITY_ORDER, type Severity } from "src/constants";

type SeverityLedgerProps = {
  metadata: Payload["metadata"];
  selected: Severity | null;
  onSelect: (severity: Severity | null) => void;
};

const SeverityLedger = (props: SeverityLedgerProps) => {
  const { metadata, selected, onSelect } = props;
  const counts = metadata.vulnerabilities;
  const total = counts.total;

  return (
    <section aria-labelledby="severity-heading" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div>
          <p className="eyebrow text-ink-muted">Severity ledger</p>
          <h2
            id="severity-heading"
            className="mt-1 text-[1.5rem] font-semibold tracking-[-0.025em]"
          >
            What needs attention
          </h2>
        </div>
        <p className="text-sm text-ink-muted">
          {selected
            ? `Filtering the explorer to ${SEVERITY_META[selected].label.toLowerCase()}.`
            : "Select a level to filter the explorer."}
          {selected && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="ml-2 inline-flex items-center gap-1 font-semibold text-teal underline decoration-teal/30 underline-offset-4 hover:decoration-teal"
            >
              <ResetIcon className="h-3.5 w-3.5" />
              Show all
            </button>
          )}
        </p>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SEVERITY_ORDER.map((severity) => {
          const meta = SEVERITY_META[severity];
          const value = counts[severity];
          const share = total === 0 ? 0 : Math.round((value / total) * 100);
          const isSelected = selected === severity;
          return (
            <li key={severity}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${meta.label}: ${value} findings. ${
                  isSelected ? "Clear this filter" : "Filter the explorer"
                }`}
                onClick={() => onSelect(isSelected ? null : severity)}
                className={[
                  "group flex h-full w-full flex-col rounded-xl border bg-surface p-5 text-left transition-colors duration-150",
                  isSelected
                    ? "border-transparent shadow-[inset_0_0_0_1.5px_currentColor]"
                    : "border-line hover:border-ink/25",
                ].join(" ")}
                style={
                  isSelected
                    ? { color: meta.cssColor, backgroundColor: meta.cssSurface }
                    : undefined
                }
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: meta.cssColor }}
                  >
                    <SeverityMarker severity={severity} />
                    {meta.label}
                  </span>
                  <span className="num text-[0.6875rem] font-medium text-ink-muted">
                    {share}%
                  </span>
                </span>

                <span className="num mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.035em] text-ink">
                  {value.toLocaleString("en-US")}
                </span>
                <span className="mt-1 text-xs text-ink-muted">
                  {meta.description}
                </span>

                <span className="bar-track mt-5 w-full">
                  <span
                    className="bar-fill"
                    style={{
                      width: `${share}%`,
                      backgroundColor: meta.cssColor,
                    }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SeverityLedger;
