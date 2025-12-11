/**
 * Format Content Credentials data in a way that guides ChatGPT's response format
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

  // Build formatted response
  const sections: string[] = [];

  // Section 1: Who this comes from
  if (result.manifestData?.whoThisComesFrom) {
    const identities: string[] = [];
    const { linkedInIdentity, otherIdentities } = result.manifestData.whoThisComesFrom;

    // LinkedIn verified identity first (highest priority)
    if (linkedInIdentity) {
      identities.push(
        `• **${linkedInIdentity.name}** (LinkedIn Verified)${linkedInIdentity.profileUrl ? ` - [${linkedInIdentity.profileUrl}](${linkedInIdentity.profileUrl})` : ''}`
      );
    }

    // Other identities
    if (otherIdentities && otherIdentities.length > 0) {
      otherIdentities.forEach((identity) => {
        const socialInfo = identity.socialAccounts?.join(', ') || '';
        identities.push(`• **${identity.name}**${socialInfo ? ` (${socialInfo})` : ''}`);
      });
    }

    if (identities.length > 0) {
      sections.push(`## 👤 Who this comes from\n\n${identities.join('\n')}`);
    }
  }

  // Section 2: About this content
  if (result.manifestData?.aboutThisContent) {
    const contentInfo: string[] = [];
    const { actions, genAIInfo } = result.manifestData.aboutThisContent;

    // AI generation info (most important)
    if (genAIInfo) {
      if (genAIInfo.generative) {
        contentInfo.push(`🤖 **AI Generated**: Yes`);
        if (genAIInfo.model) {
          contentInfo.push(`   Model: ${genAIInfo.model}`);
        }
      } else {
        contentInfo.push(`🤖 **AI Generated**: No`);
      }
      if (genAIInfo.training !== undefined) {
        contentInfo.push(`   Used for AI training: ${genAIInfo.training ? 'Yes' : 'No'}`);
      }
    }

    // Actions (filter out c2pa.opened)
    if (actions && actions.length > 0) {
      const relevantActions = actions.filter((a) => a.action !== 'c2pa.opened');
      if (relevantActions.length > 0) {
        contentInfo.push(`\n**Actions taken:**`);
        relevantActions.forEach((action) => {
          const when = action.when ? ` (${new Date(action.when).toLocaleDateString()})` : '';
          const tool = action.softwareAgent ? ` with ${action.softwareAgent}` : '';
          contentInfo.push(`• ${action.action}${tool}${when}`);
        });
      }
    }

    if (contentInfo.length > 0) {
      sections.push(`## 📋 About this content\n\n${contentInfo.join('\n')}`);
    }
  }

  // Section 3: About these Content Credentials
  if (result.manifestData?.aboutTheseCredentials) {
    const { claimSigner, timestamp } = result.manifestData.aboutTheseCredentials;
    const credInfo: string[] = [];

    if (claimSigner) {
      credInfo.push(`• **Signed by**: ${claimSigner}`);
    }
    if (timestamp) {
      credInfo.push(`• **Created**: ${new Date(timestamp).toLocaleString()}`);
    }

    if (credInfo.length > 0) {
      sections.push(`## 🔐 About these Content Credentials\n\n${credInfo.join('\n')}`);
    }
  }

  // Section 4: Validation info
  if (result.manifestData?.validationInfo) {
    const { certificate, trustInfo } = result.manifestData.validationInfo;
    const validInfo: string[] = [];

    if (trustInfo && Array.isArray(trustInfo) && trustInfo.length > 0) {
      validInfo.push(`• **Status**: Certificate information available`);
      trustInfo.forEach((info) => validInfo.push(`  - ${info}`));
    }
    if (certificate?.issuer) {
      validInfo.push(`• **Issued by**: ${certificate.issuer}`);
    }
    if (certificate?.serialNumber) {
      validInfo.push(`• **Certificate**: ${certificate.serialNumber}`);
    }

    if (validInfo.length > 0) {
      sections.push(`## ✓ Validation info\n\n${validInfo.join('\n')}`);
    }
  }

  // TrustMark watermark info
  if (result.trustMarkData) {
    sections.push(
      `## 🌊 TrustMark Watermark\n\n` +
        `This image contains an invisible watermark that survived metadata stripping.\n` +
        `• **Identifier**: ${result.trustMarkData.identifier}\n` +
        `• **Schema**: ${result.trustMarkData.schema}` +
        (result.trustMarkData.manifestUrl
          ? `\n• **Full manifest**: ${result.trustMarkData.manifestUrl}`
          : '')
    );
  }

  if (sections.length === 0) {
    return `ℹ️ Content Credentials found, but no detailed information is available in the manifest.`;
  }

  return `✅ **CONTENT CREDENTIALS FOUND**\n\n${sections.join('\n\n')}`;
}

