#!/usr/bin/env node

/**
 * MCP Content Credentials Server
 *
 * This server provides tools for reading Content Credentials from
 * images and media files using the c2patool command-line utility.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createC2PAService } from './c2pa-service.js';
import { createLogger } from './logger.js';
import { SERVER_INFO } from './constants.js';
import type {
  ReadCredentialsFileParams,
  ReadCredentialsUrlParams,
  C2PAResult,
} from './types/index.js';

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
              description: 'Absolute or relative path to the file to check for Content Credentials',
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
 * Format a C2PA result for MCP response
 */
function formatResult(result: C2PAResult): string {
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
