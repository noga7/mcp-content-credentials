#!/usr/bin/env node

/**
 * MCP Content Credentials Server
 *
 * This server provides tools for reading Content Credentials from
 * images and media files using the c2pa-node library.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createC2PAService } from './c2pa-service.js';
import { createLogger } from './logger.js';
import { SERVER_INFO } from './constants.js';
import type {
  ReadCredentialsFileParams,
  ReadCredentialsUrlParams,
  C2PAResult,
} from './types/index.js';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import os from 'os';
import { formatTrustMarkData } from './parsers/trustmark-parser.js';

const logger = createLogger('mcp-server');
const c2paService = createC2PAService();

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * Handler: List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, () => {
  logger.debug('Received ListTools request');

  return {
    tools: [
      {
        name: 'read_credentials_file',
        description:
          'Read Content Credentials from a local file. USE THIS TOOL when the user drops a file or provides a file path AND asks questions like: "who made this", "how was this made", "where does this come from", "is this AI", "is this real", "does this have Content Credentials", "what are the c2pa details", or mentions "c2pa" or "Content Credentials". ' +
          'If the user asks a SPECIFIC question (e.g., "Is this AI?"), answer their question directly using the relevant data, then offer to share more details from the Content Credentials. ' +
          'If the user asks GENERALLY about the file or its credentials, present the information in this order (SKIP sections that have no data): 1) Who this comes from (use BULLET POINTS, prioritize LinkedIn verified identities at the top - OMIT THIS ENTIRE SECTION if no CAWG or personal identity is found), 2) About this content (actions taken - EXCLUDE "c2pa.opened" actions unless specifically requested), 3) About these Content Credentials (signer and timestamp), 4) Validation info (certificate details).',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description:
                'Absolute or relative path to the file to check for Content Credentials. Supports all filesystem characters including periods, numbers, dashes, underscores, and spaces. Examples: /path/to/file-name.jpg, /mnt/data/image 2.png, ./my-file.2024-01.jpg',
            },
          },
          required: ['filePath'],
        },
      },
      {
        name: 'read_credentials_url',
        description:
          'Read Content Credentials from a file at a URL. USE THIS TOOL when the user provides a URL AND asks questions like: "who made this", "how was this made", "where does this come from", "is this AI", "is this real", "does this have Content Credentials", "what are the c2pa details", or mentions "c2pa" or "Content Credentials". Downloads the file temporarily, checks for embedded C2PA manifests, then cleans up. ' +
          'If the user asks a SPECIFIC question (e.g., "Is this AI?"), answer their question directly using the relevant data, then offer to share more details from the Content Credentials. ' +
          'If the user asks GENERALLY about the file or its credentials, present the information in this order (SKIP sections that have no data): 1) Who this comes from (use BULLET POINTS, prioritize LinkedIn verified identities at the top - OMIT THIS ENTIRE SECTION if no CAWG or personal identity is found), 2) About this content (actions taken - EXCLUDE "c2pa.opened" actions unless specifically requested), 3) About these Content Credentials (signer and timestamp), 4) Validation info (certificate details).',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTP or HTTPS URL of the file to check for Content Credentials',
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

/**
 * Helper: Get image files from a directory
 */
async function getImageFiles(dirPath: string, maxDepth: number = 1): Promise<string[]> {
  const mediaExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.tiff',
    '.avif',
    '.heic',
    '.mp4',
    '.mov',
  ];
  const files: string[] = [];

  async function scan(dir: string, depth: number) {
    if (depth > maxDepth) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isFile()) {
          const ext = entry.name.toLowerCase().match(/\.[^.]+$/)?.[0];
          if (ext && mediaExtensions.includes(ext)) {
            files.push(fullPath);
          }
        } else if (entry.isDirectory() && depth < maxDepth) {
          await scan(fullPath, depth + 1);
        }
      }
    } catch {
      // Ignore permission errors or errors accessing directory
    }
  }

  await scan(dirPath, 0);
  return files.sort();
}

/**
 * Handler: List available resources (filesystem access)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.debug('Received ListResources request');

  const homeDir = os.homedir();
  const commonDirs = [
    join(homeDir, 'Desktop'),
    join(homeDir, 'Downloads'),
    join(homeDir, 'Documents'),
    join(homeDir, 'Pictures'),
  ];

  const resources = [];

  // Add common directories as browsable resources
  for (const dir of commonDirs) {
    try {
      await stat(dir);
      resources.push({
        uri: `file://${dir}`,
        name: `📁 ${dir.split('/').pop()} (${dir})`,
        description: `Browse images and videos in ${dir}`,
        mimeType: 'application/x-directory',
      });
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return { resources };
});

/**
 * Handler: Read a resource (file or directory listing)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  logger.debug('Received ReadResource request', { uri });

  if (!uri.startsWith('file://')) {
    throw new Error('Only file:// URIs are supported');
  }

  const filePath = uri.replace('file://', '');
  const resolvedPath = resolve(filePath);

  try {
    const stats = await stat(resolvedPath);

    if (stats.isDirectory()) {
      // Return list of images in directory
      const imageFiles = await getImageFiles(resolvedPath, 1);

      const contents = imageFiles
        .slice(0, 50) // Limit to 50 files
        .map((file) => `- ${file}`)
        .join('\n');

      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Images and videos in ${resolvedPath}:\n\n${contents}\n\n${imageFiles.length > 50 ? `(Showing first 50 of ${imageFiles.length} files)` : `(${imageFiles.length} total files)`}\n\nTo check credentials, use read_credentials_file with the full path.`,
          },
        ],
      };
    } else if (stats.isFile()) {
      // Check Content Credentials for this file
      logger.info('Checking credentials for resource', { filePath: resolvedPath });
      const result = await c2paService.readCredentialsFromFile(resolvedPath);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else {
      throw new Error('Resource is neither a file nor a directory');
    }
  } catch (error) {
    logger.error('Failed to read resource', error, { uri });
    throw new Error(
      `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Format a C2PA result for MCP response
 */
function formatResult(result: C2PAResult): string {
  // If we have TrustMark data, format it in a user-friendly way
  if (result.success && result.hasCredentials && result.trustMarkData) {
    const formattedTrustMark = formatTrustMarkData(result.trustMarkData);
    
    // Return formatted text along with raw JSON
    return `${formattedTrustMark}\n\n=== Raw Data (JSON) ===\n${JSON.stringify(result, null, 2)}`;
  }
  
  // For embedded C2PA or no credentials, return JSON
  return JSON.stringify(result, null, 2);
}

/**
 * Handler: Execute tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Received tool call', { tool: name });

  try {
    switch (name) {
      case 'read_credentials_file': {
        const params = args as Partial<ReadCredentialsFileParams>;
        const { filePath } = params;

        if (!filePath) {
          throw new Error('Missing required parameter: filePath');
        }

        logger.debug('Processing read_credentials_file', { filePath });
        const result = await c2paService.readCredentialsFromFile(filePath);

        return {
          content: [
            {
              type: 'text',
              text: formatResult(result),
            },
          ],
        };
      }

      case 'read_credentials_url': {
        const params = args as Partial<ReadCredentialsUrlParams>;
        const { url } = params;

        if (!url) {
          throw new Error('Missing required parameter: url');
        }

        logger.debug('Processing read_credentials_url', { url });
        const result = await c2paService.readCredentialsFromUrl(url);

        return {
          content: [
            {
              type: 'text',
              text: formatResult(result),
            },
          ],
        };
      }

      default: {
        const errorMsg = `Unknown tool: ${name}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  } catch (error: unknown) {
    logger.error('Tool execution failed', error, { tool: name });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    const errorResult: C2PAResult = {
      success: false,
      hasCredentials: false,
      error: errorMessage,
    };

    return {
      content: [
        {
          type: 'text',
          text: formatResult(errorResult),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the MCP server
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting MCP Content Credentials Server', {
      version: SERVER_INFO.version,
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('MCP Content Credentials Server running on stdio');
  } catch (error) {
    logger.error('Failed to start server', error);
    throw error;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Fatal error in main()', error);
  process.exit(1);
});
