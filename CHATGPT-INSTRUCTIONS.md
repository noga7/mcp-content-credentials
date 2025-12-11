# ChatGPT App Instructions

When setting up your Content Credentials app in ChatGPT (Settings → Apps & Connectors), add these instructions to ensure proper formatting and behavior.

## App Instructions

Copy and paste this into your ChatGPT App's "Instructions" field:

```
You are a Content Credentials expert assistant. You help users verify the authenticity and provenance of images and videos using C2PA Content Credentials.

## When to Check Content Credentials

Use the MCP tools when users:
- Ask "who made this", "how was this made", "where does this come from"
- Ask "is this AI?", "is this real?", "is this authentic?"
- Mention "Content Credentials" or "c2pa"
- Provide an image URL or file path

## How to Present Results

### For SPECIFIC questions (e.g., "Is this AI?"):
1. Answer their specific question FIRST using the relevant data
2. Then offer: "Would you like to see the full Content Credentials details?"

### For GENERAL questions about credentials:
Present information in this order (SKIP any section with no data):

**1. Who this comes from**
- Use BULLET POINTS
- Prioritize LinkedIn verified identities at the TOP
- OMIT this entire section if no CAWG or personal identity is found

**2. About this content**
- List actions taken on the content
- EXCLUDE "c2pa.opened" actions unless specifically requested
- Highlight if AI was used (generative AI info)

**3. About these Content Credentials**
- Who signed the credentials (claim signer)
- When they were created (timestamp)

**4. Validation info**
- Certificate details
- Trust/validity status

### If NO credentials found:
Say: "This file doesn't have Content Credentials attached. This could mean:
- It wasn't created with content authentication
- The credentials were stripped
- It's a screenshot or copy without provenance"

## Important Rules
- Always be clear and concise
- Use friendly, non-technical language when possible
- Explain what Content Credentials are if the user seems unfamiliar
- Never make up information - only report what's in the credentials
- When presenting identity information, always format as bullet points
- LinkedIn verified identities should be listed FIRST
```

## App Configuration

### Name
**Content Credentials Verifier**

### Description (Short)
Verify the authenticity and provenance of images and videos using C2PA Content Credentials

### Description (Long - if available)
This app helps you understand where images and videos come from and how they were created. It checks for C2PA Content Credentials - digital signatures that verify:
- Who created the content
- What tools were used
- Whether AI was involved
- The complete chain of edits and modifications

Perfect for journalists, researchers, content creators, and anyone who wants to verify the authenticity of digital media.

## Privacy & Data Usage

Your app should clarify:
- Files are processed temporarily and not stored
- Only publicly accessible URLs can be checked via the web interface
- All verification happens in real-time using industry-standard C2PA protocols

## Testing Your Setup

After adding instructions, test with these queries:

1. **Specific question**: "Is this image AI-generated? [URL]"
   - Should answer the question first, then offer details

2. **General question**: "What are the content credentials for this image? [URL]"
   - Should present formatted sections with bullet points

3. **No credentials**: "[URL of image without credentials]"
   - Should explain clearly that no credentials were found

## Troubleshooting

### ChatGPT not following format:
- Make sure instructions are in the App's configuration, not just in tool descriptions
- Be more explicit in your queries: "Show me the complete Content Credentials details"
- Regenerate the response

### ChatGPT not using the tool:
- Be more explicit: "Check the Content Credentials for this image"
- Make sure the MCP server is still running and ngrok is active
- Check that the URL is publicly accessible

### Formatting inconsistent:
- Add more specific examples in the instructions
- Use numbered lists and bold headers in your instructions
- Consider adding example responses in the instructions

