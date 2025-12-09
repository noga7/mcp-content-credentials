# TrustMark Installation Guide

## Quick Start

Your MCP Content Credentials server now uses the **official Python TrustMark implementation** for watermark detection!

## Prerequisites

1. **Node.js** (v18+) - Already required for the MCP server
2. **Python 3.8.5+** - For TrustMark watermark detection
3. **c2patool** - For embedded C2PA manifest reading

## Installation Steps

### 1. Install Node.js Dependencies

Already done if you've built the server:
```bash
npm install
npm run build
```

### 2. Install Python TrustMark

Install the official TrustMark package from PyPI:

```bash
pip install trustmark Pillow
```

Or using pip3:
```bash
pip3 install trustmark Pillow
```

**Verify installation:**
```bash
python3 -c "from trustmark import TrustMark; print('TrustMark installed successfully!')"
```

### 3. Test the Integration

Create a test image with a watermark (optional):
```python
from trustmark import TrustMark
from PIL import Image

# Initialize TrustMark
tm = TrustMark(verbose=True, model_type='Q')

# Create a watermarked image
img = Image.new('RGB', (800, 600), color='white')
watermarked = tm.encode(img, 'https://example.com/manifest/123')
watermarked.save('test_watermarked.jpg')
```

Test detection:
```bash
python3 scripts/trustmark-decode.py test_watermarked.jpg
```

Expected output:
```json
{
  "success": true,
  "hasWatermark": true,
  "watermarkData": {
    "identifier": "https://example.com/manifest/123",
    "schema": "BCH_5",
    "raw": "https://example.com/manifest/123",
    "manifestUrl": "https://example.com/manifest/123"
  }
}
```

## How It Works

The server now works exactly like c2patool integration:

1. **Node.js MCP Server** receives image path
2. **Calls Python script** as subprocess: `python3 scripts/trustmark-decode.py <image>`
3. **Python TrustMark** detects watermark
4. **Returns JSON** result to Node.js
5. **MCP Server** combines with C2PA manifest data

```
Image → Node.js Server
         ├── c2patool (embedded manifest)
         └── python3 trustmark-decode.py (watermark)
                ↓
         Combined Result
```

## Model Files

TrustMark automatically downloads ONNX model files on first use:
- Cached in your system's cache directory
- ~50-100MB download (one-time)
- No manual download needed

First run will show:
```
Downloading TrustMark model...
Model cached for future use
```

## Troubleshooting

### "Python or TrustMark decoder not found"

**Solution:** Install Python dependencies:
```bash
pip3 install trustmark Pillow
```

### "python3: command not found"

**macOS/Linux:**
```bash
which python3
# Should show: /usr/bin/python3 or similar
```

If not installed:
- **macOS:** `brew install python3`
- **Ubuntu:** `sudo apt install python3 python3-pip`

### "No module named 'trustmark'"

**Solution:** Make sure you're using the right pip:
```bash
python3 -m pip install trustmark Pillow
```

### Slow first run

First time running TrustMark downloads the ONNX model (~50-100MB). This is normal and only happens once.

### Memory issues

TrustMark needs ~500MB-1GB RAM for model inference. If you have memory constraints, consider:
- Processing images sequentially (not in parallel)
- Using model type 'P' instead of 'Q' (lighter)

## Configuration

### Change Model Type

Edit `src/c2pa-service.ts` to change the model:

```typescript
// Use 'P' model instead of 'Q'
private trustMarkService = createTrustMarkService('P');
```

**Model differences:**
- **Q (default)**: Balanced performance and accuracy
- **P**: Alternative characteristics (see TrustMark docs)

### Disable TrustMark Detection

If you want to temporarily disable watermark detection, comment out in `src/c2pa-service.ts`:

```typescript
// Comment these lines to disable TrustMark
// const trustMarkResult = await this.trustMarkService.detectWatermark(filePath);
// if (trustMarkResult.hasWatermark && trustMarkResult.watermarkData) {
//   result.trustMarkData = trustMarkResult.watermarkData;
// }
```

## Performance

### Expected Detection Times
- Small images (< 1MB): 100-500ms
- Medium images (1-5MB): 500ms-2s
- Large images (> 5MB): 2-5s

### Optimization Tips
1. **Use appropriate model**: Model Q is balanced, P may be faster
2. **Process in background**: Detection is async, won't block other operations
3. **Cache results**: Store detection results for images you process repeatedly

## Python Virtual Environment (Optional)

For better isolation, use a virtual environment:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install trustmark Pillow

# Update server to use venv python
# Edit src/trustmark-service.ts:
# Change: python3 "${SCRIPT_PATH}"
# To: /path/to/venv/bin/python3 "${SCRIPT_PATH}"
```

## Dependencies Summary

### Node.js (package.json)
```json
{
  "@modelcontextprotocol/sdk": "^1.24.1"
}
```

### Python (installed via pip)
```
trustmark >= 1.0.0
Pillow >= 9.0.0
```

### System Requirements
- Python 3.8.5+
- ~500MB RAM for TrustMark inference
- ~100MB disk for cached models

## Deployment

### Production Checklist

- [ ] Node.js dependencies installed: `npm install`
- [ ] Server built: `npm run build`
- [ ] Python 3.8.5+ available: `python3 --version`
- [ ] TrustMark installed: `pip3 install trustmark Pillow`
- [ ] Test script works: `python3 scripts/trustmark-decode.py <test-image>`
- [ ] Models downloaded (run once to cache)

### Docker Deployment

If using Docker, update your Dockerfile:

```dockerfile
FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Install Python dependencies
RUN pip3 install trustmark Pillow

# Copy and build Node.js app
COPY . /app
WORKDIR /app
RUN npm install
RUN npm run build

CMD ["npm", "start"]
```

## Resources

- **TrustMark Documentation**: https://opensource.contentauthenticity.org/docs/trustmark/
- **TrustMark GitHub**: https://github.com/adobe/trustmark
- **Python Package**: https://pypi.org/project/trustmark/
- **C2PA Specification**: https://c2pa.org/specifications/

## Support

### Common Issues

1. **Watermark not detected**: Image may not have a watermark, or it may be too degraded
2. **Slow performance**: First run downloads models; subsequent runs are faster
3. **Memory errors**: Reduce image size or process sequentially

### Getting Help

- Check the [TrustMark FAQ](https://opensource.contentauthenticity.org/docs/trustmark/faq/)
- Review `TRUSTMARK.md` for architecture details
- Open an issue with logs and error messages

---

## Next Steps

1. ✅ Install Python dependencies: `pip3 install trustmark Pillow`
2. ✅ Start your server: `npm start`
3. ✅ Test with an image containing Content Credentials
4. 🎉 Enjoy both embedded AND watermark-based credential detection!

Your MCP server will now detect Content Credentials from:
- ✅ Embedded C2PA manifests (via c2patool)
- ✅ TrustMark watermarks (via Python TrustMark)
- ✅ Combined results in unified response

