/**
 * Request parameter types for MCP tools
 */

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
