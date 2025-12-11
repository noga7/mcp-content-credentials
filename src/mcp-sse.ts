#!/usr/bin/env node

/**
 * MCP Server with SSE (Server-Sent Events) Transport
 * 
 * This version uses HTTP/SSE transport instead of stdio,
 * allowing ChatGPT and other web services to connect to it.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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
import { formatForChatGPT } from './chatgpt-formatter.js';
import express from 'express';
import cors from 'cors';

const logger = createLogger('mcp-sse-server');
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
          '\n\nFORMATTING REQUIREMENTS - FOLLOW EXACTLY:\n' +
          'For SPECIFIC questions (e.g., "Is this AI?"): Answer the question FIRST using the data, then offer to share full details.\n' +
          'For GENERAL questions: Present sections with headers and bullet points:\n' +
          '1. **Who this comes from** - Use BULLET POINTS (•). Put LinkedIn verified identities FIRST. SKIP this entire section if no identity data.\n' +
          '2. **About this content** - List actions, highlight AI usage. EXCLUDE "c2pa.opened" actions.\n' +
          '3. **About these Content Credentials** - Signer and timestamp.\n' +
          '4. **Validation info** - Certificate and trust status.\n' +
          'If NO credentials found: Explain clearly that the file has no Content Credentials and what that means.',
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
          '\n\nFORMATTING REQUIREMENTS - FOLLOW EXACTLY:\n' +
          'For SPECIFIC questions (e.g., "Is this AI?"): Answer the question FIRST using the data, then offer to share full details.\n' +
          'For GENERAL questions: Present sections with headers and bullet points:\n' +
          '1. **Who this comes from** - Use BULLET POINTS (•). Put LinkedIn verified identities FIRST. SKIP this entire section if no identity data.\n' +
          '2. **About this content** - List actions, highlight AI usage. EXCLUDE "c2pa.opened" actions.\n' +
          '3. **About these Content Credentials** - Signer and timestamp.\n' +
          '4. **Validation info** - Certificate and trust status.\n' +
          'If NO credentials found: Explain clearly that the file has no Content Credentials and what that means.',
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
 * Format a C2PA result for MCP response (optimized for ChatGPT Apps)
 */
function formatResult(result: C2PAResult): string {
  // Use ChatGPT-optimized formatting
  return formatForChatGPT(result);
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
 * Create Express app for SSE transport
 */
const app = express();
// Use PORT from environment (Render, Heroku, etc.) or MCP_PORT, fallback to 3001
const PORT = process.env.PORT || process.env.MCP_PORT || 3001;

// Store active transports by session ID
const activeTransports = new Map<string, SSEServerTransport>();

app.use(cors());
app.use(express.json());

/**
 * Root endpoint - Information
 */
app.get('/', (_req, res) => {
  res.json({
    name: 'MCP Content Credentials Server',
    version: SERVER_INFO.version,
    transport: 'SSE (Server-Sent Events)',
    description: 'MCP server for reading Content Credentials from images and videos',
    endpoints: {
      'GET /': 'This information page',
      'GET /health': 'Health check',
      'GET /mcp': 'MCP SSE endpoint (use this in ChatGPT Apps)',
      'POST /message': 'MCP message handler'
    },
    usage: {
      chatgpt: 'In ChatGPT Apps, use: https://your-url.ngrok-free.app/mcp',
      health: 'Test connection: https://your-url.ngrok-free.app/health'
    }
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mcp-content-credentials',
    version: SERVER_INFO.version,
    transport: 'sse',
    timestamp: new Date().toISOString()
  });
});

/**
 * MCP SSE endpoint (ChatGPT Apps standard)
 */
app.get('/mcp', async (req, res) => {
  logger.info('New MCP SSE connection');
  
  try {
    // Create a unique session ID for this connection
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a new transport - it will set its own headers
    const transport = new SSEServerTransport(`/message?session=${sessionId}`, res);
    
    // Store the transport
    activeTransports.set(sessionId, transport);
    
    // Connect the server to this transport
    await server.connect(transport);
    
    logger.info('MCP transport connected successfully', { sessionId });
    
    // Handle connection close
    req.on('close', () => {
      logger.info('MCP SSE connection closed', { sessionId });
      activeTransports.delete(sessionId);
    });
    
    req.on('error', (error) => {
      logger.error('SSE connection error', error);
      activeTransports.delete(sessionId);
    });
    
  } catch (error) {
    logger.error('Error setting up MCP SSE transport', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish MCP connection' });
    }
  }
});

/**
 * Legacy /sse endpoint (redirect to /mcp)
 */
app.get('/sse', (_req, res) => {
  res.redirect(301, '/mcp');
});

/**
 * Message endpoint for MCP
 */
app.post('/message', async (req, res) => {
  const sessionId = req.query.session as string;
  
  logger.info('Received message at /message', { 
    sessionId,
    method: req.body?.method,
    hasBody: !!req.body
  });
  
  if (!sessionId) {
    logger.error('No session ID provided in message');
    return res.status(400).json({ error: 'Missing session ID' });
  }
  
  const transport = activeTransports.get(sessionId);
  
  if (!transport) {
    logger.error('No active transport for session', { sessionId });
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    // Pass the message to the transport with the already-parsed body
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    logger.error('Error handling message', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
});

/**
 * Start server
 */
const httpServer = app.listen(PORT, () => {
  logger.info(`🚀 MCP Server (SSE) running on http://localhost:${PORT}`);
  logger.info(`🔧 Health check: http://localhost:${PORT}/health`);
  logger.info(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`\n✅ MCP Server ready! Use this URL in ChatGPT: http://localhost:${PORT}/mcp\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    process.exit(0);
  });
});

