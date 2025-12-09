/**
 * Request parameter types for MCP tools
 */

/**
 * Input parameters for reading credentials from a file
 */
export interface ReadCredentialsFileParams {
  /** Path to file on filesystem (optional if fileData provided) */
  filePath?: string;
  /** Base64-encoded file data for uploaded files (optional if filePath provided) */
  fileData?: string;
  /** Original filename when using fileData (required with fileData) */
  fileName?: string;
}

/**
 * Input parameters for reading credentials from a URL
 */
export interface ReadCredentialsUrlParams {
  url: string;
}
