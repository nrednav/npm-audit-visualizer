import AuditReportMetadata from "./components/AuditReportMetadata";
import { loadParsedAuditReport } from "./modules/loadParsedAuditReport";

const App = () => {
  const auditReport = loadParsedAuditReport();
  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-center">npm-audit-visualizer</h1>
      </header>
      <main>
        <AuditReportMetadata metadata={auditReport.metadata} />
      </main>
      <footer />
    </>
  );
};

export default App;
