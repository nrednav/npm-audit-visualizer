import type { DependencyGraph, Finding } from "@npm-audit-visualizer/contract";
import { useMemo, useState } from "react";
import { FixableToggle, SeverityChip } from "src/components/filter-controls";
import {
  GraphIcon,
  ResetIcon,
  SearchIcon,
  TableIcon,
} from "src/components/icons";
import { TabList } from "src/components/tab-list";
import VulnerabilityGraphComponent from "src/components/visualizer/vulnerability-graph";
import VulnerabilityTableComponent from "src/components/visualizer/vulnerability-table";
import type { Severity } from "src/constants";

type VisualizerProps = {
  findings: Finding[];
  graph: DependencyGraph;
  severityFilter: Severity | null;
  onClearSeverity: () => void;
};

const Visualizer = (props: VisualizerProps) => {
  const { findings: table, graph, severityFilter, onClearSeverity } = props;
  const [selectedTab, setSelectedTab] = useState(0);
  const [query, setQuery] = useState("");
  const [fixableOnly, setFixableOnly] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredTable = useMemo(() => {
    return table.filter((vulnerability) => {
      if (severityFilter && vulnerability.severity !== severityFilter) {
        return false;
      }

      if (fixableOnly && !vulnerability.fix.available) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        vulnerability.name,
        vulnerability.range,
        ...vulnerability.paths,
        ...vulnerability.via,
        ...vulnerability.effects,
        ...vulnerability.advisories.flatMap((advisory) => [
          advisory.title,
          advisory.url,
          ...advisory.cwe,
        ]),
        vulnerability.fix.name ?? "",
        vulnerability.fix.version ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [table, severityFilter, fixableOnly, normalizedQuery]);

  const filtersActive =
    severityFilter !== null || fixableOnly || normalizedQuery.length > 0;

  const resetAll = () => {
    onClearSeverity();
    setQuery("");
    setFixableOnly(false);
  };

  const tabs = [
    {
      id: "table",
      label: "Table",
      badge: String(filteredTable.length),
      icon: <TableIcon className="h-4 w-4" />,
    },
    {
      id: "graph",
      label: "Graph",
      badge: String(graph.nodes.length),
      icon: <GraphIcon className="h-4 w-4" />,
    },
  ];

  return (
    <section
      id="vulnerability-explorer"
      aria-labelledby="explorer-heading"
      className="mt-8 scroll-mt-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div>
          <p className="eyebrow text-ink-muted">Triage</p>
          <h2
            id="explorer-heading"
            className="mt-1 text-[1.5rem] font-semibold tracking-[-0.025em]"
          >
            Vulnerability explorer
          </h2>
          <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
            Read each finding in place. Open a row to see the advisory, the
            vulnerable range, and the install locations npm reported.
          </p>
        </div>

        <TabList
          label="Finding view"
          tabs={tabs}
          selectedTab={selectedTab}
          onTabSelected={setSelectedTab}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="finding-search" className="sr-only">
            Search findings
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="finding-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search package, install location, or advisory"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-sm text-ink placeholder:text-ink-muted focus:border-teal/50 focus-visible:ring-2 focus-visible:ring-teal/20"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-muted hover:bg-ink/[0.05] hover:text-ink"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {severityFilter && (
            <SeverityChip severity={severityFilter} onClear={onClearSeverity} />
          )}
          <FixableToggle
            active={fixableOnly}
            onClick={() => setFixableOnly((value) => !value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <p
            className="text-xs text-ink-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="num font-semibold text-ink">
              {filteredTable.length}
            </span>{" "}
            of <span className="num">{table.length}</span> findings
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal underline decoration-teal/30 underline-offset-4 hover:decoration-teal"
            >
              <ResetIcon className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${tabs[selectedTab].id}`}
        aria-labelledby={`tab-${tabs[selectedTab].id}`}
      >
        {selectedTab === 0 ? (
          <VulnerabilityTableComponent
            data={filteredTable}
            totalCount={table.length}
            resetKey={`${severityFilter ?? "all"}|${normalizedQuery}|${fixableOnly}`}
            onResetAll={resetAll}
          />
        ) : (
          <VulnerabilityGraphComponent
            data={graph}
            filtersActive={filtersActive}
          />
        )}
      </div>
    </section>
  );
};

export default Visualizer;
