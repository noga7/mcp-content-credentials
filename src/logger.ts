/**
 * Logging utility for the application
 * Provides structured logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Format a log message with context
   */
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.namespace}] ${message}${contextStr}`;
  }

  /**
   * Log debug message (to stderr to not interfere with MCP protocol)
   */
  debug(message: string, context?: LogContext): void {
    console.error(this.format('debug', message, context));
  }

  /**
   * Log info message (to stderr to not interfere with MCP protocol)
   */
  info(message: string, context?: LogContext): void {
    console.error(this.format('info', message, context));
  }

  /**
   * Log warning message (to stderr to not interfere with MCP protocol)
   */
  warn(message: string, context?: LogContext): void {
    console.error(this.format('warn', message, context));
  }

  /**
   * Log error message (to stderr to not interfere with MCP protocol)
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorContext =
      error instanceof Error ? { error: error.message, stack: error.stack, ...context } : context;
    console.error(this.format('error', message, errorContext));
  }
}

/**
 * Create a logger instance for a specific namespace
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
