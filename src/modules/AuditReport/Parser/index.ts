import graphology from "graphology";
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
  const graph = new MultiDirectedGraph({ allowSelfLoops: true });

  if (Object.keys(vulnerabilities).length === 0) {
    return graph.export();
  }

  // First Pass: Add Nodes
  for (const entry of Object.entries(vulnerabilities)) {
    const [name, vulnerability] = entry;

    if (!graph.hasNode(name)) {
      graph.addNode(name, vulnerability);
    }
  }

  // Second Pass: Add Edges
  for (const entry of Object.entries(vulnerabilities)) {
    const [_, vulnerability] = entry;

    for (const dependency of vulnerability.via) {
      const dependencyName =
        typeof dependency === "string" ? dependency : dependency.name;

      if (!graph.hasEdge(vulnerability.name, dependencyName)) {
        graph.addEdge(vulnerability.name, dependencyName);
      }
    }
  }

  return graph.export();
};

const createVulnerabilityTable = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityTable => {
  return Object.values(vulnerabilities);
};
