/**
 * Service layer for C2PA credential operations
 * Handles all business logic for reading and processing C2PA manifests
 * and TrustMark watermarks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { C2PAResult } from './types/index.js';
import { C2PToolError } from './types/index.js';
import { createLogger } from './logger.js';
import { MAX_BUFFER_SIZE, NO_CREDENTIALS_INDICATORS } from './constants.js';
import { ensureFileExists, downloadFile, safeDelete } from './file-utils.js';
import { validateFilePath, validateUrl } from './validators.js';
import { parseManifest } from './parsers/index.js';
import { createTrustMarkService } from './trustmark-service.js';

const execAsync = promisify(exec);
const logger = createLogger('c2pa-service');

/**
 * C2PA Service - Core business logic for credential operations
 */
export class C2PAService {
  private trustMarkService = createTrustMarkService('P'); // Use 'P' variant for TrustMark decoding

  /**
   * Execute c2patool command on a file with detailed output
   */
  private async executeC2PATool(filePath: string): Promise<{ stdout: string; stderr: string }> {
    logger.debug('Executing c2patool with detailed output', { filePath });

    try {
      const { stdout, stderr } = await execAsync(`c2patool "${filePath}" --detailed`, {
        maxBuffer: MAX_BUFFER_SIZE,
      });

      return { stdout, stderr };
    } catch (error: unknown) {
      // c2patool may exit with non-zero code even for "no credentials"
      // which is not really an error for our purposes
      if (error && typeof error === 'object' && ('stderr' in error || 'stdout' in error)) {
        const execError = error as { stdout?: string; stderr?: string };
        return {
          stdout: execError.stdout || '',
          stderr: execError.stderr || '',
        };
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during c2patool execution';
      const errorStderr =
        error &&
        typeof error === 'object' &&
        'stderr' in error &&
        typeof (error as { stderr?: string }).stderr === 'string'
          ? (error as { stderr: string }).stderr
          : undefined;

      logger.error('c2patool execution failed', error, { filePath });
      throw new C2PToolError(errorMessage, errorStderr);
    }
  }

  /**
   * Check if output indicates no credentials
   */
  private hasNoCredentials(output: string): boolean {
    return NO_CREDENTIALS_INDICATORS.some((indicator) => output.includes(indicator));
  }

  /**
   * Parse c2patool output into structured result
   */
  private parseC2PAOutput(stdout: string, stderr: string): Omit<C2PAResult, 'trustMarkData'> {
    const output = stdout.trim();
    const errorOutput = stderr.trim();

    // Check if no credentials found
    if (this.hasNoCredentials(output) || this.hasNoCredentials(errorOutput)) {
      logger.debug('No credentials found in file');
      return {
        success: true,
        hasCredentials: false,
        rawOutput: output || errorOutput,
      };
    }

    // Check if we got meaningful output
    if (!output) {
      logger.debug('Empty output from c2patool');
      return {
        success: true,
        hasCredentials: false,
        rawOutput: errorOutput,
      };
    }

    // We have credentials! Parse the detailed manifest
    logger.info('Credentials found in file, parsing manifest');
    const manifestData = parseManifest(output);

    return {
      success: true,
      hasCredentials: true,
      manifestData,
      rawOutput: output,
    };
  }

  /**
   * Read Content Credentials from a local file
   * Checks embedded C2PA manifests first, then TrustMark watermarks if needed
   */
  async readCredentialsFromFile(filePath: string): Promise<C2PAResult> {
    logger.info('Reading credentials from file', { filePath });

    try {
      // Validate input
      validateFilePath(filePath);

      // Check file exists
      await ensureFileExists(filePath);

      // Step 1: Execute c2patool to check for embedded credentials
      logger.info('Checking for embedded C2PA manifest');
      const { stdout, stderr } = await this.executeC2PATool(filePath);

      // Parse C2PA output
      const c2paResult = this.parseC2PAOutput(stdout, stderr);

      // If embedded credentials found, return immediately
      if (c2paResult.hasCredentials) {
        logger.info('Embedded C2PA credentials found, skipping watermark check');
        return c2paResult;
      }

      // Step 2: No embedded credentials found, check for TrustMark watermark
      logger.info('No embedded C2PA found, checking for TrustMark watermark');
      const trustMarkResult = await this.trustMarkService.detectWatermark(filePath);

      // Log TrustMark detection result for debugging
      logger.debug('TrustMark detection result', {
        success: trustMarkResult.success,
        hasWatermark: trustMarkResult.hasWatermark,
        hasError: !!trustMarkResult.error,
      });

      // If TrustMark detection failed, log the error but continue
      if (!trustMarkResult.success && trustMarkResult.error) {
        logger.warn('TrustMark detection failed', { error: trustMarkResult.error });
      }

      // If watermark found, return with watermark data
      if (trustMarkResult.hasWatermark && trustMarkResult.watermarkData) {
        logger.info('TrustMark watermark found');
        return {
          success: true,
          hasCredentials: true,
          trustMarkData: trustMarkResult.watermarkData,
          ...(c2paResult.rawOutput && { rawOutput: c2paResult.rawOutput }),
        };
      }

      // Step 3: Neither embedded credentials nor watermark found
      logger.info('No Content Credentials found (neither embedded nor watermark)');
      return {
        success: true,
        hasCredentials: false,
        ...(c2paResult.rawOutput && { rawOutput: c2paResult.rawOutput }),
      };
    } catch (error: unknown) {
      logger.error('Failed to read credentials from file', error, { filePath });

      const errorMessage = error instanceof Error ? error.message : 'Failed to read credentials';
      const errorStderr =
        error &&
        typeof error === 'object' &&
        'stderr' in error &&
        typeof (error as { stderr?: string }).stderr === 'string'
          ? (error as { stderr: string }).stderr
          : undefined;

      const result: C2PAResult = {
        success: false,
        hasCredentials: false,
        error: errorMessage,
      };

      if (errorStderr) {
        result.rawOutput = errorStderr;
      }

      return result;
    }
  }

  /**
   * Read Content Credentials from a URL
   */
  async readCredentialsFromUrl(url: string): Promise<C2PAResult> {
    logger.info('Reading credentials from URL', { url });

    let tempPath: string | null = null;

    try {
      // Validate URL
      validateUrl(url);

      // Download the file
      tempPath = await downloadFile(url);

      // Read credentials from downloaded file
      const result = await this.readCredentialsFromFile(tempPath);

      return result;
    } catch (error: unknown) {
      logger.error('Failed to read credentials from URL', error, { url });

      const errorMessage = error instanceof Error ? error.message : 'Failed to process URL';

      return {
        success: false,
        hasCredentials: false,
        error: errorMessage,
      };
    } finally {
      // Always clean up temporary file
      if (tempPath) {
        await safeDelete(tempPath);
      }
    }
  }
}

/**
 * Create a new instance of C2PAService
 */
export function createC2PAService(): C2PAService {
  return new C2PAService();
}
