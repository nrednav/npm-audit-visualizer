export class AppError extends Error {
  public readonly context: {
    timestamp: string;
    file: string;
    functionName: string;
    data: Record<string, string>;
  };

  constructor(
    message: string,
    context: Omit<AppError["context"], "timestamp">,
  ) {
    super(message);
    this.context = { ...context, timestamp: new Date().toISOString() };
  }
}
