# TrustMark Watermark Support

This MCP Content Credentials server now includes support for detecting and reading Content Credentials via **TrustMark watermarks** in addition to embedded C2PA manifests.

## What is TrustMark?

TrustMark is a robust, invisible watermarking technology developed by the Content Authenticity Initiative (CAI) that embeds content provenance information directly into image pixels. Unlike embedded metadata that can be stripped, TrustMark watermarks persist through common image transformations.

**Key Features:**
- Invisible to the human eye
- Survives JPEG compression, resizing, and other transformations
- Embeds a 100-bit payload linking to C2PA manifests
- Uses BCH error correction for robustness
- Works with arbitrary resolution images

## Architecture

### Components

1. **TrustMarkService** (`src/trustmark-service.ts`)
   - Detects and decodes TrustMark watermarks from images
   - Uses Sharp library for image processing
   - Placeholder for TrustMark ONNX decoder integration

2. **TrustMark Types** (`src/types/manifest.types.ts`)
   - `TrustMarkWatermarkData`: Structured watermark payload
   - `TrustMarkResult`: Detection result with success/error status

3. **TrustMark Parser** (`src/parsers/trustmark-parser.ts`)
   - Formats watermark data for human readability
   - Parses identifier types (URL, hash, direct identifier)
   - Provides schema descriptions

4. **Integrated C2PA Service** (`src/c2pa-service.ts`)
   - Checks both embedded manifests AND watermarks
   - Combines results into unified response
   - Graceful fallback if TrustMark detection fails

## Current Status

### ✅ Implemented
- Complete service architecture for TrustMark detection
- Type definitions for watermark data
- Integration with existing C2PA workflow
- Parser for formatting watermark information
- Image loading and preprocessing with Sharp
- Error handling and logging

### 🚧 Pending Integration
The TrustMark decoder implementation is a **placeholder** waiting for the official TrustMark JavaScript/ONNX package to be published.

**What's needed:**
1. Official TrustMark npm package (currently available as source code only)
2. Integration of the ONNX model decoder
3. Implementation of the actual watermark detection logic

## How TrustMark Works

### Encoding Schema
TrustMark uses a 100-bit payload with the following structure:
- **4 bits**: Version and schema information
  - 2 reserved bits
  - 2 schema bits (0-3)
- **96 bits**: Actual payload (identifier, URL, or encoded data)

### Schema Types
| Schema | Name | Description |
|--------|------|-------------|
| 0 | BCH_SUPER | Maximum error correction - Most robust |
| 1 | BCH_5 | High error correction - Good balance |
| 2 | BCH_4 | Medium error correction |
| 3 | BCH_3 | Lower error correction - Higher capacity |

### Workflow
```
Image → Load RGB data → TrustMark Decoder → Extract 100-bit payload
                                             ↓
                                       Parse identifier
                                             ↓
                                    Retrieve C2PA manifest
```

## Response Format

When a TrustMark watermark is detected, the `C2PAResult` includes a `trustMarkData` field:

```typescript
{
  "success": true,
  "hasCredentials": true,
  "manifestData": { /* embedded C2PA data */ },
  "trustMarkData": {
    "identifier": "https://example.com/manifest/abc123",
    "schema": "BCH_5",
    "raw": "1000000100001110000010010001011110010001011000100000100110110...",
    "manifestUrl": "https://example.com/manifest/abc123"
  }
}
```

### Fields

- **identifier**: Decoded payload (URL, hash, or direct identifier)
- **schema**: Encoding schema used (BCH_SUPER, BCH_5, BCH_4, BCH_3)
- **raw**: Raw 100-bit payload as binary string
- **manifestUrl**: Optional URL to retrieve the full C2PA manifest

## Completing the Integration

To complete the TrustMark integration when the JavaScript package becomes available:

### 1. Install TrustMark Package

Once published, install the package:
```bash
npm install @cai/trustmark  # or whatever the package name will be
```

### 2. Update `src/trustmark-service.ts`

Replace the placeholder `decodeWatermark` method with the actual decoder:

```typescript
import { TrustMarkDecoder } from '@cai/trustmark';

export class TrustMarkService {
  private decoder: TrustMarkDecoder;

  constructor() {
    // Initialize with model type Q (or P for different performance characteristics)
    this.decoder = new TrustMarkDecoder({ 
      modelType: 'Q',
      verbose: false 
    });
  }

  private async decodeWatermark(imageBuffer: Buffer): Promise<TrustMarkWatermarkData | null> {
    try {
      // Decode watermark using TrustMark ONNX model
      const { secret, present, schema } = await this.decoder.decode(imageBuffer);
      
      if (present && secret) {
        // Parse the identifier
        const parsed = this.parseIdentifier(secret);
        
        return {
          identifier: secret,
          schema: this.getSchemaName(schema),
          raw: secret,
          manifestUrl: parsed.type === 'url' ? parsed.value : undefined,
        };
      }
      
      return null;
    } catch (error: unknown) {
      logger.error('Watermark decoding failed', error);
      throw error;
    }
  }
}
```

### 3. Download ONNX Models

TrustMark models are downloaded automatically on first use. Ensure your server has network access or pre-download them:

```bash
# Models will be cached in a system directory
# Check TrustMark documentation for specific URLs and md5 hashes
```

### 4. Test the Integration

Test with images that contain TrustMark watermarks:

```typescript
const service = createC2PAService();
const result = await service.readCredentialsFromFile('watermarked-image.jpg');

if (result.trustMarkData) {
  console.log('Watermark identifier:', result.trustMarkData.identifier);
  console.log('Schema:', result.trustMarkData.schema);
}
```

## Use Cases

### 1. Stripped Metadata Recovery
Even if metadata is removed from an image, the TrustMark watermark persists:
```
Original Image → Strip Metadata → TrustMark Still Present ✓
```

### 2. Social Media Sharing
Images shared on platforms that strip metadata maintain provenance:
```
Upload to Instagram → Compressed & Metadata Removed → Watermark Survives ✓
```

### 3. Print-to-Digital
Images that go through print-scan cycles can retain watermarks:
```
Print → Scan → Watermark Detectable ✓ (depending on quality)
```

### 4. Content Verification
Verify content authenticity without relying on fragile metadata:
```
Unknown Image → Detect Watermark → Verify Against Registry → Authenticate ✓
```

## Resources

### Official Documentation
- [TrustMark Overview](https://opensource.contentauthenticity.org/docs/trustmark/)
- [TrustMark Configuration](https://opensource.contentauthenticity.org/docs/trustmark/configuration/)
- [JavaScript Implementation](https://opensource.contentauthenticity.org/docs/trustmark/javascript-example/)
- [Using TrustMark with C2PA](https://opensource.contentauthenticity.org/docs/trustmark/using-with-c2pa/)

### Research Papers
- **TrustMark: Universal Watermarking for Arbitrary Resolution Images** (arXiv:2311.18297)
- **TrustMark: Robust Watermarking and Watermark Removal for Arbitrary Resolution Images** (ICCV 2025)

### GitHub Repository
- [TrustMark Source Code](https://github.com/contentauth/trustmark)

## Security Considerations

1. **Watermark Robustness**
   - TrustMark is designed to survive common transformations
   - Intentional watermark removal attempts may succeed
   - Use as complementary verification, not sole authentication

2. **Privacy**
   - Watermarks are invisible but machine-readable
   - Consider implications of persistent identifiers
   - Follow privacy regulations (GDPR, CCPA, etc.)

3. **Performance**
   - ONNX model inference requires computation
   - Consider caching results for repeated checks
   - Use appropriate model type (Q vs P) for your use case

## FAQ

### Why isn't TrustMark detecting watermarks?
The decoder is currently a placeholder. Once the TrustMark JavaScript package is integrated, detection will be fully functional.

### What's the difference between Q and P models?
- **Q model**: Balanced quality and performance
- **P model**: Different performance characteristics
Check TrustMark documentation for detailed comparisons.

### Can TrustMark work with video?
TrustMark is primarily designed for images. Video support would require frame-by-frame analysis.

### Does this work offline?
After initial model download, TrustMark can work offline. The ONNX models are cached locally.

### What if both embedded manifest and watermark exist?
The service returns both! Check `manifestData` for embedded credentials and `trustMarkData` for watermark-based credentials.

## Future Enhancements

- [ ] Automatic manifest retrieval from watermark URLs
- [ ] Caching of watermark detection results
- [ ] Batch processing of multiple images
- [ ] Support for additional watermarking schemes
- [ ] Integration with content credentials registries
- [ ] Watermark strength/confidence scoring

## Support

For issues or questions about TrustMark integration:
1. Check the [official documentation](https://opensource.contentauthenticity.org/docs/trustmark/)
2. Review the [GitHub repository](https://github.com/contentauth/trustmark)
3. Open an issue in this repository

---

**Note**: This integration is ready for the TrustMark JavaScript package. Once published, follow the "Completing the Integration" section to enable full watermark detection.

