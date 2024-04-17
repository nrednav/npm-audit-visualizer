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

  // let prevX = 0;
  let prevY = 0;

  // const entries = Object.entries(vulnerabilities).sort((a, b) => {
  //   let a_vulnerability = a[1];
  //   let b_vulnerability = b[1];
  //
  //   return b_vulnerability.via.length - a_vulnerability.via.length;
  // });

  // First Pass: Add Nodes
  for (const [outerIndex, entry] of Object.entries(vulnerabilities).entries()) {
    // for (const [index, entry] of entries.entries()) {
    const [name, vulnerability] = entry;

    if (!graph.hasNode(name)) {
      if (name === "react-scripts") {
        logger.info(vulnerability);
      }
      graph.addNode(name, {
        x: 0,
        y: prevY,
        label: vulnerability.name,
        size: 4,
        vulnerability: vulnerability,
      });

      if (vulnerability.via.length > 0) {
        vulnerability.via.forEach((vulnerablePackage, index) => {
          if (typeof vulnerablePackage === "string") {
            if (!graph.hasNode(vulnerablePackage)) {
              graph.addNode(vulnerablePackage, {
                x: (index + 1) * 10,
                y: prevY,
                label: vulnerablePackage,
                size: 4,
                vulnerability: {},
              });
            } else {
              // if (vulnerability.name === vulnerablePackage) return;
              // graph.updateNode(vulnerablePackage, () => {
              //   return {
              //     x: (index + 1) * 10,
              //     y: prevY,
              //     label: vulnerablePackage,
              //     vulnerability: {},
              //   };
              // });
            }
          } else {
            if (!graph.hasNode(vulnerablePackage.name)) {
              graph.addNode(vulnerablePackage.name, {
                x: (index + 1) * 10,
                y: prevY,
                label: vulnerablePackage.name,
                size: 4,
                vulnerability: vulnerablePackage,
              });
            } else {
              // if (vulnerability.name === vulnerablePackage.name) return;
              // graph.updateNode(vulnerablePackage.name, () => {
              //   return {
              //     x: (index + 1) * 10,
              //     y: prevY,
              //     label: vulnerablePackage.name,
              //     vulnerability: vulnerablePackage,
              //   };
              // });
            }
          }
        });
      }

      prevY--;
    }
  }

  // Second Pass: Add Edges
  for (const entry of Object.entries(vulnerabilities)) {
    const [_, vulnerability] = entry;

    for (const dependency of vulnerability.via) {
      const dependencyName =
        typeof dependency === "string" ? dependency : dependency.name;

      if (!graph.hasEdge(vulnerability.name, dependencyName)) {
        graph.addEdge(vulnerability.name, dependencyName, {
          type: "arrow",
          size: 2,
        });
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
