import { useEffect, useState } from "react";
import {
  ParsedAuditReport,
  VulnerabilityGraph,
} from "root/src/modules/AuditReport/Parser/types";
import { TabList } from "./TabList";

import {
  ControlsContainer,
  FullScreenControl,
  SigmaContainer,
  ZoomControl,
  useLoadGraph,
  useRegisterEvents,
  useSetSettings,
  useSigma,
} from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { MultiDirectedGraph } from "graphology";
import { circular } from "graphology-layout";
import { Attributes } from "graphology-types";
import { Sigma } from "sigma";
import { NodeDisplayData } from "sigma/types";
import { COLORS } from "src/constants";
import { Vulnerability } from "../../../AuditReport/Validator/schema";

type VisualizerProps = {
  parsedAuditReport: ParsedAuditReport;
};

const Visualizer = (props: VisualizerProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const selectedMode = modes[selectedTab];

  return (
    <section>
      <TabList
        tabs={modes.map((mode) => mode.name)}
        selectedTab={selectedTab}
        onTabSelected={setSelectedTab}
      />
      <selectedMode.Component data={props.parsedAuditReport} />
    </section>
  );
};

type VisualizerMode = {
  name: keyof ParsedAuditReport["vulnerability"];
  Component: (props: { data: ParsedAuditReport }) => JSX.Element;
};

const modes: VisualizerMode[] = [
  {
    name: "graph",
    Component: ({ data }: { data: ParsedAuditReport }) => {
      return (
        <SigmaContainer
          style={{ width: "100%", height: "1024px" }}
          settings={{
            allowInvalidContainer: true,
            defaultEdgeColor: COLORS.black,
          }}
        >
          <VulnerabilityGraphComponent graphData={data.vulnerability.graph} />
          <ControlsContainer position={"bottom-right"}>
            <ZoomControl />
            <FullScreenControl />
          </ControlsContainer>
        </SigmaContainer>
      );
    },
  },
  { name: "table", Component: () => <div>Table Mode</div> },
];

export const VulnerabilityGraphComponent = ({
  graphData,
}: { graphData: VulnerabilityGraph }) => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const setSettings = useSetSettings();
  const loadGraph = useLoadGraph();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [previouslyHoveredNode, setPreviouslyHoveredNode] = useState<
    string | null
  >(null);

  useEffect(() => {
    const graph = new MultiDirectedGraph({ allowSelfLoops: true });
    graph.import(graphData);
    circular.assign(graph);
    loadGraph(graph);
    registerEvents({
      enterNode: (event) => {
        setPreviouslyHoveredNode(null);
        setHoveredNode(event.node);
      },
      leaveNode: (event) => {
        setHoveredNode(null);
        setPreviouslyHoveredNode(event.node);
      },
    });
  }, [loadGraph, graphData, registerEvents]);

  useEffect(() => {
    setSettings({
      nodeReducer: nodeReducer({ sigma, hoveredNode, previouslyHoveredNode }),
      edgeReducer: edgeReducer({ sigma, hoveredNode }),
    });
  }, [hoveredNode, setSettings, sigma, previouslyHoveredNode]);

  return null;
};

type NodeReducerContext = {
  sigma: Sigma;
  hoveredNode: string | null;
  previouslyHoveredNode: string | null;
};

const nodeReducer =
  (context: NodeReducerContext) =>
  (node: string, data: Attributes): Partial<NodeDisplayData> => {
    const { sigma, hoveredNode, previouslyHoveredNode } = context;

    const graph = sigma.getGraph();

    const newNodeData: Attributes = {
      ...data,
      highlighted: Boolean(data.highlighted) || false,
    };

    if (hoveredNode && node === hoveredNode) {
      newNodeData.highlighted = true;
      newNodeData.size = data.size * 2;
      newNodeData.color = COLORS.gold;

      for (const outboundEdge of graph.outboundEdges(hoveredNode)) {
        graph.setEdgeAttribute(outboundEdge, "color", COLORS.coral);
      }

      for (const inboundEdge of graph.inboundEdges(hoveredNode)) {
        graph.setEdgeAttribute(inboundEdge, "color", COLORS.indigo);
      }
    } else if (hoveredNode && graph.neighbors(hoveredNode).includes(node)) {
      newNodeData.highlighted = true;
      newNodeData.size = data.size * 2;
      newNodeData.color = getNeighboringNodeColor(data, hoveredNode);
    } else {
      newNodeData.highlighted = false;
      newNodeData.color = COLORS.black;

      if (previouslyHoveredNode) {
        for (const outboundEdge of graph.outboundEdges(previouslyHoveredNode)) {
          graph.setEdgeAttribute(outboundEdge, "color", COLORS.black);
        }

        for (const inboundEdge of graph.inboundEdges(previouslyHoveredNode)) {
          graph.setEdgeAttribute(inboundEdge, "color", COLORS.black);
        }
      }
    }

    return newNodeData;
  };

const getNeighboringNodeColor = (data: Attributes, hoveredNode: string) => {
  const vulnerability = data.vulnerability as unknown as Vulnerability;

  if (vulnerability.via.includes(hoveredNode)) {
    return COLORS.indigo;
  }

  return COLORS.coral;
};

type EdgeReducerContext = {
  sigma: Sigma;
  hoveredNode: string | null;
};

const edgeReducer =
  (context: EdgeReducerContext) => (edge: string, data: Attributes) => {
    const { sigma, hoveredNode } = context;
    const graph = sigma.getGraph();
    const newEdgeData: Attributes = { ...data, hidden: false };

    if (hoveredNode && !graph.extremities(edge).includes(hoveredNode)) {
      newEdgeData.hidden = true;
    }

    return newEdgeData;
  };

export default Visualizer;
