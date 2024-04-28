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
import { COLORS } from "src/constants";

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
      nodeReducer: (node, nodeAttributes) => {
        const graph = sigma.getGraph();

        const newNodeAttributes: { highlighted: boolean; color?: string } = {
          ...nodeAttributes,
          highlighted: Boolean(nodeAttributes.highlighted) || false,
        };

        if (
          hoveredNode &&
          (hoveredNode === node || graph.neighbors(hoveredNode).includes(node))
        ) {
          newNodeAttributes.highlighted = true;
          newNodeAttributes.size = nodeAttributes.size * 2;

          if (nodeAttributes.vulnerability.via.includes(hoveredNode)) {
            newNodeAttributes.color = COLORS.indigo;
          } else {
            newNodeAttributes.color = COLORS.coral;
          }

          if (hoveredNode === node) {
            newNodeAttributes.color = COLORS.gold;
          }

          for (const outboundEdge of graph.outboundEdges(hoveredNode)) {
            graph.setEdgeAttribute(outboundEdge, "color", COLORS.coral);
          }

          for (const inboundEdge of graph.inboundEdges(hoveredNode)) {
            graph.setEdgeAttribute(inboundEdge, "color", COLORS.indigo);
          }
        } else {
          newNodeAttributes.highlighted = false;
          newNodeAttributes.color = COLORS.black;

          if (previouslyHoveredNode) {
            for (const outboundEdge of graph.outboundEdges(
              previouslyHoveredNode,
            )) {
              graph.setEdgeAttribute(outboundEdge, "color", COLORS.black);
            }

            for (const inboundEdge of graph.inboundEdges(
              previouslyHoveredNode,
            )) {
              graph.setEdgeAttribute(inboundEdge, "color", COLORS.black);
            }
          }
        }

        return newNodeAttributes;
      },
      edgeReducer: (edge, data) => {
        const graph = sigma.getGraph();
        const newEdgeAttributes: { hidden: boolean; color?: string } = {
          ...data,
          hidden: false,
        };

        if (hoveredNode && !graph.extremities(edge).includes(hoveredNode)) {
          newEdgeAttributes.hidden = true;
        }

        return newEdgeAttributes;
      },
    });
  }, [hoveredNode, setSettings, sigma, previouslyHoveredNode]);

  return null;
};

export default Visualizer;
