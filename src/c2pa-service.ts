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
      
      const c2paNode = await getC2PANode();
      
      if (!c2paNode.Builder || !c2paNode.LocalSigner) {
        throw new Error('c2pa-node Builder or LocalSigner not available');
      }
      
      // Load certificates from files or use provided ones
      let certBuffer: Buffer;
      let keyBuffer: Buffer;
      
      if (options.signingCert && options.privateKey) {
        // Use provided certificates
        certBuffer = Buffer.from(options.signingCert);
        keyBuffer = Buffer.from(options.privateKey);
      } else {
        // Load test certificates from files
        // Use import.meta.url to resolve paths relative to this module
        const fs = await import('fs/promises');
        const { fileURLToPath } = await import('url');
        const { dirname, join } = await import('path');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        
        // Certificates are in project root, one level up from build/
        const certPath = join(__dirname, '..', 'certs', 'es256.pub');
        const keyPath = join(__dirname, '..', 'certs', 'es256.pem');
        
        [certBuffer, keyBuffer] = await Promise.all([
          fs.readFile(certPath),
          fs.readFile(keyPath)
        ]);
      }
      
      const tsaUrl = options.tsaUrl || TEST_TSA_URL;
      
      // Create local signer using factory method
      const signer = c2paNode.LocalSigner.newSigner(
        certBuffer,
        keyBuffer,
        'es256',
        tsaUrl
      );
      
      // Create builder from JSON manifest
      const builder = c2paNode.Builder.withJson(options.manifest);
      
      // Set intent to "edit" - this workflow uses the source file as parent
      builder.setIntent('edit');
      
      // Add parent ingredient (source file) - this creates the c2pa.created assertion automatically
      const ingredientJson = JSON.stringify({
        title: inputPath.split('/').pop() || 'Parent Image',
        format: this.getMimeType(inputPath),
        relationship: 'parentOf',
      });
      
      await builder.addIngredient(
        ingredientJson,
        { path: inputPath, mimeType: this.getMimeType(inputPath) }
      );
      
      // When intent is "edit", automatically add c2pa.opened action first
      // This satisfies the C2PA requirement that edit workflows start with opened/created
      const openedAction = JSON.stringify({
        action: 'c2pa.opened',
        when: new Date().toISOString(),
        parameters: {
          ingredient: {
            url: 'self#jumbf=c2pa.assertions/c2pa.ingredient.v3',
            hash: '', // Will be filled by c2pa-rs
          }
        }
      });
      await builder.addAction(openedAction);
      
      // Sign the asset
      const result = await builder.signFile(
        signer,
        inputPath,
        { path: outputPath }
      );
      
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
