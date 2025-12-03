/**
 * Parsed C2PA manifest data with structured information
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
 * Input parameters for reading credentials from a file
 */
export interface ReadCredentialsFileParams {
  filePath: string;
}

/**
 * Input parameters for reading credentials from a URL
 */
export interface ReadCredentialsUrlParams {
  url: string;
}

/**
 * Custom error types for better error handling
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

export class FileNotFoundError extends C2PAError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', { filePath });
    this.name = 'FileNotFoundError';
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

export class InvalidUrlError extends C2PAError {
  constructor(url: string) {
    super(`Invalid URL: ${url}`, 'INVALID_URL', { url });
    this.name = 'InvalidUrlError';
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

export class DownloadError extends C2PAError {
  constructor(url: string, statusCode?: number) {
    super(`Failed to download file from URL: ${url}`, 'DOWNLOAD_ERROR', { url, statusCode });
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

export class C2PToolError extends C2PAError {
  constructor(message: string, stderr?: string) {
    super(`c2patool error: ${message}`, 'C2PATOOL_ERROR', { stderr });
    this.name = 'C2PToolError';
    Object.setPrototypeOf(this, C2PToolError.prototype);
  }
}
