import crypto from "node:crypto";
import graphology from "graphology";
import { AuditReport } from "src/modules/audit-report/validator/schema.js";
import { logger } from "src/shared/modules/logger.js";
import type {
  ParsedAuditReport,
  VulnerabilityGraph,
  VulnerabilityTable,
} from "./types.js";

const { MultiDirectedGraph } = graphology;

export const parseAuditReport = (
  auditReport: AuditReport,
): ParsedAuditReport => {
  logger.debug("Parsing audit report");

  const vulnerabilitiesWithIds = generateIdsForVulnerabilities(
    auditReport.vulnerabilities,
  );

  return {
    metadata: auditReport.metadata,
    vulnerability: {
      graph: createVulnerabilityGraph(vulnerabilitiesWithIds),
      table: createVulnerabilityTable(vulnerabilitiesWithIds),
    },
  };
};

const generateIdsForVulnerabilities = (
  vulnerabilities: AuditReport["vulnerabilities"],
): AuditReport["vulnerabilities"] => {
  const vulnerabilitiesClone = structuredClone(vulnerabilities);

  for (const entry of Object.entries(vulnerabilitiesClone)) {
    const [name, vulnerability] = entry;
    const vulnerabilityClone = structuredClone(vulnerability);
    const hash = crypto.createHash("sha256");

    hash.update(JSON.stringify(vulnerabilitiesClone));

    vulnerabilityClone.id = hash.digest("hex");
    vulnerabilitiesClone[name] = vulnerabilityClone;
  }

  return vulnerabilitiesClone;
};

const createVulnerabilityGraph = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityGraph => {
  logger.debug("Creating vulnerability graph");

  const graph = new MultiDirectedGraph({ allowSelfLoops: true });

  if (Object.keys(vulnerabilities).length === 0) {
    return graph.export();
  }

  const sortedVulnerabilities = sortVulnerabilitiesBySeverity(vulnerabilities);

  // First Pass: Add Nodes
  for (const entry of sortedVulnerabilities) {
    const [name, vulnerability] = entry;

    if (graph.hasNode(name)) {
      continue;
    }

    graph.addNode(name, {
      label: vulnerability.name,
      size: 8,
      vulnerability: vulnerability,
    });
  }

  // Second Pass: Add Edges
  for (const entry of Object.entries(vulnerabilities)) {
    const [_, vulnerability] = entry;

    for (const dependency of vulnerability.via) {
      const dependencyName =
        typeof dependency === "string" ? dependency : dependency.name;

      if (!graph.hasEdge(vulnerability.name, dependencyName)) {
        graph.addDirectedEdge(vulnerability.name, dependencyName, { size: 4 });
      }
    }
  }

  return graph.export();
};

const sortVulnerabilitiesBySeverity = (
  vulnerabilities: AuditReport["vulnerabilities"],
  sortOrder: "ascending" | "descending" = "ascending",
) => {
  const SEVERITY_LEVELS = {
    critical: 5,
    high: 4,
    moderate: 3,
    low: 2,
    info: 1,
    none: 0,
  };

  const sortedVulnerabilities = Object.entries(vulnerabilities).sort((a, b) => {
    const vulnerabilityA = vulnerabilities[a[0]];
    const vulnerabilityB = vulnerabilities[b[0]];

    const severityA = SEVERITY_LEVELS[vulnerabilityA?.severity ?? "none"];
    const severityB = SEVERITY_LEVELS[vulnerabilityB?.severity ?? "none"];

    return sortOrder === "ascending"
      ? severityA - severityB
      : severityB - severityA;
  });

  return sortedVulnerabilities;
};

const createVulnerabilityTable = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityTable => {
  logger.debug("Creating vulnerability table");

  return sortVulnerabilitiesBySeverity(vulnerabilities, "descending").map(
    ([_, value]) => value,
  );
};
