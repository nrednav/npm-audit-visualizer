import type { DependencyGraph, Finding } from "@npm-audit-visualizer/contract";
import { useMemo, useState } from "react";
import {
  FilterChoiceChips,
  SeverityChip,
} from "src/components/filter-controls";
import {
  GraphIcon,
  ResetIcon,
  SearchIcon,
  TableIcon,
} from "src/components/icons";
import {
  matchesPositionChoice,
  POSITION_CHOICES,
  POSITION_OPTIONS,
  type PositionChoice,
} from "src/components/position-filter";
import {
  matchesRemediationChoice,
  REMEDIATION_CHOICES,
  REMEDIATION_OPTIONS,
  type RemediationChoice,
} from "src/components/remediation-filter";
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

const searchText = (finding: Finding): string => {
  return [
    finding.name,
    finding.range,
    ...finding.paths,
    ...finding.via,
    ...finding.effects,
    ...finding.advisories.flatMap((advisory) => [
      advisory.title,
      advisory.url,
      ...advisory.cwe,
    ]),
    finding.remediation.target?.name ?? "",
    finding.remediation.target?.version ?? "",
  ]
    .join(" ")
    .toLowerCase();
};

/**
 * The constraints that are not one of the two choosable axes. The filter and
 * every chip number call this, so a number states what the same click would
 * show rather than a report total.
 */
const passesOtherFilters = (
  finding: Finding,
  severity: Severity | null,
  query: string,
): boolean => {
  if (severity && finding.severity !== severity) return false;
  if (!query) return true;
  return searchText(finding).includes(query);
};

const Visualizer = (props: VisualizerProps) => {
  const { findings: table, graph, severityFilter, onClearSeverity } = props;
  const [selectedTab, setSelectedTab] = useState(0);
  const [query, setQuery] = useState("");
  const [remediationChoice, setRemediationChoice] =
    useState<RemediationChoice | null>(null);
  const [positionChoice, setPositionChoice] = useState<PositionChoice | null>(
    null,
  );

  const normalizedQuery = query.trim().toLowerCase();

  const inScope = useMemo(() => {
    return table.filter((finding) =>
      passesOtherFilters(finding, severityFilter, normalizedQuery),
    );
  }, [table, severityFilter, normalizedQuery]);

  const filteredTable = useMemo(() => {
    return inScope.filter(
      (finding) =>
        matchesRemediationChoice(
          finding.remediation.state,
          remediationChoice,
        ) && matchesPositionChoice(finding.direct, positionChoice),
    );
  }, [inScope, remediationChoice, positionChoice]);

  const remediationCounts = useMemo(() => {
    const candidates = inScope.filter((finding) =>
      matchesPositionChoice(finding.direct, positionChoice),
    );

    return REMEDIATION_CHOICES.reduce(
      (counts, choice) => {
        counts[choice] = candidates.filter((finding) =>
          matchesRemediationChoice(finding.remediation.state, choice),
        ).length;
        return counts;
      },
      {} as Record<RemediationChoice, number>,
    );
  }, [inScope, positionChoice]);

  const positionCounts = useMemo(() => {
    const candidates = inScope.filter((finding) =>
      matchesRemediationChoice(finding.remediation.state, remediationChoice),
    );

    return POSITION_CHOICES.reduce(
      (counts, choice) => {
        counts[choice] = candidates.filter((finding) =>
          matchesPositionChoice(finding.direct, choice),
        ).length;
        return counts;
      },
      {} as Record<PositionChoice, number>,
    );
  }, [inScope, remediationChoice]);

  const filtersActive =
    severityFilter !== null ||
    remediationChoice !== null ||
    positionChoice !== null ||
    normalizedQuery.length > 0;

  const resetAll = () => {
    onClearSeverity();
    setQuery("");
    setRemediationChoice(null);
    setPositionChoice(null);
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
          <FilterChoiceChips
            label="Reported change"
            options={REMEDIATION_OPTIONS}
            active={remediationChoice}
            counts={remediationCounts}
            onChoose={(choice) =>
              setRemediationChoice((current) =>
                current === choice ? null : choice,
              )
            }
          />
          <FilterChoiceChips
            label="Dependency position"
            options={POSITION_OPTIONS}
            active={positionChoice}
            counts={positionCounts}
            onChoose={(choice) =>
              setPositionChoice((current) =>
                current === choice ? null : choice,
              )
            }
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
            resetKey={`${severityFilter ?? "all"}|${normalizedQuery}|${remediationChoice ?? "any"}|${positionChoice ?? "both"}`}
            onResetAll={resetAll}
          />
        ) : (
          <>
            {/* The graph omits what npm did not report, and only the payload
                knows that. Saying it here keeps the page from implying a
                complete tree. */}
            <p className="mt-4 max-w-[75ch] text-xs text-ink-muted">
              {graph.derivation.note}
            </p>
            <VulnerabilityGraphComponent
              data={graph}
              filtersActive={filtersActive}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default Visualizer;
