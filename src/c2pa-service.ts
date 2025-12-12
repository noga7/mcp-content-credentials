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

const logger = createLogger('c2pa-service');

// Content Credentials Verify trust configuration URLs
// These are the same defaults used by c2patool
const VERIFY_TRUST_ANCHORS = 'https://contentcredentials.org/trust/anchors.pem';
const VERIFY_ALLOWED_LIST = 'https://contentcredentials.org/trust/allowed.sha256.txt';
const VERIFY_TRUST_CONFIG = 'https://contentcredentials.org/trust/store.cfg';

// Cache c2pa-node module at module level for performance
let c2paNodeModule: any = null;
const getC2PANode = async () => {
  if (!c2paNodeModule) {
    c2paNodeModule = await import('@contentauth/c2pa-node');
  }
  return c2paNodeModule;
};

// MIME type lookup table - at module level to avoid recreating
const MIME_TYPES: Record<string, string> = {
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

// Test signing credentials - FOR TESTING ONLY
const TEST_SIGNING_CERT = `-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
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
wvq03sA=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----`;

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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
G/dZR0Qj3j0T5F9GX719XpmzYbVFKIKPTsKF
-----END PRIVATE KEY-----`;

const TEST_TSA_URL = 'http://timestamp.digicert.com';

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
      const { loadTrustConfig, loadVerifyConfig } = await getC2PANode();

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
      // Use cached c2pa-node module
      const c2pa = await getC2PANode();
      const { Reader } = c2pa;

      if (!Reader) throw new Error('c2pa-node Reader class not found');

      // Create reader from file
      const reader = await Reader.fromAsset({
        path: filePath,
        mimeType: this.getMimeType(filePath)
      });

      // If no reader returned, no credentials found
      if (!reader) {
        return { stdout: '', stderr: 'No manifest found' };
      }

      // Get detailed JSON via reader.json()
      const manifest = reader.json();

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
    return MIME_TYPES[ext || ''] || 'application/octet-stream';
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
        };
      }

      // Step 3: Neither embedded credentials nor watermark found
      logger.info('No Content Credentials found (neither embedded nor watermark)');
      return {
        success: true,
        hasCredentials: false,
      };
    } catch (error: unknown) {
      logger.error('Failed to read credentials from file', error, { filePath });

      const errorMessage = error instanceof Error ? error.message : 'Failed to read credentials';

      const result: C2PAResult = {
        success: false,
        hasCredentials: false,
        error: errorMessage,
      };

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

  /**
   * Sign an asset with C2PA credentials
   * @param inputPath Path to input file
   * @param options Signing options including manifest definition
   * @returns Result with input/output paths and manifest
   */
  async signAsset(inputPath: string, options: import('./types/index.js').SignAssetOptions): Promise<import('./types/index.js').SignAssetResult> {
    logger.info('Signing asset', { inputPath, hasManifest: !!options.manifest });
    
    try {
      validateFilePath(inputPath);
      await ensureFileExists(inputPath);
      
      if (!options.manifest) {
        throw new Error('Manifest definition is required');
      }
      
      // Generate output path if not provided
      const outputPath = options.outputPath || this.generateOutputPath(inputPath);
      
      const c2pa = await getC2PANode();
      const { createSigner } = c2pa;
      
      if (!createSigner) {
        throw new Error('c2pa-node createSigner not found');
      }
      
      // Create signer with test credentials or provided ones
      const signer = await createSigner({
        type: 'local',
        certificate: options.signingCert || TEST_SIGNING_CERT,
        privateKey: options.privateKey || TEST_PRIVATE_KEY,
        algorithm: 'ps256',
        tsaUrl: options.tsaUrl || TEST_TSA_URL,
      });
      
      // Sign the asset
      await signer.sign({
        asset: {
          path: inputPath,
          mimeType: this.getMimeType(inputPath),
        },
        manifest: options.manifest,
        output: {
          path: outputPath,
          mimeType: this.getMimeType(outputPath),
        },
      });
      
      logger.info('Asset signed successfully', { inputPath, outputPath });
      
      return {
        success: true,
        inputPath,
        outputPath,
        manifest: options.manifest,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign asset';
      logger.error('Failed to sign asset', error, { inputPath });
      return {
        success: false,
        inputPath,
        outputPath: options.outputPath || this.generateOutputPath(inputPath),
        error: errorMessage,
      };
    }
  }

  /**
   * Generate output path with -signed suffix
   */
  private generateOutputPath(inputPath: string): string {
    const lastDot = inputPath.lastIndexOf('.');
    if (lastDot === -1) return `${inputPath}-signed`;
    
    const basePath = inputPath.substring(0, lastDot);
    const ext = inputPath.substring(lastDot);
    return `${basePath}-signed${ext}`;
  }
}

/**
 * Create a new instance of C2PAService
 */
export function createC2PAService(): C2PAService {
  return new C2PAService();
}
