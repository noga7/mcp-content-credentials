/**
 * Validation utilities for input parameters
 */

import { InvalidUrlError } from './types/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('validators');

/**
 * Validate that a string is not empty
 */
export function validateNonEmpty(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    const error = new Error(`${fieldName} cannot be empty`);
    logger.error('Validation failed: empty field', error, { fieldName });
    throw error;
  }
}

/**
 * Validate that a string is a valid URL
 */
export function validateUrl(urlString: string): URL {
  try {
    const url = new URL(urlString);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new InvalidUrlError(`Unsupported protocol: ${url.protocol}`);
    }

    logger.debug('URL validated successfully', { url: urlString });
    return url;
  } catch (error) {
    if (error instanceof InvalidUrlError) {
      throw error;
    }
    logger.error('URL validation failed', error, { url: urlString });
    throw new InvalidUrlError(urlString);
  }
}

/**
 * Validate that a file path is provided and is a string
 */
export function validateFilePath(filePath: string): void {
  validateNonEmpty(filePath, 'filePath');

  // Basic path validation - check for null bytes
  if (filePath.includes('\0')) {
    const error = new Error('File path contains invalid characters');
    logger.error('File path validation failed', error, { filePath });
    throw error;
  }

  logger.debug('File path validated', { filePath });
}
