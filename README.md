# MCP Content Credentials Server

A professional-grade MCP (Model Context Protocol) server for reading C2PA content credentials from images and media files using `c2patool`.

## Features

- 🔍 **Read from local files** - Check credentials in files on your computer
- 🌐 **Read from URLs** - Check credentials in files from the internet
- 📋 **Structured output** - Parses C2PA manifests into human-readable format with clear hierarchy:
  1. **Who this comes from** - LinkedIn verified identities (prioritized), creator names, social handles
  2. **About this content** - Actions taken (created, edited, generated), generative AI details
  3. **About these content credentials** - Claim signer, timestamp
  4. **Validation info** - Certificate details, trust information
- 🛡️ Robust error handling with custom error types
- 📝 Structured logging for debugging
- 🧪 Type-safe with comprehensive TypeScript types
- 🏗️ Clean architecture with separation of concerns
- 🎨 Code quality enforced with ESLint and Prettier

## Prerequisites

- Node.js (v18 or higher)
- `c2patool` command-line tool installed ([c2pa-rs releases](https://github.com/contentauth/c2pa-rs/releases))

To verify `c2patool` is installed:
```bash
c2patool --version
```

To install `c2patool` on macOS:
```bash
brew install contentauth/tools/c2patool
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-content-credentials
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Configuration with Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "content-credentials": {
      "command": "node",
      "args": ["/Users/nhurwitz/mcp-content-credentials/build/index.js"]
    }
  }
}
```

Then restart Claude Desktop.

### Available Tools

#### 1. `read_credentials_file`

Read C2PA content credentials from a local file on your computer.

**Usage in Claude:**
- "Check the content credentials in `/Users/nhurwitz/Downloads/image.jpg`"
- "Read C2PA data from `/path/to/photo.png`"

**Parameters:**
- `filePath` (string, required): Path to the file on your local filesystem

**Example Response:**
```json
{
  "success": true,
  "hasCredentials": true,
  "manifestData": {
    "whoThisComesFrom": {
      "linkedInIdentity": {
        "name": "John Doe",
        "profileUrl": "https://www.linkedin.com/in/johndoe",
        "verified": true
      },
      "otherIdentities": [
        {
          "name": "Jane Smith",
          "socialAccounts": ["@janesmith", "@janesmith_photo"],
          "credential": "verified-photographer"
        }
      ]
    },
    "aboutThisContent": {
      "actions": [
        {
          "action": "created",
          "softwareAgent": "Adobe Photoshop",
          "when": "2024-12-03T10:30:00Z"
        },
        {
          "action": "edited",
          "softwareAgent": "Adobe Lightroom"
        }
      ],
      "genAIInfo": {
        "generative": true,
        "model": "Adobe Firefly v2",
        "training": false
      }
    },
    "aboutTheseCredentials": {
      "claimSigner": "Adobe",
      "timestamp": "2024-12-03T10:30:00Z"
    },
    "validationInfo": {
      "certificate": {
        "issuer": "Content Authenticity Initiative",
        "subject": "Adobe Systems",
        "serialNumber": "12345",
        "validFrom": "2024-01-01",
        "validUntil": "2025-01-01"
      },
      "trustInfo": ["Verified by CAI"]
    },
    "rawManifest": "... full c2patool output ..."
  },
  "rawOutput": "... full c2patool output ..."
}
```

#### 2. `read_credentials_url`

Read C2PA content credentials from a file at a URL. The server downloads the file temporarily, checks for credentials, then cleans up.

**Usage in Claude:**
- "Check credentials at `https://example.com/image.jpg`"
- "What are the content credentials for this image: `https://i.imgur.com/abc123.jpg`"

**Parameters:**
- `url` (string, required): HTTP or HTTPS URL of the file

**Example Response:**
```json
{
  "success": true,
  "hasCredentials": false,
  "rawOutput": "No claim found"
}
```

## Supported File Types

The server supports any file type that `c2patool` can read:
- **Images:** JPEG, PNG, WebP, GIF, TIFF, AVIF
- **Video:** MP4
- And more...

## Response Format

All tool responses follow this structure with a clear information hierarchy:

```typescript
{
  success: boolean;              // Whether the operation succeeded
  hasCredentials: boolean;       // Whether C2PA credentials were found
  manifestData?: {               // Parsed manifest data (if credentials found)
    
    // 1. Who this comes from
    whoThisComesFrom?: {
      linkedInIdentity?: {       // Document-verified LinkedIn identity (shown first)
        name: string;            // Full name
        profileUrl: string;      // LinkedIn profile URL (hyperlinked)
        verified: boolean;
      };
      otherIdentities?: [{       // Other creator identities
        name?: string;
        identifier?: string;
        credential?: string;
        socialAccounts?: string[];
      }];
    };
    
    // 2. About this content (actions taken)
    aboutThisContent?: {
      actions?: [{               // Actions performed on the content
        action: string;          // e.g., "created", "edited", "generated"
        softwareAgent?: string;  // Software used
        when?: string;           // When the action occurred
      }];
      genAIInfo?: {              // Generative AI information
        generative?: boolean;    // Whether content is AI-generated
        training?: boolean;      // Whether used for training
        model?: string;          // AI model name
        version?: string;
      };
    };
    
    // 3. About these content credentials
    aboutTheseCredentials?: {
      claimSigner?: string;      // Who signed the claim
      timestamp?: string;        // When the claim was signed
      signedBy?: string;         // Alternative signer format
    };
    
    // 4. Validation info
    validationInfo?: {
      certificate?: {            // Certificate details
        issuer?: string;
        subject?: string;
        serialNumber?: string;
        validFrom?: string;
        validUntil?: string;
      };
      trustInfo?: string[];      // Trust/verification information
    };
    
    rawManifest?: string;        // Full detailed manifest text
  };
  error?: string;                // Error message (if failed)
  rawOutput?: string;            // Raw output from c2patool for debugging
}
```

## Development

### Available Scripts

```bash
npm run build         # Compile TypeScript to JavaScript
npm start             # Start the production server
npm run dev           # Run in development mode with ts-node
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint and auto-fix issues
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run type-check    # Run TypeScript type checking
npm run precommit     # Run all checks (lint, format, type-check)
```

### Project Structure

```
mcp-content-credentials/
├── src/
│   ├── index.ts            # MCP server entry point
│   ├── c2pa-service.ts     # Business logic
│   ├── manifest-parser.ts  # C2PA manifest parser
│   ├── file-utils.ts       # File operations
│   ├── validators.ts       # Input validation
│   ├── logger.ts           # Logging utility
│   ├── types.ts            # TypeScript types & errors
│   └── constants.ts        # Configuration constants
├── build/                  # Compiled output
├── ARCHITECTURE.md         # Architecture documentation
├── CONTRIBUTING.md         # Contributing guidelines
└── README.md               # This file
```

## How It Works

### Local File Flow
1. User provides a local file path
2. Server validates the path and checks file exists
3. Runs `c2patool --detailed` to extract C2PA manifest
4. Parses manifest into structured data (certificate, timestamp, CAWG assertions, etc.)
5. Returns structured data with human-readable information

### URL Flow
1. User provides a URL
2. Server validates URL and downloads file to temp location
3. Runs `c2patool --detailed` on temporary file
4. Parses manifest into structured data
5. Returns structured data with human-readable information
6. Cleans up temporary file

## Troubleshooting

### "c2patool: command not found"

Install c2patool from the [c2pa-rs releases page](https://github.com/contentauth/c2pa-rs/releases).

On macOS with Homebrew:
```bash
brew install contentauth/tools/c2patool
```

### "File not found"

Make sure you're providing the full path to the file. You can drag and drop a file into Terminal to get its full path.

### "No claim found"

This means the file does not contain C2PA content credentials. The response will indicate:
```json
{
  "success": true,
  "hasCredentials": false
}
```

## Error Handling

The server uses custom error types for better error handling:

- `FileNotFoundError`: File doesn't exist at the specified path
- `InvalidUrlError`: Invalid or unsupported URL
- `DownloadError`: Failed to download from URL
- `C2PToolError`: Error executing c2patool

All errors are logged with context and returned as structured responses.

## Security Considerations

- Input validation on all user inputs
- Path validation prevents null bytes and malicious paths
- URL protocol whitelist (http/https only)
- Timeout on network operations (30 seconds)
- Buffer size limits to prevent DoS
- Temporary files cleaned up after processing

## License

ISC

## Resources

- [C2PA Specification](https://c2pa.org/specifications/specifications/1.0/index.html)
- [c2patool GitHub Repository](https://github.com/contentauth/c2pa-rs)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
