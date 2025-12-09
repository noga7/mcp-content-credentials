/**
 * TrustMark Watermark Service
 *
 * This service handles detection and decoding of TrustMark watermarks
 * from images to retrieve Content Credentials stored via watermarking.
 *
 * TrustMark embeds a unique identifier into image pixels that links to
 * a C2PA manifest, allowing credentials to persist even if metadata is stripped.
 *
 * Implementation: Calls Python TrustMark decoder via subprocess (similar to c2patool)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createLogger } from './logger.js';
import type { TrustMarkResult } from './types/index.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPT_PATH = join(__dirname, '..', 'scripts', 'trustmark-decode.py');

const logger = createLogger('trustmark-service');

/**
 * TrustMark Service - Handles watermark detection and decoding
 */
export class TrustMarkService {
  private modelType: string;

  constructor(modelType: 'Q' | 'P' = 'Q') {
    this.modelType = modelType;
  }

  /**
   * Detect and decode TrustMark watermark from an image file
   *
   * @param filePath - Path to the image file
   * @returns TrustMark detection result with embedded data if found
   */
  async detectWatermark(filePath: string): Promise<TrustMarkResult> {
    logger.info('Detecting TrustMark watermark', { filePath });

    try {
      // Execute Python TrustMark decoder
      const result = await this.executeTrustMarkDecoder(filePath);

      if (result.hasWatermark && result.watermarkData) {
        logger.info('TrustMark watermark detected', {
          hasIdentifier: !!result.watermarkData.identifier,
          schema: result.watermarkData.schema,
        });

        return {
          success: true,
          hasWatermark: true,
          watermarkData: result.watermarkData,
        };
      } else {
        logger.debug('No TrustMark watermark detected in image');
        return {
          success: true,
          hasWatermark: false,
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during watermark detection';
      logger.error('Failed to detect watermark', error, { filePath });

      return {
        success: false,
        hasWatermark: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute Python TrustMark decoder script
   */
  private async executeTrustMarkDecoder(filePath: string): Promise<TrustMarkResult> {
    logger.debug('Executing TrustMark decoder script', { filePath, modelType: this.modelType });

    try {
      const { stdout, stderr } = await execAsync(
        `python3 "${SCRIPT_PATH}" "${filePath}" "${this.modelType}"`,
        {
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        }
      );

      if (stderr) {
        logger.warn('TrustMark decoder stderr', { stderr });
      }

      // Parse JSON output from Python script
      const result = JSON.parse(stdout.trim()) as {
        success: boolean;
        hasWatermark: boolean;
        watermarkData?: TrustMarkResult['watermarkData'];
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error ?? 'TrustMark decoder failed');
      }

      return result as TrustMarkResult;
    } catch (error: unknown) {
      // Handle Python/script not found
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new Error(
          'Python or TrustMark decoder not found. Install with: pip install trustmark Pillow'
        );
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse TrustMark decoder output');
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error executing TrustMark decoder';
      logger.error('TrustMark decoder execution failed', error);
      throw new Error(errorMessage);
    }
  }
}

/**
 * Create a new instance of TrustMarkService
 *
 * @param modelType - TrustMark model type ('Q' for balanced, 'P' for alternative)
 */
export function createTrustMarkService(modelType: 'Q' | 'P' = 'Q'): TrustMarkService {
  return new TrustMarkService(modelType);
}
