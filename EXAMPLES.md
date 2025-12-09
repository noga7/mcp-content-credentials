# Example Outputs with TrustMark Support

This document shows example outputs from the MCP Content Credentials server with TrustMark watermark detection enabled.

## Scenario 1: Image with Embedded C2PA Manifest Only

**Input**: Image with embedded C2PA metadata, no watermark

```json
{
  "success": true,
  "hasCredentials": true,
  "manifestData": {
    "whoThisComesFrom": {
      "linkedInIdentity": {
        "name": "Jane Smith",
        "profileUrl": "https://www.linkedin.com/in/janesmith",
        "verified": true
      }
    },
    "aboutThisContent": {
      "actions": [
        {
          "action": "c2pa.created",
          "softwareAgent": "Adobe Photoshop 24.0",
          "when": "2024-12-09T10:30:00Z"
        }
      ]
    },
    "aboutTheseCredentials": {
      "claimSigner": "Adobe",
      "timestamp": "2024-12-09T10:30:00Z"
    },
    "validationInfo": {
      "certificate": {
        "issuer": "Content Authenticity Initiative",
        "subject": "Adobe Systems Incorporated"
      }
    }
  }
}
```

## Scenario 2: Image with TrustMark Watermark Only

**Input**: Image with TrustMark watermark, embedded metadata stripped

**Current Output** (placeholder decoder):
```json
{
  "success": true,
  "hasCredentials": false
}
```

**Future Output** (with real decoder):
```json
{
  "success": true,
  "hasCredentials": true,
  "trustMarkData": {
    "identifier": "https://credentials.example.com/manifest/abc123def456",
    "schema": "BCH_5",
    "raw": "1000000100001110000010010001011110010001011000100000100110110...",
    "manifestUrl": "https://credentials.example.com/manifest/abc123def456"
  }
}
```

## Scenario 3: Image with Both Embedded Manifest AND Watermark

**Input**: Image with both embedded C2PA metadata and TrustMark watermark

**Future Output** (with real decoder):
```json
{
  "success": true,
  "hasCredentials": true,
  "manifestData": {
    "whoThisComesFrom": {
      "linkedInIdentity": {
        "name": "Jane Smith",
        "profileUrl": "https://www.linkedin.com/in/janesmith",
        "verified": true
      }
    },
    "aboutThisContent": {
      "actions": [
        {
          "action": "c2pa.created",
          "softwareAgent": "Adobe Photoshop 24.0",
          "when": "2024-12-09T10:30:00Z"
        }
      ],
      "genAIInfo": {
        "generative": false,
        "training": false
      }
    },
    "aboutTheseCredentials": {
      "claimSigner": "Adobe",
      "timestamp": "2024-12-09T10:30:00Z"
    },
    "validationInfo": {
      "certificate": {
        "issuer": "Content Authenticity Initiative",
        "subject": "Adobe Systems Incorporated"
      }
    }
  },
  "trustMarkData": {
    "identifier": "abc123def456789",
    "schema": "BCH_SUPER",
    "raw": "0000001100001110000010010001011110010001011000100000100110110...",
    "manifestUrl": null
  }
}
```

## Scenario 4: Social Media Image (Metadata Stripped)

**Use Case**: Image downloaded from Instagram/Twitter where metadata was stripped but watermark survives

**Input**: JPEG from social media (compressed, metadata removed, but watermark intact)

**Future Output**:
```json
{
  "success": true,
  "hasCredentials": true,
  "trustMarkData": {
    "identifier": "registry://abc123",
    "schema": "BCH_5",
    "raw": "1000001100001110000010010001011110010001011000100000100110110..."
  }
}
```

**Note**: Embedded manifest would be lost, but TrustMark watermark survives!

## Scenario 5: No Credentials Found

**Input**: Regular image with no credentials

```json
{
  "success": true,
  "hasCredentials": false
}
```

## Scenario 6: Error Case

**Input**: Invalid or corrupted file

```json
{
  "success": false,
  "hasCredentials": false,
  "error": "Failed to load image: File format not supported"
}
```

## Watermark Schema Details

The `schema` field indicates the error correction level used in the watermark:

| Schema | Description | Use Case |
|--------|-------------|----------|
| `BCH_SUPER` | Maximum error correction | Highly compressed/modified images |
| `BCH_5` | High error correction | General purpose, good balance |
| `BCH_4` | Medium error correction | Less modified images |
| `BCH_3` | Lower error correction | High-quality, unmodified images |

## Identifier Types

The watermark `identifier` can be in several formats:

### URL Format
```json
{
  "identifier": "https://credentials.example.com/manifest/abc123",
  "manifestUrl": "https://credentials.example.com/manifest/abc123"
}
```
→ Direct URL to fetch the full C2PA manifest

### Hash Format
```json
{
  "identifier": "abc123def456789012345678901234567890abcd",
  "manifestUrl": null
}
```
→ Hash-based lookup in a content credentials registry

### Direct Identifier
```json
{
  "identifier": "registry://abc123",
  "manifestUrl": null
}
```
→ Registry-specific identifier format

## Using in Claude

### Example User Questions:

**Question 1**: "Is this image AI-generated?"
```
Claude: Let me check the content credentials...
[Calls read_credentials_file]

Based on the Content Credentials:
- ✅ This image has verified credentials
- 📝 Created by Jane Smith (LinkedIn verified)
- 🤖 generativeAI: false - This is NOT AI-generated
- 📷 Software: Adobe Photoshop 24.0
- 🔐 The watermark confirms these credentials even if metadata is stripped
```

**Question 2**: "Where does this image come from?"
```
Claude: Let me examine the content credentials...
[Calls read_credentials_file]

This image comes from:
• **Jane Smith** (LinkedIn verified: ✓)
  Profile: linkedin.com/in/janesmith

The image also contains a TrustMark watermark with identifier: abc123def456
This ensures the credentials persist even if the file is shared on social media.
```

**Question 3**: "Does this have content credentials?"
```
Claude: [Calls read_credentials_file]

Yes! This image has comprehensive Content Credentials:

**Who this comes from:**
• Jane Smith (LinkedIn verified)

**About this content:**
• Created with Adobe Photoshop 24.0 on Dec 9, 2024
• Not AI-generated

**Credentials signed by:** Adobe
**Timestamp:** 2024-12-09T10:30:00Z

Additionally, this image contains a TrustMark watermark (schema: BCH_5) 
which means the credentials are embedded in the image itself and will 
survive even if metadata is stripped.
```

## Response Processing Tips

When working with the responses:

1. **Check both sources**: Always check both `manifestData` and `trustMarkData`
2. **Trust watermarks more for robustness**: If metadata is suspicious but watermark exists, watermark is more reliable
3. **Combine information**: Use embedded metadata for details, watermark for verification
4. **Handle missing data gracefully**: Either or both might be present

## Development/Testing

To test the current implementation (before decoder integration):

```bash
# Start the server
npm start

# In Claude Desktop, ask:
# "Check content credentials in /path/to/image.jpg"

# Expected behavior:
# - Checks for embedded C2PA manifest ✓
# - Attempts watermark detection (returns "no watermark" - placeholder)
# - Returns available credentials
```

---

See [TRUSTMARK.md](TRUSTMARK.md) for integration details and [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical overview.

