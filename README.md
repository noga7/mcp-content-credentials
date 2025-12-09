# MCP Content Credentials Server

MCP (Model Context Protocol) server for reading C2PA Content Credentials from images and videos. Detects credentials from both embedded manifests and invisible watermarks.

## What It Does

**Reads Content Credentials (C2PA provenance data) from images and videos** to answer questions like "who made this?", "is this AI?", "where did this come from?"

### Detection Methods
1. **Embedded C2PA manifests** - Reads metadata embedded in files (via `c2patool`)
2. **TrustMark watermarks** - Detects invisible watermarks in image pixels (via Python TrustMark)
3. **Smart fallback** - Checks embedded first, then watermark if nothing found

### Input Sources
- Local files on macOS filesystem (`/Users/you/Desktop/photo.jpg`)
- URLs (`https://example.com/image.jpg`)
- Direct filesystem browsing (Desktop, Downloads, Documents, Pictures)

### Supported Formats
- **Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.tiff`, `.avif`, `.heic`
- **Videos:** `.mp4`, `.mov`

### What You Get
- **Creator identity** (LinkedIn verified, CAWG organizations)
- **Content history** (edits, AI generation, filters applied)
- **Signer details** (certificate info, timestamp)
- **Social credentials** (Instagram, Behance, etc.)

---

## Features

- 🔍 **Embedded C2PA Detection** - Read manifests from file metadata
- 🌊 **TrustMark Watermark Detection** - Detect credentials in image pixels (survives social media!)
- 📸 **Screenshot Support** - Automatically checks watermarks in screenshots
- 🌐 **URL Support** - Check credentials from web URLs
- 📂 **Direct Filesystem Access** - Claude can browse your directories
- ⚡ **Smart Detection** - Checks embedded first, watermark as fallback
- 🤖 **Automatic Installation** - Zero configuration setup
- 📋 **Structured Output** - Human-readable parsed data
- 🛡️ **Production Ready** - Full error handling and logging

## Quick Start

```bash
# 1. Clone
git clone https://github.com/noga7/mcp-content-credentials.git
cd mcp-content-credentials

# 2. Install (automatic: installs c2patool + TrustMark)
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
```

## Prerequisites

- **Node.js** v18+
- **Python 3.8.5+** (for TrustMark watermarks)

**All other dependencies auto-install during `npm install`:**
- ✅ c2patool (Homebrew on macOS, binary on Linux)
- ✅ TrustMark Python package (via pip)

### Manual Installation (if auto-install fails)

```bash
# c2patool
brew install contentauth/tools/c2patool  # macOS

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

### Screenshots and Dropped Files

```
"Check this screenshot"
"Does this screenshot have Content Credentials?"
```

When you drop a screenshot or mention one, the tool automatically checks for TrustMark watermarks - invisible credentials that survive even when metadata is stripped!

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
1. Check Embedded C2PA Manifest (fast: ~150ms)
   ↓
   Found? → Return immediately ✅
   ↓
2. Check TrustMark Watermark (slower: ~600ms)
   ↓
   Found? → Return watermark data ✅
   ↓
3. Neither found → "No Content Credentials found" ❌
```

### Why This Order?

- **Performance**: 80% of credentialed images have embedded manifests
- **Speed**: Skip expensive watermark check when not needed
- **Completeness**: Still catch stripped metadata via watermarks

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

### "c2patool: command not found"

```bash
brew install contentauth/tools/c2patool  # macOS
# or
npm run install-deps
```

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

- **Embedded check**: ~150ms (fast path, 80% of cases)
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
- [c2patool](https://github.com/contentauth/c2pa-rs)
- [TrustMark](https://opensource.contentauthenticity.org/docs/trustmark/)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
