# TrustMark Detection Troubleshooting Guide

## Issue: TrustMark Watermark Not Detected in Screenshot

### Quick Diagnosis

If your MCP server is not finding TrustMark watermarks in screenshots, follow these steps:

## Step 1: Test TrustMark Detection Directly

Use the diagnostic test script:

```bash
cd /Users/nhurwitz/mcp-content-credentials
node test-trustmark.js /path/to/your/screenshot.png
```

This will show you:
- Whether TrustMark detection is working
- Any error messages from the Python decoder
- The actual watermark data if found

## Step 2: Common Issues and Solutions

### Issue A: Screenshot Format Problems

**Problem:** TrustMark watermarks may not survive all screenshot methods.

**Check:**
- What tool did you use to take the screenshot?
- What format is the screenshot? (PNG, JPEG, etc.)
- Was the screenshot taken of the full image or cropped?

**Solutions:**
1. Save the watermarked image directly (File > Save) instead of screenshotting
2. If you must screenshot, use PNG format (lossless)
3. Ensure the screenshot captures the full image at 100% zoom

### Issue B: TrustMark Model Mismatch

**Problem:** Wrong model type specified when detecting.

**Current Setting:** Model type 'Q' (default)

**Try Alternative:**
Edit `src/c2pa-service.ts` line 25:
```typescript
private trustMarkService = createTrustMarkService('P')  // Try 'P' instead of 'Q'
```

Then rebuild: `npm run build`

### Issue C: Python/TrustMark Not Properly Installed

**Check Installation:**
```bash
python3 -c "from trustmark import TrustMark; from PIL import Image; print('✅ All dependencies installed')"
```

**Reinstall if needed:**
```bash
pip3 install --upgrade trustmark Pillow
```

### Issue D: Image Modification During Screenshot

**Problem:** OS screenshot tools may apply compression or processing.

**TrustMark is sensitive to:**
- JPEG compression (even slight)
- Image resizing
- Color space conversions
- Gamma adjustments
- Format conversions

**Solution:**
1. Export the watermarked image as PNG
2. Open that PNG file directly in chat (don't screenshot)

### Issue E: TrustMark Application Issues

**Problem:** Watermark wasn't properly embedded.

**Verify watermark was applied:**
```bash
# Test with the Python TrustMark library directly
python3 << 'EOF'
from trustmark import TrustMark
from PIL import Image

tm = TrustMark(verbose=True, model_type='Q')
img = Image.open('/path/to/your/screenshot.png').convert('RGB')
wm_secret, wm_present, wm_schema = tm.decode(img)

if wm_present:
    print(f"✅ Watermark found: {wm_secret}")
else:
    print("❌ No watermark detected")
EOF
```

## Step 3: Enable Detailed Logging

The MCP server logs to stderr. To see detailed TrustMark detection logs:

1. Check your MCP server logs in Cursor
2. Look for lines containing `[trustmark-service]`
3. Check for error messages

**Common log messages:**
- `TrustMark watermark detected` - Success!
- `No TrustMark watermark detected in image` - Not found (but no error)
- `TrustMark detection failed` - Error occurred
- `Python or TrustMark decoder not found` - Installation issue

## Step 4: Test with Known Watermarked Image

Create a test watermarked image:

```python
from trustmark import TrustMark
from PIL import Image

# Create test image
img = Image.new('RGB', (512, 512), color='white')

# Apply watermark
tm = TrustMark(verbose=True, model_type='Q')
watermarked = tm.encode(img, 'https://example.com/manifest.json')

# Save
watermarked.save('/tmp/test-watermarked.png')
print("Test image saved to /tmp/test-watermarked.png")
```

Then test detection:
```bash
node test-trustmark.js /tmp/test-watermarked.png
```

## Step 5: Understanding TrustMark Limitations

### What TrustMark CAN survive:
- ✅ Screenshots (in theory, if lossless)
- ✅ PNG format conversions
- ✅ Social media sharing (some platforms)
- ✅ Slight cropping

### What TrustMark CANNOT survive:
- ❌ Heavy JPEG compression
- ❌ Significant resizing (especially downscaling)
- ❌ Filters or image effects
- ❌ Color adjustments beyond minor changes
- ❌ Conversion through some image editors

## Step 6: Verify MCP Server is Using Latest Code

```bash
cd /Users/nhurwitz/mcp-content-credentials
npm run build

# Restart MCP server in Cursor
# Command Palette > MCP: Restart Server > content-credentials
```

## Need More Help?

If none of these solutions work, provide:

1. Output of `node test-trustmark.js <your-image>`
2. How the watermark was applied
3. How the screenshot was taken
4. Image format and size
5. Any error messages from MCP server logs

## Technical Details

**Detection Flow:**
1. MCP server receives file path
2. Checks for embedded C2PA manifest first (via c2patool)
3. If no manifest found, checks for TrustMark watermark
4. Calls Python script: `scripts/trustmark-decode.py`
5. Python script uses TrustMark library to decode
6. Returns JSON result back to MCP server

**Script Location:** `/Users/nhurwitz/mcp-content-credentials/scripts/trustmark-decode.py`
**Python Module:** `trustmark` (must be installed via pip)
**Model Type:** 'Q' (default, can be changed to 'P')

