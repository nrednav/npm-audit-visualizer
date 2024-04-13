import {
  ParsedAuditReport,
  ParsedAuditReportSchema,
} from "../../../AuditReport/Parser/types";

export const importParsedAuditReport = async (): Promise<ParsedAuditReport> => {
  const res = await fetch("/parsed-audit-report.json");
  const parsedAuditReport = (await res.json()) as unknown;
  return ParsedAuditReportSchema.parse(parsedAuditReport);
};
