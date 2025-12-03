/**
 * Application constants and configuration
 */

/**
 * Maximum buffer size for c2patool output (10MB)
 */
export const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

/**
 * Temporary file prefix for downloaded files
 */
export const TEMP_FILE_PREFIX = 'c2pa_';

/**
 * Indicators that a file has no C2PA credentials
 */
export const NO_CREDENTIALS_INDICATORS = ['No claim found', 'No manifest found'] as const;

/**
 * Supported file extensions (for reference/documentation)
 */
export const SUPPORTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'tiff',
  'tif',
  'avif',
  'mp4',
] as const;

/**
 * HTTP timeout for downloads (30 seconds)
 */
export const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Server metadata
 */
export const SERVER_INFO = {
  name: 'mcp-content-credentials',
  version: '1.0.0',
  description: 'MCP server for reading Content Credentials',
} as const;
