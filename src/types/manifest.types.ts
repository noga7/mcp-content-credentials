/**
 * Domain types for Content Credentials manifest data
 */

/**
 * LinkedIn verified identity
 */
export interface LinkedInIdentity {
  name: string;
  profileUrl: string;
  verified: boolean;
}

/**
 * Creator/identity information
 */
export interface CreatorIdentity {
  name?: string;
  identifier?: string;
  socialAccounts?: string[];
}

/**
 * Who this comes from section
 */
export interface WhoThisComesFrom {
  linkedInIdentity?: LinkedInIdentity;
  otherIdentities?: CreatorIdentity[];
}

/**
 * Action taken on the content
 */
export interface ContentAction {
  action: string;
  softwareAgent?: string;
  when?: string;
  parameters?: Record<string, unknown>;
}

/**
 * About this content section
 */
export interface AboutThisContent {
  actions?: ContentAction[];
  genAIInfo?: {
    generative?: boolean;
    training?: boolean;
    model?: string;
    version?: string;
  };
}

/**
 * About these Content Credentials section
 */
export interface AboutTheseCredentials {
  claimSigner?: string;
  timestamp?: string;
  signedBy?: string;
}

/**
 * Validation information section
 */
export interface ValidationInfo {
  certificate?: {
    issuer?: string;
    subject?: string;
    serialNumber?: string;
    validFrom?: string;
    validUntil?: string;
  };
  trustInfo?: string[];
}

/**
 * Structured manifest data with proper information hierarchy
 */
export interface ParsedManifestData {
  whoThisComesFrom?: WhoThisComesFrom;
  aboutThisContent?: AboutThisContent;
  aboutTheseCredentials?: AboutTheseCredentials;
  validationInfo?: ValidationInfo;
  rawManifest?: string;
}

/**
 * Enhanced C2PA result with parsed manifest data
 */
export interface C2PAResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** Whether C2PA credentials were found in the file */
  hasCredentials: boolean;

  /** Parsed manifest data with structured information */
  manifestData?: ParsedManifestData;

  /** TrustMark watermark data if detected */
  trustMarkData?: TrustMarkWatermarkData;

  /** Error message if operation failed */
  error?: string;

  /** Raw output from c2patool for debugging */
  rawOutput?: string;
}

/**
 * Original C2PA manifest type (kept for compatibility)
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
