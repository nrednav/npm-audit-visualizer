export class AppError extends Error {
  public readonly summary: string;
  public readonly context: {
    timestamp: string;
    file: string;
    functionName: string;
    data: Record<string, string>;
  };

  constructor(
    summary: string,
    message: string,
    context: Omit<AppError["context"], "timestamp">,
  ) {
    super(message);
    this.summary = summary;
    this.context = { ...context, timestamp: new Date().toISOString() };
  }
}
