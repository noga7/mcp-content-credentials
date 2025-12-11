# MCP Content Credentials Server

MCP (Model Context Protocol) server for reading C2PA Content Credentials from images and videos. Detects credentials from both embedded manifests and invisible watermarks.

## Features

- 🔍 **Embedded C2PA Detection** - Read manifests from file metadata
- 🌊 **TrustMark Watermark Detection** - Detect credentials in image pixels (survives social media!)
- 🌐 **URL Support** - Check credentials from web URLs
- 📂 **Direct Filesystem Access** - Claude can browse your directories
- ⚡ **Smart Detection** - Checks embedded first, watermark as fallback
- 🤖 **Automatic Installation** - Zero configuration setup
- 📋 **Structured Output** - Human-readable parsed data
- 🛡️ **Production Ready** - Full error handling and logging
- 🌐 **REST API** - HTTP endpoints for ChatGPT and web integration

## Quick Start

```bash
# 1. Clone
git clone https://github.com/noga7/mcp-content-credentials.git
cd mcp-content-credentials

# 2. Install (automatic: installs TrustMark)
npm install

# 3. Build
npm run build

# 4. Configure Claude Desktop
# Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "content-credentials": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-content-credentials/build/index.js"]
    }
  }
}

# 5. Restart Claude Desktop

# Optional: Start REST API for ChatGPT/web access
npm run start:api
# Server runs on http://localhost:3000
```

## REST API (for ChatGPT & Web Apps)

Want to use this with ChatGPT or your own web app? Start the HTTP REST API:

```bash
npm run start:api
```

The server runs on `http://localhost:3000`. See [REST-API.md](REST-API.md) for full documentation.

**For ChatGPT:** Use ngrok to expose your local server, or deploy to Render/Railway. See [REST-API.md](REST-API.md) for instructions.

```bash
# Quick test
curl "http://localhost:3000/verify-url?url=https://example.com/image.jpg"
```

## Prerequisites

- **Node.js** v18+
- **Python 3.8.5+** (for TrustMark watermarks)

**All other dependencies auto-install during `npm install`:**
- ✅ @contentauth/c2pa-node v0.4.0 (native Node.js library)
- ✅ TrustMark Python package (via pip)
- ✅ Content Credentials Verify trust list (automatic)

### Manual Installation (if auto-install fails)

```bash
# TrustMark
pip3 install trustmark Pillow

# Or retry auto-install
npm run install-deps
```

## Usage

### Check a Specific File

```
"Check content credentials in ~/Desktop/photo.jpg"
"Is this image AI-generated?"
"Who created /Users/you/Downloads/image.png?"
```

### Browse Directories

```
"What images are in my Desktop?"
"Check my Downloads for Content Credentials"
"Find AI-generated images in my Pictures"
```

### Check URLs

```
"Check credentials at https://example.com/image.jpg"
```

## How It Works

### Detection Flow

```
1. Load Trust Configuration (on startup)
   ↓
2. Check Embedded C2PA Manifest (fast: ~50ms)
   ↓
   Found? → Validate & Return immediately ✅
   ↓
3. Check TrustMark Watermark (slower: ~600ms)
   ↓
   Found? → Return watermark data ✅
   ↓
4. Neither found → "No Content Credentials found" ❌
```

### Why This Order?

- **Performance**: 80% of credentialed images have embedded manifests
- **Speed**: Skip expensive watermark check when not needed
- **Completeness**: Still catch stripped metadata via watermarks

### Trust Configuration

Automatically loads the Content Credentials Verify trust list on startup:
- ✅ Trust anchors from contentcredentials.org
- ✅ Allowed certificate list (SHA-256 hashes)
- ✅ Extended Key Usage (EKU) configuration
- ✅ Same defaults as c2patool for consistent validation

### TrustMark Watermarks

Invisible watermarks embedded in image pixels that:
- ✅ Survive JPEG compression
- ✅ Persist through social media uploads (Instagram, Twitter)
- ✅ Work after print-scan cycles
- ✅ Remain when metadata is stripped

## Supported Formats

**Images:** JPEG, PNG, WebP, GIF, TIFF, AVIF, HEIC  
**Video:** MP4, MOV

## API Response

```typescript
{
  success: boolean;
  hasCredentials: boolean;
  
  // Embedded C2PA data
  manifestData?: {
    whoThisComesFrom?: {
      linkedInIdentity?: { name, profileUrl, verified }
      otherIdentities?: [{ name, socialAccounts }]
    };
    aboutThisContent?: {
      actions?: [{ action, softwareAgent, when }]
      genAIInfo?: { generative, training, model }
    };
    aboutTheseCredentials?: { claimSigner, timestamp };
    validationInfo?: { certificate, trustInfo };
  };
  
  // Watermark data (if no embedded found)
  trustMarkData?: {
    identifier: string;    // Watermark payload
    schema: string;        // BCH_SUPER, BCH_5, etc.
    manifestUrl?: string;  // URL to full manifest
  };
  
  error?: string;
}
```

## Filesystem Access

Claude can browse these directories automatically:
- `~/Desktop`
- `~/Downloads`
- `~/Documents`
- `~/Pictures`

No need to provide exact paths! Just ask:
- "What images are in my Desktop?"
- "Check recent downloads"

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Development mode
npm run lint         # Check code quality
npm run test         # Run tests
npm run precommit    # Full quality check
```

## Architecture

```
mcp-content-credentials/
├── src/
│   ├── index.ts              # MCP server + filesystem access
│   ├── c2pa-service.ts       # Detection orchestration
│   ├── trustmark-service.ts  # Watermark detection (Python)
│   ├── parsers/              # Data formatters
│   └── types/                # TypeScript definitions
├── scripts/
│   ├── install-trustmark.cjs # Auto-installer
│   └── trustmark-decode.py   # Python watermark decoder
└── build/                    # Compiled output
```

## Troubleshooting

### "Unable to access that file"

1. **Restart Claude Desktop** (most common fix!)
2. **Use absolute paths**: `/Users/you/...` not `~/...`
3. **Verify MCP is connected**: Ask "What tools do you have?"

### "Python or TrustMark not found"

```bash
pip3 install trustmark Pillow
# or
npm run install-deps
```

### No Content Credentials Found

This is normal! The file either:
- Wasn't created with content authentication
- Had credentials removed
- Is a screenshot/copy without provenance

## Performance

- **Trust config load**: ~500ms (on startup, one-time)
- **Embedded check**: ~50ms (fast path, 80% of cases)
- **+ Watermark check**: ~600ms (fallback, 20% of cases)
- **First watermark**: ~30s (downloads ONNX model, one-time)

## Security

- ✅ Read-only filesystem access
- ✅ Limited to user directories (Desktop, Downloads, etc.)
- ✅ Input validation on all paths and URLs
- ✅ Temporary files auto-deleted
- ✅ No access to hidden/system files

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Resources

- [C2PA Specification](https://c2pa.org/specifications/)
- [c2pa-node v2](https://github.com/contentauth/c2pa-node-v2)
- [TrustMark](https://opensource.contentauthenticity.org/docs/trustmark/)
- [Content Credentials Verify](https://contentcredentials.org/verify)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
