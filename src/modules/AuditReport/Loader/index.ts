import fs from "fs";
import * as E from "fp-ts/lib/Either.js";
import { AppError } from "src/shared/errors.js";
import type { RawJson } from "src/shared/types.js";
import { assertIsError } from "src/shared/utils.js";

export const loadAuditReport = (
  filePath: string,
): E.Either<AppError, RawJson> => {
  const context = {
    file: "modules/AuditReport/Loader/index.ts",
    functionName: "loadAuditReport",
    data: { filePath },
  };

  if (!fs.existsSync(filePath)) {
    return E.left(
      new AppError(`File does not exist at path: ${filePath}`, context),
    );
  }

  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const auditReport: RawJson = JSON.parse(file);
    return E.right(auditReport);
  } catch (error) {
    assertIsError(error);
    return E.left(new AppError("Failed to load audit report", context, error));
  }
};
