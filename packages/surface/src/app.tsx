import { useState } from "react";
import AuditBriefing from "src/components/audit-briefing";
import ReportContext from "src/components/report-context";
import SeverityLedger from "src/components/severity-ledger";
import SiteHeader from "src/components/site-header";
import Visualizer from "src/components/visualizer";
import type { Severity } from "src/constants";
import { usePayload } from "src/hooks/use-payload";
import { ThemeProvider } from "src/hooks/use-theme";

const AuditWorkspace = () => {
  const state = usePayload();
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);

  if (state.status === "loading") {
    return <LoadingState />;
  }

  if (state.status === "failed") {
    return <FailureState cause={state.cause} />;
  }

  const { payload } = state;
  const fixableCount = payload.findings.filter(
    (finding) => finding.fix.available,
  ).length;

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to audit findings
      </a>

      <SiteHeader dependencyCount={payload.metadata.dependencies.total} />

      <main id="main-content" className="page-shell pb-[4.5rem] pt-8 sm:pt-8">
        <AuditBriefing
          metadata={payload.metadata}
          fixableCount={fixableCount}
        />

        <SeverityLedger
          metadata={payload.metadata}
          selected={severityFilter}
          onSelect={setSeverityFilter}
        />

        <ReportContext metadata={payload.metadata} />

        <Visualizer
          findings={payload.findings}
          graph={payload.graph}
          severityFilter={severityFilter}
          onClearSeverity={() => setSeverityFilter(null)}
        />
      </main>

      <footer className="border-t border-line/80">
        <div className="page-shell flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            This page shows one <span className="font-mono">npm audit</span>{" "}
            report. No data leaves this browser tab.
          </p>
          <p>
            Table rows open to full evidence. Graph labels appear on hover or
            selection.
          </p>
        </div>
      </footer>
    </div>
  );
};

const LOADING_CARDS = ["critical", "high", "moderate", "low", "info"] as const;

const LoadingState = () => {
  return (
    <div className="min-h-screen">
      <SiteHeader status="reading" />
      <main className="page-shell pt-8" aria-busy="true" aria-live="polite">
        <div className="rounded-card bg-briefing px-5 py-8 sm:px-8 lg:px-8">
          <p className="eyebrow text-[#a9b5ad]">Audit briefing</p>
          <div className="mt-5 h-10 w-2/3 rounded-md bg-white/10 sm:h-14" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/10" />
          <p className="sr-only">Loading the audit report.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {LOADING_CARDS.map((card) => (
            <div
              key={card}
              className="h-[9.5rem] rounded-xl border border-line bg-surface"
            />
          ))}
        </div>
      </main>
    </div>
  );
};

type FailureStateProps = {
  cause: string;
};

/**
 * A report that could not be read is not a report without findings. The cause
 * is printed rather than logged, so the reader can tell which of the two they
 * are looking at.
 */
const FailureState = (props: FailureStateProps) => {
  const { cause } = props;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <span className="eyebrow text-ink-muted">Report unavailable</span>
      <h1 className="mt-3 max-w-[24ch] text-[2rem] font-semibold tracking-[-0.04em]">
        The audit report could not be read.
      </h1>
      <p className="mt-3 max-w-[52ch] text-sm text-ink-muted">
        This page was served no usable report. Nothing has been shown, so no
        finding has been judged safe.
      </p>
      <p className="mt-4 max-w-[52ch] break-words rounded-lg border border-line bg-surface px-4 py-3 text-left font-mono text-xs text-ink-muted">
        {cause}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 inline-flex items-center rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-onink hover:bg-ink/85"
      >
        Try again
      </button>
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AuditWorkspace />
  </ThemeProvider>
);

export default App;
