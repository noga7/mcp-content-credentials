/**
 * Format Content Credentials data for ChatGPT
 * Returns raw JSON for LLM to interpret directly
 */

import type { C2PAResult } from './types/index.js';

export function formatForChatGPT(result: C2PAResult): string {
  if (!result.success) {
    return `❌ Error: ${result.error || 'Failed to check credentials'}`;
  }

  if (!result.hasCredentials) {
    return `ℹ️ NO CONTENT CREDENTIALS FOUND

This file doesn't have Content Credentials attached. This could mean:
• It wasn't created with content authentication
• The credentials were stripped (e.g., through social media upload)
• It's a screenshot or copy without provenance

Content Credentials (C2PA) are digital signatures that verify the authenticity and origin of digital content.`;
  }

  // Return formatted JSON for LLM to interpret
  if (result.manifest) {
    return `## ✅ CONTENT CREDENTIALS FOUND

\`\`\`json
${JSON.stringify(result.manifest, null, 2)}
\`\`\`

The manifest above contains complete C2PA Content Credentials including:
- Active manifest and claim information
- Creator/signature details
- Actions and editing history
- Validation status and trust information
`;
  }

  if (result.trustMarkData) {
    return `## 🌊 TRUSTMARK WATERMARK DETECTED

Invisible watermark found in image pixels:
- Identifier: \`${result.trustMarkData.identifier}\`
- Schema: ${result.trustMarkData.schema}
${result.trustMarkData.manifestUrl ? `- Full Manifest: ${result.trustMarkData.manifestUrl}` : ''}

This watermark survives image modifications like compression, resizing, and social media uploads.`;
  }

  return 'No credential data available';
}
