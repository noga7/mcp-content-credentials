/**
 * Service layer for C2PA credential operations
 * Handles all business logic for reading and processing C2PA manifests
 * and TrustMark watermarks
 */

import type { C2PAResult } from './types/index.js';
import { C2PANodeError } from './types/index.js';
import { createLogger } from './logger.js';
import { NO_CREDENTIALS_INDICATORS } from './constants.js';
import { ensureFileExists, downloadFile, safeDelete } from './file-utils.js';
import { validateFilePath, validateUrl } from './validators.js';
import { createTrustMarkService } from './trustmark-service.js';
// import { parseManifest } from './parsers/index.js'; // Commented out - using raw JSON instead

const logger = createLogger('c2pa-service');

// Content Credentials Verify trust configuration URLs
// These are the same defaults used by c2patool
const VERIFY_TRUST_ANCHORS = 'https://contentcredentials.org/trust/anchors.pem';
const VERIFY_ALLOWED_LIST = 'https://contentcredentials.org/trust/allowed.sha256.txt';
const VERIFY_TRUST_CONFIG = 'https://contentcredentials.org/trust/store.cfg';

/**
 * C2PA Service - Core business logic for credential operations
 */
export class C2PAService {
  private trustMarkService = createTrustMarkService('P'); // Use 'P' variant for TrustMark decoding
  private trustConfigPromise: Promise<void>;

  constructor() {
    // Initialize trust configuration asynchronously
    this.trustConfigPromise = this.initializeTrustConfig();
  }

  /**
   * Ensure trust configuration has been attempted before reading
   */
  private async ensureTrustConfigured(): Promise<void> {
    await this.trustConfigPromise.catch(() => {
      // Ignore errors - already logged in initializeTrustConfig
    });
  }

  /**
   * Initialize trust configuration using Content Credentials Verify trust list
   * This uses the same defaults as c2patool
   */
  private async initializeTrustConfig(): Promise<void> {
    try {
      logger.info('Loading Content Credentials Verify trust configuration...');
      const { loadTrustConfig, loadVerifyConfig } = await import('@contentauth/c2pa-node');

      // Fetch trust list files
      const [trustAnchors, allowedList, trustConfig] = await Promise.all([
        fetch(VERIFY_TRUST_ANCHORS).then(r => r.text()).catch(() => ''),
        fetch(VERIFY_ALLOWED_LIST).then(r => r.text()).catch(() => ''),
        fetch(VERIFY_TRUST_CONFIG).then(r => r.text()).catch(() => ''),
      ]);

      // Load trust configuration
      const trustConfigObj: any = {
        verifyTrustList: true,
      };
      if (trustAnchors) trustConfigObj.trustAnchors = trustAnchors;
      if (allowedList) trustConfigObj.allowedList = allowedList;
      if (trustConfig) trustConfigObj.trustConfig = trustConfig;
      
      loadTrustConfig(trustConfigObj);

      // Enable trust verification
      loadVerifyConfig({
        verifyTrust: true,
        verifyAfterReading: true,
        verifyTimestampTrust: true,
        verifyAfterSign: true,
        ocspFetch: false,
        remoteManifestFetch: true,
        skipIngredientConflictResolution: false,
        strictV1Validation: false,
      });

      logger.info('Trust configuration loaded successfully');
    } catch (error) {
      logger.error('Failed to initialize trust configuration', error);
      throw error;
    }
  }

  /**
   * Execute c2pa-node read on a file with detailed output
   */
  private async executeC2PANode(filePath: string): Promise<{ stdout: string; stderr: string }> {
    logger.debug('Reading C2PA manifest via c2pa-node', { filePath });

    try {
      // Dynamically import c2pa-node and use the v2 Reader.json() API
      const c2pa: unknown = await import('@contentauth/c2pa-node');

      // Resolve Reader
      const mod = c2pa as Record<string, unknown>;
      const Reader = mod['Reader'] as Record<string, unknown> | undefined;
      if (!Reader) throw new Error('c2pa-node Reader class not found');

      // Create reader from file using fromAsset with FileAsset structure
      const fromAsset = Reader['fromAsset'];
      if (typeof fromAsset !== 'function') {
        throw new Error('c2pa-node Reader.fromAsset not found');
      }
      const reader = await (fromAsset as (asset: { path: string; mimeType?: string }) => Promise<unknown>)({
        path: filePath,
        mimeType: this.getMimeType(filePath)
      });

      // Get detailed JSON via reader.json() (synchronous method)
      const manifest = (reader as { json: () => unknown }).json();

      if (!manifest) {
        // Mirror prior behavior for "no credentials"
        return { stdout: '', stderr: 'No manifest found' };
      }

      // Provide detailed JSON text downstream
      const stdout = JSON.stringify(manifest, null, 2);
      return { stdout, stderr: '' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during c2pa-node read';
      logger.error('c2pa-node manifest read failed', error, { filePath });
      throw new C2PANodeError(errorMessage);
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      pdf: 'application/pdf',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Check if output indicates no credentials
   */
  private hasNoCredentials(output: string): boolean {
    return NO_CREDENTIALS_INDICATORS.some((indicator) => output.includes(indicator));
  }

  /**
   * Parse c2pa-node output into structured result
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
      };
    }

    // Check if we got meaningful output
    if (!output) {
      logger.debug('Empty output from c2pa-node');
      return {
        success: true,
        hasCredentials: false,
      };
    }

    // Parse JSON manifest from c2pa-node
    try {
      const manifest = JSON.parse(output) as Record<string, unknown>;
      logger.info('Credentials found in file, returning raw manifest');
      return {
        success: true,
        hasCredentials: true,
        manifest,
      };
    } catch (error) {
      logger.error('Failed to parse manifest JSON', error);
      return {
        success: false,
        hasCredentials: false,
        error: 'Failed to parse manifest JSON',
      };
    }

    /* Commented out parsing layer - using raw JSON for LLM consumption instead
    logger.info('Credentials found in file, parsing manifest');
    const manifestData = parseManifest(output);
    return {
      success: true,
      hasCredentials: true,
      manifestData,
      rawOutput: output,
    };
    */
  }

  /**
   * Read Content Credentials from a local file
   * Checks embedded C2PA manifests first, then TrustMark watermarks if needed
   */
  async readCredentialsFromFile(filePath: string): Promise<C2PAResult> {
    // Ensure trust configuration is loaded before reading
    await this.ensureTrustConfigured();

    logger.info('Reading credentials from file', { filePath });

    try {
      // Validate input
      validateFilePath(filePath);

      // Check file exists
      await ensureFileExists(filePath);

      // Step 1: Execute c2pa-node to check for embedded credentials
      logger.info('Checking for embedded C2PA manifest');
      const { stdout, stderr } = await this.executeC2PANode(filePath);

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
