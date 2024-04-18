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

const modes: {
  name: keyof ParsedAuditReport["vulnerability"];
  Component: (props: { data: ParsedAuditReport }) => JSX.Element;
}[] = [
  {
    name: "graph",
    Component: ({ data }: { data: ParsedAuditReport }) => {
      return (
        <SigmaContainer
          style={{ width: "1024px", height: "1024px" }}
          settings={{ allowInvalidContainer: true }}
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
  disableHoverEffect,
}: { graphData: VulnerabilityGraph; disableHoverEffect?: boolean }) => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const setSettings = useSetSettings();
  const loadGraph = useLoadGraph();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const graph = new MultiDirectedGraph({ allowSelfLoops: true });
    graph.import(graphData);
    loadGraph(graph);
    registerEvents({
      enterNode: (event) => setHoveredNode(event.node),
      leaveNode: () => setHoveredNode(null),
    });
  }, [loadGraph, graphData, registerEvents]);

  useEffect(() => {
    setSettings({
      nodeReducer: (node, data) => {
        const graph = sigma.getGraph();
        const newData: { highlighted: boolean; color?: string } = {
          ...data,
          highlighted: Boolean(data.highlighted) || false,
        };

        if (!disableHoverEffect && hoveredNode) {
          if (
            node === hoveredNode ||
            graph.neighbors(hoveredNode).includes(node)
          ) {
            newData.highlighted = true;
            const outgoing = graph.outboundEdges(hoveredNode);
            const incoming = graph.inboundEdges(hoveredNode);

            outgoing.forEach((outgoingEdge) => {
              graph.setEdgeAttribute(outgoingEdge, "color", "#ff0000");
            });

            incoming.forEach((incomingEdge) => {
              graph.setEdgeAttribute(incomingEdge, "color", "#0000ff");
            });
          } else {
            newData.color = "#E2E2E2";
            newData.highlighted = false;
          }
        }

        return newData;
      },
      edgeReducer: (edge, data) => {
        const graph = sigma.getGraph();
        const newData: { hidden: boolean; color?: string } = {
          ...data,
          hidden: false,
        };

        if (
          !disableHoverEffect &&
          hoveredNode &&
          !graph.extremities(edge).includes(hoveredNode)
        ) {
          newData.hidden = true;
        }

        return newData;
      },
    });
  }, [hoveredNode, setSettings, sigma, disableHoverEffect]);

  return null;
};

export default Visualizer;
