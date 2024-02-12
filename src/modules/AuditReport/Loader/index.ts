import fs from "fs";
import * as E from "fp-ts/lib/Either.js";
import { AppError } from "src/shared/errors.js";
import type { RawJson } from "src/shared/types.js";

export const loadAuditReport = (
  filePath: string,
): E.Either<AppError, RawJson> => {
  if (!fs.existsSync(filePath)) {
    const error = new AppError(
      "LoadAuditReportFailed",
      `File does not exist at path: ${filePath}`,
      {
        file: "modules/AuditReport/Loader/index.ts",
        functionName: "loadAuditReport",
        data: { filePath },
      },
    );
    return E.left(error);
  }

  const file = fs.readFileSync(filePath, "utf-8");
  const auditReport: RawJson = JSON.parse(file);

  return E.right(auditReport);
};
