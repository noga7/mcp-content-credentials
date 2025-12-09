/**
 * Centralized type exports
 * All types are re-exported from this file for convenient importing
 */

// Manifest types
export type {
  LinkedInIdentity,
  CreatorIdentity,
  WhoThisComesFrom,
  ContentAction,
  AboutThisContent,
  AboutTheseCredentials,
  ValidationInfo,
  ParsedManifestData,
  C2PAResult,
  C2PAManifest,
  TrustMarkWatermarkData,
  TrustMarkResult,
} from './manifest.types.js';

// Request types
export type { ReadCredentialsFileParams, ReadCredentialsUrlParams } from './request.types.js';

// Error types
export {
  C2PAError,
  FileNotFoundError,
  InvalidUrlError,
  DownloadError,
  DownloadTimeoutError,
  C2PToolError,
} from './errors.js';
