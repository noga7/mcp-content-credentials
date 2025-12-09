/**
 * Request parameter types for MCP tool calls
 */

/**
 * Parameters for read_credentials_file tool
 */
export interface ReadCredentialsFileParams {
  filePath: string;
}

/**
 * Parameters for read_credentials_url tool
 */
export interface ReadCredentialsUrlParams {
  url: string;
}
