/**
 * Centralized type exports
 * All types are re-exported from this file for convenient importing
 */

// Manifest types
export type {
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
  C2PANodeError,
} from './errors.js';
