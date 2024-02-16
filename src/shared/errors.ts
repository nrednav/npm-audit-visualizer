export class AppError extends Error {
  public readonly context: {
    timestamp: string;
    file: string;
    functionName: string;
    data: Record<string, unknown>;
  };

  constructor(
    message: string,
    context: Omit<AppError["context"], "timestamp">,
    error?: Error,
  ) {
    const compositeErrorMessage = [
      error?.message,
      error instanceof AppError
        ? `Context:\n${JSON.stringify(error.context, null, 2)}`
        : null,
      "----",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    super(compositeErrorMessage);

    this.context = { ...context, timestamp: new Date().toISOString() };
  }
}
