import graphology from "graphology";
import { logger } from "src/shared/modules/logger.js";
import { AuditReport } from "../Validator/schema.js";
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
  return {
    metadata: auditReport.metadata,
    vulnerability: {
      graph: createVulnerabilityGraph(auditReport.vulnerabilities),
      table: createVulnerabilityTable(auditReport.vulnerabilities),
    },
  };
};

const createVulnerabilityGraph = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityGraph => {
  logger.debug("Creating vulnerability graph");
  const graph = new MultiDirectedGraph({ allowSelfLoops: true });

  if (Object.keys(vulnerabilities).length === 0) {
    return graph.export();
  }

  // First Pass: Add Nodes
  for (const entry of Object.entries(vulnerabilities)) {
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

const createVulnerabilityTable = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityTable => {
  logger.debug("Creating vulnerability table");
  return Object.values(vulnerabilities);
};
