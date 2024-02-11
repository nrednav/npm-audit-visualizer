import fs from "fs";
import * as E from "fp-ts/Either";
import { AppError } from "src/shared/errors.js";

type RawJson = Record<string, unknown>;

type LoadAuditReport = (filePath: string) => E.Either<AppError, RawJson>;

export const loadAuditReport: LoadAuditReport = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    const error = new AppError("LoadAuditReportFailed", {
      reason: `File does not exist at path: ${filePath}`,
      file: "modules/AuditReportLoader/index.ts",
      functionName: "loadAuditReport",
      data: { filePath },
    });
    return E.left(error);
  }

  const file = fs.readFileSync(filePath, "utf-8");
  const auditReport: RawJson = JSON.parse(file);

  return E.right(auditReport);
};
