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
  for (const [index, entry] of Object.entries(vulnerabilities).entries()) {
    const [name, vulnerability] = entry;

    if (graph.hasNode(name)) {
      continue;
    }

    graph.addNode(name, {
      x: 0,
      y: index * -100,
      label: vulnerability.name,
      size: 4,
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
        // graph.addDirectedEdge(vulnerability.name, dependencyName, {
        graph.addDirectedEdge(vulnerability.name, dependencyName, {
          type: "arrow",
          size: 2,
          color: "#212326",
        });
      }
    }
  }

  // Third Pass: Move most vulnerable packages to right
  graph.mapNodes((node, _) => {
    const causes = graph.outboundNeighbors(node).filter((x) => x !== node);
    const effects = graph.inboundNeighbors(node).filter((x) => x !== node);
    const newX = (causes.length + effects.length) * -1000;
    graph.setNodeAttribute(node, "x", newX);
  });

  return graph.export();
};

const createVulnerabilityTable = (
  vulnerabilities: AuditReport["vulnerabilities"],
): VulnerabilityTable => {
  logger.debug("Creating vulnerability table");
  return Object.values(vulnerabilities);
};
