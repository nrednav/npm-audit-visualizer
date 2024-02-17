import type {
  Attributes,
  GraphOptions,
  SerializedEdge,
  SerializedNode,
} from "graphology-types";
import { z } from "zod";
import { AuditReport, Vulnerability } from "../Validator/schema.js";

export const VulnerabilityGraphSchema = z.object({
  attributes: z.custom<Attributes>(),
  options: z.custom<GraphOptions>(),
  nodes: z.array(z.custom<SerializedNode<Attributes>>()),
  edges: z.array(z.custom<SerializedEdge<Attributes>>()),
});

export type VulnerabilityGraph = z.infer<typeof VulnerabilityGraphSchema>;
export type VulnerabilityTable = Vulnerability[];

export type ParsedAuditReport = {
  metadata: AuditReport["metadata"];
  vulnerability: {
    graph: VulnerabilityGraph;
    table: VulnerabilityTable;
  };
};
