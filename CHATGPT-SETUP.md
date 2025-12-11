# ChatGPT Apps Integration Guide

## You Now Have TWO Servers Running:

1. **REST API Server** (port 3000) - For web apps and standard HTTP requests
2. **MCP SSE Server** (port 3001) - For ChatGPT Apps and MCP clients

## For ChatGPT Apps (Settings > Apps & Connectors)

### Step 1: Expose MCP Server with ngrok

In a **new terminal window**, run:

```bash
ngrok http 3001
```

You'll see output like:

```
Forwarding   https://abc-123-xyz.ngrok-free.app -> http://localhost:3001
```

### Step 2: Use the ngrok URL in ChatGPT

1. Go to **ChatGPT** → **Settings** → **Apps & Connectors**
2. Click **"Create app"**
3. When prompted for **"MCP Server URL"**, enter:

```
https://YOUR-NGROK-URL.ngrok-free.app/sse
```

**Important:** Make sure to include `/sse` at the end!

Example: `https://abc-123-xyz.ngrok-free.app/sse`

### Step 3: Complete Setup

Follow the remaining prompts in ChatGPT to:
- Name your app
- Set permissions (if asked)
- Test the connection

## What Each Server Does

### MCP SSE Server (Port 3001)
- **Protocol:** MCP (Model Context Protocol) over Server-Sent Events
- **For:** ChatGPT Apps, Claude Desktop (future), other MCP clients
- **Endpoint:** `/sse`
- **URL:** Use with ngrok for ChatGPT

### REST API Server (Port 3000)  
- **Protocol:** Standard HTTP REST API
- **For:** Custom web apps, direct HTTP integration
- **Endpoint:** `/verify-url`
- **URL:** Use with ngrok or deploy to cloud

## Currently Running

✅ REST API Server: `http://localhost:3000`
✅ MCP SSE Server: `http://localhost:3001`

Both servers are running in the background!

## Test Your MCP Server

Health check:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "mcp-content-credentials",
  "version": "1.0.0",
  "transport": "sse"
}
```

## Troubleshooting

### ngrok command not found
```bash
brew install ngrok
```

### Connection refused in ChatGPT
- Make sure MCP server is running (check above)
- Make sure ngrok is running and pointing to port 3001
- Make sure you included `/sse` at the end of the URL
- Try the health check URL first: `https://YOUR-URL.ngrok-free.app/health`

### Port already in use
- The servers use different ports (3000 and 3001)
- If 3001 is busy, stop the MCP server and restart it

## Stop the Servers

To stop either server, find its terminal and press `Ctrl+C`

Or list running processes:
```bash
lsof -ti:3000  # REST API
lsof -ti:3001  # MCP SSE
```

Kill a process:
```bash
kill -9 $(lsof -ti:3001)
```

