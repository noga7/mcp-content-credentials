/**
 * Utility functions for file operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { DownloadError, DownloadTimeoutError, FileNotFoundError } from './types/index.js';
import { createLogger } from './logger.js';
import { TEMP_FILE_PREFIX, DOWNLOAD_TIMEOUT_MS } from './constants.js';

const logger = createLogger('file-utils');

/**
 * Check if a file exists and is accessible
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify file exists or throw error
 */
export async function ensureFileExists(filePath: string): Promise<void> {
  logger.debug('Checking file existence', { filePath });
  const exists = await fileExists(filePath);
  if (!exists) {
    logger.error('File not found', undefined, { filePath });
    throw new FileNotFoundError(filePath);
  }
  logger.debug('File exists', { filePath });
}

/**
 * Download a file from URL to a temporary location
 * @returns Path to the downloaded temporary file
 */
export async function downloadFile(url: string): Promise<string> {
  logger.info('Starting file download', { url });

  const tempDir = os.tmpdir();
  const fileName = generateTempFileName(url);
  const tempPath = path.join(tempDir, fileName);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('Download failed with HTTP error', undefined, {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      throw new DownloadError(url, response.status);
    }

    if (!response.body) {
      logger.error('Download failed: empty response body', undefined, { url });
      throw new DownloadError(url);
    }

    const fileStream = createWriteStream(tempPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    await pipeline(Readable.fromWeb(response.body as any), fileStream);

    logger.info('File downloaded successfully', { url, tempPath });
    return tempPath;
  } catch (error) {
    logger.error('File download failed', error, { url });

    if (error instanceof DownloadError || error instanceof DownloadTimeoutError) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DownloadTimeoutError(url, DOWNLOAD_TIMEOUT_MS);
    }

    throw new DownloadError(url);
  }
}

/**
 * Generate a unique temporary file name based on URL
 */
function generateTempFileName(url: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);

  // Extract filename from URL, remove query params
  const urlPath = new URL(url).pathname;
  const baseName = path.basename(urlPath).split('?')[0] || 'file';

  return `${TEMP_FILE_PREFIX}${timestamp}_${randomStr}_${baseName}`;
}

/**
 * Safely delete a file, ignoring errors if file doesn't exist
 */
export async function safeDelete(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logger.debug('Temporary file deleted', { filePath });
  } catch (error) {
    // Ignore errors during cleanup
    logger.warn('Failed to delete temporary file', { filePath, error });
  }
}
