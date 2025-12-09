# Troubleshooting: "Unable to access that file"

## Quick Fixes

### 1. **Restart Claude Desktop**

The MCP server only connects when Claude Desktop starts. After any configuration changes:

```bash
# Quit Claude Desktop completely
# Then reopen it
```

**How to verify it's connected:**
- Look for a small 🔌 or tool icon in Claude Desktop
- Or ask Claude: "What MCP tools do you have available?"
- You should see: `read_credentials_file` and `read_credentials_url`

---

### 2. **Check File Path Format**

Claude needs the **absolute path** to the file.

#### ❌ **Wrong formats:**
```
"Check ~/Downloads/photo.jpg"           ❌ (tilde not expanded)
"Check Downloads/photo.jpg"             ❌ (relative path)
"Check /Users/username/photo.jpg"       ❌ (wrong username)
```

#### ✅ **Correct formats:**
```
"Check /Users/nhurwitz/Downloads/photo.jpg"        ✅
"Check /Users/nhurwitz/Desktop/image.png"          ✅
"Check /Users/nhurwitz/Documents/test/pic.jpg"     ✅
```

**Get the absolute path:**
```bash
# Drag and drop file into Terminal, it shows full path
# Or:
realpath ~/Downloads/photo.jpg
```

---

### 3. **Verify MCP Server Configuration**

Check your config file:

```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Should show:
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

---

### 4. **Test the Server Manually**

```bash
cd /Users/nhurwitz/mcp-content-credentials
npm start
```

Should show:
```
[INFO] Starting MCP Content Credentials Server
[INFO] MCP Content Credentials Server running on stdio
```

If this works, the server is fine. The issue is the connection to Claude Desktop.

---

## Detailed Diagnostics

### **Check if Claude Desktop sees the MCP server:**

In Claude Desktop, ask:
```
"What MCP tools are available?"
```

Expected response:
```
I have access to these MCP tools:
- read_credentials_file: Read Content Credentials from a local file
- read_credentials_url: Read Content Credentials from a URL
```

If you don't see these → **Server not connected**

---

### **Steps to Connect:**

1. **Check config file exists:**
   ```bash
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Verify config is valid JSON:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```

3. **Check build files exist:**
   ```bash
   ls -la /Users/nhurwitz/mcp-content-credentials/build/index.js
   ```

4. **Rebuild if needed:**
   ```bash
   cd /Users/nhurwitz/mcp-content-credentials
   npm run build
   ```

5. **Restart Claude Desktop completely:**
   - Quit Claude Desktop (Cmd+Q)
   - Reopen it
   - Wait 5-10 seconds for MCP to initialize

---

## Common Error Messages

### "Unable to access that file at the specified path"

**Causes:**
1. MCP server not connected
2. Wrong file path format (use absolute path)
3. File doesn't exist at that path
4. Permission issues

**Solution:**
```
# Get absolute path:
realpath ~/Downloads/your-image.jpg

# Then in Claude:
"Check content credentials in /Users/nhurwitz/Downloads/your-image.jpg"
```

---

### "No MCP tools available"

**Cause:** Server not connected to Claude Desktop

**Solution:**
1. Check config file
2. Restart Claude Desktop completely
3. Wait 10 seconds after restart

---

### "c2patool: command not found"

**Cause:** c2patool not installed

**Solution:**
```bash
# macOS
brew install contentauth/tools/c2patool

# Or reinstall dependencies
cd /Users/nhurwitz/mcp-content-credentials
npm run install-deps
```

---

### "Python or TrustMark decoder not found"

**Cause:** TrustMark not installed

**Solution:**
```bash
pip3 install trustmark Pillow

# Or
npm run install-deps
```

---

## Testing Workflow

### 1. **Test server manually:**
```bash
cd /Users/nhurwitz/mcp-content-credentials
node build/index.js
```

Expect: `[INFO] MCP Content Credentials Server running on stdio`

### 2. **Check Claude sees it:**

In Claude Desktop:
```
"What tools do you have?"
```

Expect: Should mention `read_credentials_file`

### 3. **Test with a file:**

```
"Check content credentials in /Users/nhurwitz/Downloads/test.jpg"
```

---

## Quick Test Image

Don't have a test image? Create one:

```bash
# Download a sample image with C2PA
curl -o ~/Downloads/test-c2pa.jpg "https://raw.githubusercontent.com/contentauth/c2pa-js/main/tools/testing/fixtures/CAICAI.jpg"

# Then test:
"Check /Users/nhurwitz/Downloads/test-c2pa.jpg"
```

---

## Still Not Working?

### Check Claude Desktop Logs

```bash
# macOS logs location
tail -f ~/Library/Logs/Claude/mcp*.log
```

Look for errors related to:
- MCP server startup
- Connection issues
- Path problems

---

## Working Example

Once everything is connected, this should work:

**You say:**
```
"Check content credentials in /Users/nhurwitz/Downloads/photo.jpg"
```

**Claude responds:**
```
Let me check the content credentials...

[Calls read_credentials_file with that path]

This image has verified Content Credentials from...
[Shows the credentials data]
```

---

## Summary Checklist

- [ ] Config file exists at `~/Library/Application Support/Claude/claude_desktop_config.json`
- [ ] Config has correct path to `build/index.js`
- [ ] Build files exist (`npm run build`)
- [ ] Claude Desktop restarted (completely quit and reopen)
- [ ] Using **absolute file paths** (start with `/Users/...`)
- [ ] File actually exists at that path
- [ ] c2patool installed (`c2patool --version`)
- [ ] TrustMark installed (`python3 -c "from trustmark import TrustMark"`)

---

## Get Help

If still not working:
1. Check the config: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Check the build: `ls -la /Users/nhurwitz/mcp-content-credentials/build/index.js`
3. Rebuild: `npm run build`
4. Restart Claude Desktop completely
5. Try with absolute path: `/Users/nhurwitz/...`

---

**Most common fix: Restart Claude Desktop!** 🔄

