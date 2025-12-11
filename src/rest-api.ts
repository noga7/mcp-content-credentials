#!/usr/bin/env node

/**
 * REST API Server for Content Credentials
 * 
 * This provides an HTTP REST API wrapper around the MCP Content Credentials
 * functionality, making it accessible via HTTP endpoints.
 */

import express from 'express';
import cors from 'cors';
import { createC2PAService } from './c2pa-service.js';
import { createLogger } from './logger.js';
import type { C2PAResult } from './types/index.js';

const logger = createLogger('rest-api');
const c2paService = createC2PAService();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.get('user-agent') 
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'content-credentials-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint - API documentation
 */
app.get('/', (_req, res) => {
  res.json({
    name: 'Content Credentials API',
    version: '1.0.0',
    description: 'REST API for reading C2PA Content Credentials from images and videos',
    endpoints: {
      'GET /health': 'Health check',
      'GET /': 'API documentation',
      'GET /.well-known/openapi.json': 'OpenAPI schema for ChatGPT',
      'POST /verify-url': 'Verify Content Credentials from a URL',
      'GET /verify-url': 'Verify Content Credentials from a URL (query param)'
    },
    examples: {
      'Verify URL (POST)': {
        method: 'POST',
        url: '/verify-url',
        body: { url: 'https://example.com/image.jpg' }
      },
      'Verify URL (GET)': {
        method: 'GET',
        url: '/verify-url?url=https://example.com/image.jpg'
      }
    },
    documentation: 'https://github.com/noga7/mcp-content-credentials'
  });
});

/**
 * OpenAPI schema endpoint (for ChatGPT)
 */
app.get('/.well-known/openapi.json', (_req, res) => {
  const openApiSchema = {
    openapi: '3.0.0',
    info: {
      title: 'Content Credentials API',
      description: 'Verify C2PA Content Credentials in images and videos. Checks for authenticity, provenance, and AI generation metadata.',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local development server'
      }
    ],
    paths: {
      '/verify-url': {
        get: {
          operationId: 'verifyContentCredentials',
          summary: 'Verify Content Credentials from a URL',
          description: 'Check if an image or video has C2PA Content Credentials. Returns information about who created it, how it was made, and whether AI was involved.',
          parameters: [
            {
              name: 'url',
              in: 'query',
              required: true,
              description: 'The URL of the image or video to verify',
              schema: {
                type: 'string',
                format: 'uri',
                example: 'https://example.com/image.jpg'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Verification result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        description: 'Whether the verification was successful'
                      },
                      hasCredentials: {
                        type: 'boolean',
                        description: 'Whether Content Credentials were found'
                      },
                      manifestData: {
                        type: 'object',
                        description: 'Parsed Content Credentials data',
                        properties: {
                          whoThisComesFrom: {
                            type: 'object',
                            description: 'Identity information about the creator'
                          },
                          aboutThisContent: {
                            type: 'object',
                            description: 'Information about how the content was created',
                            properties: {
                              actions: {
                                type: 'array',
                                description: 'Actions taken on the content'
                              },
                              genAIInfo: {
                                type: 'object',
                                description: 'AI generation information'
                              }
                            }
                          },
                          aboutTheseCredentials: {
                            type: 'object',
                            description: 'Credential metadata'
                          },
                          validationInfo: {
                            type: 'object',
                            description: 'Certificate and validation details'
                          }
                        }
                      },
                      trustMarkData: {
                        type: 'object',
                        description: 'Watermark data if found'
                      },
                      error: {
                        type: 'string',
                        description: 'Error message if verification failed'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request'
            },
            '500': {
              description: 'Server error'
            }
          }
        },
        post: {
          operationId: 'verifyContentCredentialsPost',
          summary: 'Verify Content Credentials from a URL (POST)',
          description: 'Check if an image or video has C2PA Content Credentials. Returns information about who created it, how it was made, and whether AI was involved.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: {
                      type: 'string',
                      format: 'uri',
                      description: 'The URL of the image or video to verify',
                      example: 'https://example.com/image.jpg'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Verification result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      hasCredentials: {
                        type: 'boolean'
                      },
                      manifestData: {
                        type: 'object'
                      },
                      error: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  
  res.json(openApiSchema);
});

/**
 * POST /verify-url
 * Verify Content Credentials from a URL
 */
app.post('/verify-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Missing required parameter: url'
      });
    }

    if (typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Parameter url must be a string'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Invalid URL format'
      });
    }

    // Only allow http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'URL must use http:// or https:// protocol'
      });
    }

    logger.info('Verifying credentials from URL', { url });
    const result: C2PAResult = await c2paService.readCredentialsFromUrl(url);

    res.json(result);
  } catch (error) {
    logger.error('Error verifying URL', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      hasCredentials: false,
      error: errorMessage
    });
  }
});

/**
 * GET /verify-url
 * Verify Content Credentials from a URL (query parameter version)
 */
app.get('/verify-url', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Missing required query parameter: url'
      });
    }

    if (typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Query parameter url must be a string'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'Invalid URL format'
      });
    }

    // Only allow http/https URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        hasCredentials: false,
        error: 'URL must use http:// or https:// protocol'
      });
    }

    logger.info('Verifying credentials from URL', { url });
    const result: C2PAResult = await c2paService.readCredentialsFromUrl(url);

    res.json(result);
  } catch (error) {
    logger.error('Error verifying URL', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      hasCredentials: false,
      error: errorMessage
    });
  }
});

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist. Visit / for available endpoints.'
  });
});

/**
 * Error handler
 */
app.use((err: Error, _req: express.Request, _res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  _res.status(500).json({
    success: false,
    hasCredentials: false,
    error: err.message || 'Internal Server Error'
  });
});

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  logger.info(`🚀 REST API server running on http://localhost:${PORT}`);
  logger.info(`📋 API docs: http://localhost:${PORT}/`);
  logger.info(`🔧 Health check: http://localhost:${PORT}/health`);
  logger.info(`📄 OpenAPI schema: http://localhost:${PORT}/.well-known/openapi.json`);
  console.log(`\n✅ Server ready! Use this URL in ChatGPT: http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

