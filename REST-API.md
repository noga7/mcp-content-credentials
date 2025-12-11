# REST API Documentation

This REST API provides HTTP access to the Content Credentials verification functionality, making it accessible to ChatGPT custom GPTs and other web services.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Start the REST API Server

```bash
npm run start:api
```

Or for development with auto-reload:

```bash
npm run dev:api
```

The server will start on `http://localhost:3000` by default.

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Verify an image
curl "http://localhost:3000/verify-url?url=https://example.com/image.jpg"
```

## Endpoints

### `GET /`
API documentation and available endpoints.

**Response:**
```json
{
  "name": "Content Credentials API",
  "version": "1.0.0",
  "description": "REST API for reading C2PA Content Credentials",
  "endpoints": { ... }
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "content-credentials-api",
  "version": "1.0.0",
  "timestamp": "2025-12-11T10:00:00.000Z"
}
```

### `GET /.well-known/openapi.json`
OpenAPI 3.0 schema for ChatGPT integration.

**Response:** Full OpenAPI specification

### `GET /verify-url`
Verify Content Credentials from a URL (query parameter).

**Parameters:**
- `url` (query, required): The URL of the image or video to verify

**Example:**
```bash
curl "http://localhost:3000/verify-url?url=https://example.com/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "hasCredentials": true,
  "manifestData": {
    "whoThisComesFrom": { ... },
    "aboutThisContent": { ... },
    "aboutTheseCredentials": { ... },
    "validationInfo": { ... }
  }
}
```

### `POST /verify-url`
Verify Content Credentials from a URL (JSON body).

**Body:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/verify-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/image.jpg"}'
```

**Response:** Same as GET `/verify-url`

## ChatGPT Integration

### Using with ChatGPT Custom GPTs

1. **Start the server:**
   ```bash
   npm run start:api
   ```

2. **In ChatGPT GPT Builder:**
   - Go to "Configure" → "Actions"
   - Click "Create new action"
   - Import schema from: `http://localhost:3000/.well-known/openapi.json`
   - **Or** copy/paste the OpenAPI schema directly

3. **Important:** ChatGPT needs to be able to reach your local server:
   - Use a tunneling service like **ngrok** to expose your local server
   - Or deploy to a public server (Render, Railway, Heroku, etc.)

### Using ngrok (Recommended for Testing)

```bash
# Install ngrok
brew install ngrok

# Start your API server
npm run start:api

# In another terminal, create a tunnel
ngrok http 3000
```

ngrok will give you a public URL like `https://abc123.ngrok.io`. Use this URL in ChatGPT instead of `http://localhost:3000`.

## Response Format

### Success Response (with credentials)

```json
{
  "success": true,
  "hasCredentials": true,
  "manifestData": {
    "whoThisComesFrom": {
      "linkedInIdentity": {
        "name": "John Doe",
        "profileUrl": "https://linkedin.com/in/johndoe",
        "verified": true
      },
      "otherIdentities": [
        {
          "name": "Adobe Firefly",
          "socialAccounts": ["@adobe"]
        }
      ]
    },
    "aboutThisContent": {
      "actions": [
        {
          "action": "c2pa.created",
          "softwareAgent": "Adobe Firefly",
          "when": "2024-12-11T10:00:00Z"
        }
      ],
      "genAIInfo": {
        "generative": true,
        "training": false,
        "model": "Adobe Firefly Image 3"
      }
    },
    "aboutTheseCredentials": {
      "claimSigner": "Adobe Inc.",
      "timestamp": "2024-12-11T10:00:00Z"
    },
    "validationInfo": {
      "certificate": {
        "issuer": "ContentAuthenticity",
        "serialNumber": "abc123"
      },
      "trustInfo": {
        "isValid": true
      }
    }
  }
}
```

### Success Response (no credentials)

```json
{
  "success": true,
  "hasCredentials": false
}
```

### Error Response

```json
{
  "success": false,
  "hasCredentials": false,
  "error": "Invalid URL format"
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)

## Deployment

### Deploy to Render.com

1. Create a `render.yaml`:
   ```yaml
   services:
     - type: web
       name: content-credentials-api
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm run start:api
   ```

2. Connect your GitHub repo to Render
3. Deploy!

### Deploy to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

### Deploy to Heroku

```bash
heroku create your-app-name
git push heroku main
```

## Security Considerations

- This API only supports URL-based verification (no file uploads)
- CORS is enabled for all origins (configure as needed)
- Input validation on all endpoints
- No authentication by default (add as needed for production)

## Limitations

- **Local files:** This API cannot verify local files (by design, for security)
- **URL-only:** Images must be accessible via HTTP/HTTPS URLs
- **Dependencies:** Requires c2patool and TrustMark to be installed

## Support

For issues or questions:
- GitHub: https://github.com/noga7/mcp-content-credentials
- Issues: https://github.com/noga7/mcp-content-credentials/issues

