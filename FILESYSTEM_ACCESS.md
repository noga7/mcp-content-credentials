# Direct Filesystem Access

## 🎉 New Feature: Browse Files Directly!

Claude can now **browse your filesystem directly** without you needing to provide file paths!

---

## What This Enables

### **Before** (Manual Paths)
```
You: "Check /Users/nhurwitz/Desktop/photo.jpg"
Claude: [Checks that specific file]
```

### **After** (Direct Access)
```
You: "Show me images in my Desktop folder"
Claude: [Lists all images in Desktop]

You: "Check the credentials on the first one"
Claude: [Automatically checks it]
```

---

## How It Works

The MCP server now exposes **filesystem resources** that Claude can access:

### **1. Browse Common Directories**

Claude can list images in:
- 📁 Desktop (`~/Desktop`)
- 📁 Downloads (`~/Downloads`)
- 📁 Documents (`~/Documents`)
- 📁 Pictures (`~/Pictures`)

### **2. Automatic File Discovery**

Claude can:
- List all image files in a directory
- Check credentials on any file
- Navigate subdirectories
- Filter by image type

---

## Usage Examples

### **Example 1: Browse Desktop**

**You:**
```
"What images are on my Desktop?"
```

**Claude:**
```
Let me check your Desktop for images...

[Lists all .jpg, .png, .gif, .webp files found]

Found 15 images:
- /Users/nhurwitz/Desktop/photo1.jpg
- /Users/nhurwitz/Desktop/screenshot.png
- /Users/nhurwitz/Desktop/vacation/beach.jpg
...

Would you like me to check Content Credentials on any of these?
```

### **Example 2: Check Recent Downloads**

**You:**
```
"Check if any images in my Downloads have Content Credentials"
```

**Claude:**
```
Let me scan your Downloads folder...

[Automatically lists and checks images]

Found 3 images with Content Credentials:
1. adobe-sample.jpg - Created by Adobe, verified ✓
2. photo-from-camera.jpg - Canon EOS R5, authentic ✓
3. social-media.jpg - Has TrustMark watermark ✓

And 5 images without credentials.
```

### **Example 3: Natural Conversation**

**You:**
```
"Do I have any AI-generated images?"
```

**Claude:**
```
Let me check your common folders for images...

[Scans Desktop, Downloads, Documents, Pictures]

Found 2 AI-generated images:
1. midjourney-art.png (Desktop) - Created with Midjourney
2. dalle-image.jpg (Downloads) - Generated with DALL-E 3

Both have valid Content Credentials confirming AI generation.
```

---

## Technical Details

### **Supported Directories**

The server automatically exposes:
```
~/Desktop
~/Downloads
~/Documents  
~/Pictures
```

### **Supported Image Formats**

- JPEG/JPG
- PNG
- GIF
- WebP
- TIFF
- AVIF
- HEIC

### **MCP Resources**

The server now implements:

1. **`ListResources`** - Shows available directories
2. **`ReadResource`** - Lists files or checks credentials

```typescript
// Resources exposed as:
file:///Users/nhurwitz/Desktop
file:///Users/nhurwitz/Downloads
file:///Users/nhurwitz/Documents
file:///Users/nhurwitz/Pictures
```

---

## Privacy & Security

### **What Claude Can Access**

✅ **Can access:**
- Desktop
- Downloads
- Documents
- Pictures

❌ **Cannot access:**
- Hidden files (starting with `.`)
- System directories
- Other user directories
- Files outside the allowed directories

### **Permissions**

- Read-only access (cannot modify files)
- Only scans for image files
- Respects filesystem permissions
- No access to sensitive system files

### **Control**

You can:
- Revoke access by removing the MCP server from config
- Move files you don't want accessed
- Use standard filesystem permissions

---

## Configuration

### **Default Configuration**

Works out of the box! No configuration needed.

### **Custom Directories**

To add more directories, edit `src/index.ts`:

```typescript
const commonDirs = [
  join(homeDir, 'Desktop'),
  join(homeDir, 'Downloads'),
  join(homeDir, 'Documents'),
  join(homeDir, 'Pictures'),
  join(homeDir, 'MyCustomFolder'), // Add your own!
];
```

Then rebuild:
```bash
npm run build
```

### **Disable Filesystem Access**

To disable this feature, remove the resources capability:

```typescript
// In src/index.ts
const server = new Server(
  { name: SERVER_INFO.name, version: SERVER_INFO.version },
  {
    capabilities: {
      tools: {}, // Keep tools
      // resources: {}, // Remove this line
    },
  }
);
```

---

## Use Cases

### **1. Batch Checking**

```
"Check all images in Downloads for Content Credentials"
```

Claude will:
1. List all images in Downloads
2. Check each one for credentials
3. Summarize which have/don't have credentials

### **2. Finding Specific Images**

```
"Find all AI-generated images on my Desktop"
```

Claude will:
1. Scan Desktop images
2. Check credentials for gen AI info
3. List only AI-generated ones

### **3. Verification Workflow**

```
"Are any of my recent Downloads authentic news photos?"
```

Claude will:
1. Check Downloads folder
2. Look for news/journalism credentials
3. Verify authenticity markers

### **4. Quick Scans**

```
"Quick scan - any suspicious images?"
```

Claude can check for:
- Missing credentials
- Unexpected AI generation
- Modified images
- Unusual provenance

---

## Performance

### **Scanning Speed**

- **Small directory (< 10 files)**: ~1 second
- **Medium directory (10-50 files)**: ~2-5 seconds
- **Large directory (50-100 files)**: ~5-10 seconds

### **Optimizations**

- Only scans image files (ignores non-images)
- Limits to 50 files per request (shows more exist)
- Caches directory listings
- Parallel credential checking

### **Limits**

- Max 50 files shown per directory listing
- Max depth: 1 level of subdirectories
- Only checks image file types

---

## Comparison

### **Old Way (Tools Only)**

```
User must provide exact path:
→ "Check /Users/nhurwitz/Desktop/photo.jpg"

Pros:
- Fast (single file)
- Precise

Cons:
- User must know exact path
- Can't browse or discover files
- One file at a time
```

### **New Way (With Resources)**

```
Claude can browse and discover:
→ "What images are in my Desktop?"
→ "Check the ones with Content Credentials"

Pros:
- Natural conversation
- Automatic file discovery
- Batch operations
- No paths needed

Cons:
- Slightly slower for single files
- Requires resources capability
```

### **Best of Both**

You can still use tools directly:
```
"Check /Users/nhurwitz/Desktop/specific-file.jpg"
```

Or let Claude browse:
```
"Check recent images for credentials"
```

---

## Examples in Action

### **Conversation 1: Discovery**

```
You: "What's in my Downloads?"

Claude: I'll check your Downloads folder...
[Lists 23 images found]

You: "Any with credentials?"

Claude: Yes, 8 have Content Credentials:
1. camera-photo.jpg - Canon EOS R5
2. adobe-edit.png - Adobe Photoshop
...

You: "Tell me about the first one"

Claude: [Shows detailed credentials for camera-photo.jpg]
Created: Dec 8, 2024
Camera: Canon EOS R5
Photographer: [LinkedIn verified identity]
...
```

### **Conversation 2: Verification**

```
You: "I downloaded some news photos. Can you verify them?"

Claude: Let me scan your Downloads...

Found 5 news-related images:
- reuters-photo.jpg ✓ Verified Reuters credentials
- ap-image.jpg ✓ Verified AP News credentials  
- random-pic.jpg ⚠️  No credentials found
- social-share.jpg ⚠️  Only watermark, source unclear
- screenshot.png ❌ Screenshot, no provenance

The first two are authentic news photos with verified credentials.
```

---

## Troubleshooting

### **"No images found"**

**Cause:** Directory is empty or no image files

**Solution:** Check the directory actually has .jpg, .png, etc. files

### **"Permission denied"**

**Cause:** Filesystem permissions block access

**Solution:**
- Check file permissions
- Ensure Claude Desktop has filesystem access
- Try with a different directory

### **"Too many files"**

**Cause:** Directory has > 50 image files

**Solution:** Results are automatically limited to first 50 files. This is normal and prevents overwhelming responses.

---

## Summary

### **What Changed**

✅ Added **MCP Resources** capability
✅ Claude can **browse common directories**
✅ Claude can **list image files**
✅ Claude can **check credentials** on discovered files
✅ **Natural conversation** - no paths needed!

### **New Capabilities**

- Browse Desktop, Downloads, Documents, Pictures
- List all images in a directory
- Batch check Content Credentials
- Find AI-generated images
- Discover authentic news photos
- Natural file discovery conversations

### **Security**

- Read-only access
- Limited to common user directories
- Only image files exposed
- Respects filesystem permissions

---

## Getting Started

1. **Rebuild** (if needed):
   ```bash
   npm run build
   ```

2. **Restart Claude Desktop**

3. **Try it:**
   ```
   "What images are in my Downloads?"
   "Check them for Content Credentials"
   ```

That's it! Claude can now browse your filesystem directly! 🎉

---

See `src/index.ts` for implementation details.

