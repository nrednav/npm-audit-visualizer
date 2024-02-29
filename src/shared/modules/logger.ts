import chalk from "chalk";

class Logger {
  private static instance: Logger;
  private debugMode = false;

  private constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  static getInstance(debugMode = false) {
    return Logger.instance ? Logger.instance : new Logger(debugMode);
  }

  enableDebugMode() {
    this.debugMode = true;
  }

  log = console.log;

  info = console.info;

  error(...args: unknown[]) {
    console.error(chalk.red(...args));
  }

  debug(...args: unknown[]) {
    if (this.debugMode) {
      console.debug(chalk.yellow(...args));
    }
  }
}

export const logger = Logger.getInstance();
