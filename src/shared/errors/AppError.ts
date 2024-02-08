export class AppError extends Error {
  public readonly id: string;
  public readonly context: {
    timestamp: string;
    file: string;
    functionName: string;
    inputs: Record<string, string>;
  };

  constructor(id: string, message: string, context: AppError["context"]) {
    super(message);
    this.id = id;
    this.context = context;
  }
}
