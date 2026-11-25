import {
  type Advisory,
  type AuditReport,
  type DependencyGraph,
  type Finding,
  type Fix,
  type GraphEdge,
  type GraphNode,
  type Payload,
  type ReportedVulnerability,
  type Severity,
  severityRank,
} from "@npm-audit-visualizer/contract";

const isAdvisory = (entry: unknown): entry is Advisory =>
  typeof entry === "object" && entry !== null;

const isPackageName = (entry: unknown): entry is string =>
  typeof entry === "string";

const toFix = (fixAvailable: ReportedVulnerability["fixAvailable"]): Fix => {
  if (fixAvailable === true) {
    return { available: true, name: null, version: null, major: false };
  }

  if (fixAvailable !== undefined && fixAvailable !== false) {
    return {
      available: true,
      name: fixAvailable.name,
      version: fixAvailable.version,
      major: fixAvailable.isSemVerMajor,
    };
  }

  return { available: false, name: null, version: null, major: false };
};

const toFinding = (
  id: string,
  vulnerability: ReportedVulnerability,
): Finding => ({
  id,
  name: vulnerability.name,
  severity: vulnerability.severity,
  direct: vulnerability.isDirect,
  range: vulnerability.range,
  paths: [...vulnerability.nodes],
  via: vulnerability.via.filter(isPackageName),
  effects:
    vulnerability.effects === undefined ? [] : [...vulnerability.effects],
  advisories: vulnerability.via.filter(isAdvisory),
  fix: toFix(vulnerability.fixAvailable),
});

const byUrgency = (left: Finding, right: Finding): number => {
  const difference = severityRank(right.severity) - severityRank(left.severity);

  return difference === 0 ? left.name.localeCompare(right.name) : difference;
};

/**
 * Only a string `via` entry names a package that introduces this vulnerability,
 * so only those become edges. An advisory's `name` is the vulnerable package
 * itself, and an edge from a package to itself carries no relation. `effects`
 * is the same relation stated from the other end, so using both would draw
 * every chain twice in opposite directions.
 *
 * Nodes and edges are sorted so the payload is a function of the report's
 * content rather than of its key order. Two runs over the same report then
 * produce identical JSON.
 */
const byNodeUrgency = (left: GraphNode, right: GraphNode): number => {
  const leftRank = left.severity === null ? 0 : severityRank(left.severity);
  const rightRank = right.severity === null ? 0 : severityRank(right.severity);

  return rightRank - leftRank || left.id.localeCompare(right.id);
};

const byEdgeOrder = (left: GraphEdge, right: GraphEdge): number => {
  return left.from.localeCompare(right.from) || left.to.localeCompare(right.to);
};
const buildGraph = (report: AuditReport): DependencyGraph => {
  const nodes = new Map<string, GraphNode>();
  const edges: DependencyGraph["edges"] = [];
  const drawn = new Set<string>();

  const severityOf = (id: string): Severity | null =>
    report.vulnerabilities[id]?.severity ?? null;

  for (const [id, vulnerability] of Object.entries(report.vulnerabilities)) {
    nodes.set(id, {
      id,
      name: vulnerability.name,
      severity: vulnerability.severity,
    });
  }

  for (const [id, vulnerability] of Object.entries(report.vulnerabilities)) {
    for (const entry of vulnerability.via) {
      if (!isPackageName(entry)) {
        continue;
      }

      if (!nodes.has(entry)) {
        nodes.set(entry, {
          id: entry,
          name: entry,
          severity: severityOf(entry),
        });
      }

      const key = `${id}\u0000${entry}`;

      if (drawn.has(key)) {
        continue;
      }

      drawn.add(key);
      edges.push({ from: id, to: entry });
    }
  }

  return {
    nodes: [...nodes.values()].sort(byNodeUrgency),
    edges: edges.sort(byEdgeOrder),
  };
};

export const buildPayload = (report: AuditReport): Payload => {
  const findings = Object.entries(report.vulnerabilities)
    .map(([id, vulnerability]) => toFinding(id, vulnerability))
    .sort(byUrgency);

  return {
    metadata: report.metadata,
    findings,
    graph: buildGraph(report),
  };
};
