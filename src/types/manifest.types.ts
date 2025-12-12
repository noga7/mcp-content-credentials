/**
 * Domain types for Content Credentials manifest data
 */

/**
 * C2PA operation result with raw manifest JSON from c2pa-node
 */
export interface C2PAResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** Whether C2PA credentials were found in the file */
  hasCredentials: boolean;

  /** Complete C2PA manifest JSON */
  manifest?: Record<string, unknown>;

  /** TrustMark watermark data if detected */
  trustMarkData?: TrustMarkWatermarkData;

  /** Error message if operation failed */
  error?: string;
}

/**
 * C2PA manifest type
 */
export type C2PAManifest = string | Record<string, unknown>;

/**
 * TrustMark watermark data extracted from an image
 */
export interface TrustMarkWatermarkData {
  /** The decoded identifier or payload from the watermark */
  identifier: string;

  /** The encoding schema used (BCH_SUPER, BCH_5, BCH_4, or BCH_3) */
  schema: string;

  /** Raw watermark data (100-bit payload as string) */
  raw: string;

  /** Optional URL to fetch the full C2PA manifest */
  manifestUrl?: string;
}

/**
 * Result of TrustMark watermark detection
 */
export interface TrustMarkResult {
  /** Whether the detection operation completed successfully */
  success: boolean;

  /** Whether a TrustMark watermark was detected */
  hasWatermark: boolean;

  /** Decoded watermark data if found */
  watermarkData?: TrustMarkWatermarkData;

  /** Error message if detection failed */
  error?: string;
}

/**
 * Options for signing an asset
 */
export interface SignAssetOptions {
  /** Optional output path (defaults to input-signed.ext) */
  outputPath?: string;
  
  /** Custom manifest definition (required for now) */
  manifest: Record<string, unknown>;
  
  /** Optional signing credentials (uses test certs if not provided) */
  signingCert?: string;
  privateKey?: string;
  tsaUrl?: string;
}

/**
 * Result of signing an asset
 */
export interface SignAssetResult {
  /** Whether signing completed successfully */
  success: boolean;
  
  /** Path to the input file */
  inputPath: string;
  
  /** Path to the signed output file */
  outputPath: string;
  
  /** The manifest that was signed */
  manifest?: Record<string, unknown>;
  
  /** Error message if signing failed */
  error?: string;
}

