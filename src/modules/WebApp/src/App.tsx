import AuditReportMetadata from "./components/AuditReportMetadata";
import { importParsedAuditReport } from "./modules/importParsedAuditReport";

const App = () => {
  const auditReport = importParsedAuditReport();
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
