import type { ParsedAuditReport } from "root/src/modules/audit-report/parser/types";
import { ArrowRightIcon } from "src/components/icons";
import { SEVERITY_META, SEVERITY_ORDER } from "src/constants";

type AuditBriefingProps = {
  metadata: ParsedAuditReport["metadata"];
  fixableCount: number;
};

const AuditBriefing = (props: AuditBriefingProps) => {
  const { metadata, fixableCount } = props;
  const counts = metadata.vulnerabilities;
  const actionRequired = counts.critical + counts.high;
  const total = counts.total;

  return (
    <section
      aria-labelledby="briefing-heading"
      className="relative overflow-hidden rounded-card bg-briefing px-5 py-8 text-[#f4f5f0] sm:px-8 sm:py-8 lg:px-8"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.55fr)] lg:items-end lg:gap-12">
        <div>
          <p className="eyebrow text-[#a9b5ad]">Audit briefing</p>

          <h1
            id="briefing-heading"
            className="mt-3 max-w-[18ch] text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.045em] lg:text-[3.375rem]"
          >
            {total === 0
              ? "This dependency tree came back clean."
              : `${total.toLocaleString("en-US")} ${
                  total === 1 ? "finding needs" : "findings need"
                } a decision.`}
          </h1>

          <p className="mt-5 max-w-[58ch] text-[0.9375rem] leading-relaxed text-[#c3ccc5]">
            {total === 0
              ? "No vulnerabilities were reported. Keep this report as evidence of the scan."
              : actionRequired > 0
                ? "Start with critical, then high. Every finding below keeps its advisory, affected paths, and fix status in one place."
                : "No critical or high findings. Work through the moderate and low findings when it suits the maintenance window."}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href="#vulnerability-explorer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#e8eee9] px-5 py-2 text-sm font-semibold text-briefing transition-colors hover:bg-white focus-visible:outline-[#9fd3c4]"
            >
              {total === 0 ? "Review the evidence" : "Start triage"}
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <p className="text-xs text-[#a9b5ad]">
              <span className="num text-[#e8eee9]">
                {fixableCount.toLocaleString("en-US")}
              </span>{" "}
              of {total.toLocaleString("en-US")} findings report a fix
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.12] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[#a9b5ad]">
            Total findings
          </p>
          <p className="num mt-1 text-[3.375rem] font-semibold leading-none tracking-[-0.055em] text-white lg:text-[5.0625rem]">
            {total.toLocaleString("en-US")}
          </p>

          <div className="mt-5 space-y-2">
            <div
              aria-hidden="true"
              className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.12]"
            >
              {SEVERITY_ORDER.map((severity) => {
                const value = counts[severity];
                if (value === 0) return null;
                return (
                  <span
                    key={severity}
                    style={{
                      width: `${(value / total) * 100}%`,
                      backgroundColor: SEVERITY_META[severity].onDark,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[#c3ccc5]">
                {counts.critical} critical
                <span aria-hidden="true" className="px-1 text-[#77837a]">
                  /
                </span>
                {counts.high} high
              </span>
              <span className="text-[#a9b5ad]">action required</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuditBriefing;
