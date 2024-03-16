import {
  ParsedAuditReport,
  ParsedAuditReportSchema,
} from "../../../AuditReport/Parser/types";

import parsedAuditReport from "@/data/parsed-audit-report.json";

export const importParsedAuditReport = (): ParsedAuditReport => {
  return ParsedAuditReportSchema.parse(parsedAuditReport);
};
