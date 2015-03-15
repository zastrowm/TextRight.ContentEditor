
module TextRight.Internal.Util {
  
  /**
   * Provides logging functionality that can be toggled on & off
   */
  export class Logger {
    public static count: { (name: string): void };
    public static error: { (text: string): void };
  }

  // TODO at runtime disable these:
  Logger.count = console.count.bind(console);
  Logger.error = console.error.bind(console);
} 