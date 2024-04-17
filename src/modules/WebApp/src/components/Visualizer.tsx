import { useEffect, useState } from "react";
import {
  ParsedAuditReport,
  VulnerabilityGraph,
} from "root/src/modules/AuditReport/Parser/types";
import { TabList } from "./TabList";

import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
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
        <SigmaContainer style={{ height: "1024px", width: "1024px" }}>
          <LoadGraph graphData={data.vulnerability.graph} />
        </SigmaContainer>
      );
    },
  },
  { name: "table", Component: () => <div>Table Mode</div> },
];

export const LoadGraph = ({ graphData }: { graphData: VulnerabilityGraph }) => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    const graph = new MultiDirectedGraph({ allowSelfLoops: true });
    graph.import(graphData);
    loadGraph(graph);
  }, [loadGraph, graphData]);

  return null;
};

export default Visualizer;
