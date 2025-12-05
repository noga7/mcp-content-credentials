/**
 * Custom error types for better error handling
 */

/**
 * Base error class for C2PA operations
 */
export class C2PAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'C2PAError';
    Object.setPrototypeOf(this, C2PAError.prototype);
  }
}

/**
 * Error thrown when a file is not found
 */
export class FileNotFoundError extends C2PAError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
    this.name = 'FileNotFoundError';
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

/**
 * Error thrown when a URL is invalid
 */
export class InvalidUrlError extends C2PAError {
  constructor(url: string) {
    super(`Invalid URL: ${url}`, 'INVALID_URL', { url });
    this.name = 'InvalidUrlError';
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

/**
 * Error thrown when a file download fails
 */
export class DownloadError extends C2PAError {
  constructor(url: string, statusCode?: number) {
    super(`Failed to download file from URL: ${url}`, 'DOWNLOAD_ERROR', { url, statusCode });
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

/**
 * Error thrown when a download times out
 */
export class DownloadTimeoutError extends C2PAError {
  constructor(url: string, timeoutMs: number) {
    super(`Download timeout after ${timeoutMs}ms for URL: ${url}`, 'DOWNLOAD_TIMEOUT', {
      url,
      timeoutMs,
    });
    this.name = 'DownloadTimeoutError';
    Object.setPrototypeOf(this, DownloadTimeoutError.prototype);
  }
}

/**
 * Error thrown when c2patool execution fails
 */
export class C2PToolError extends C2PAError {
  constructor(message: string, stderr?: string) {
    super(`c2patool error: ${message}`, 'C2PATOOL_ERROR', { stderr });
    this.name = 'C2PToolError';
    Object.setPrototypeOf(this, C2PToolError.prototype);
  }
}
