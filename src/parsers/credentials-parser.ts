/**
 * Parser for credential metadata (signer, timestamp)
 */

import type { AboutTheseCredentials } from '../types/manifest.types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('credentials-parser');

/**
 * Parse "About these Content Credentials" section
 */
export function parseAboutTheseCredentials(
  manifestText: string
): AboutTheseCredentials | undefined {
  const section: AboutTheseCredentials = {};

  // Parse claim signer
  const signerMatch = manifestText.match(/(?:claim.?signer|signer)[:\s]+([^\n]+)/i);
  if (signerMatch?.[1]) {
    section.claimSigner = signerMatch[1].trim();
  }

  // Parse signed by (alternative format)
  const signedByMatch = manifestText.match(/signed by[:\s]+([^\n]+)/i);
  if (signedByMatch?.[1] && !section.claimSigner) {
    section.signedBy = signedByMatch[1].trim();
  }

  // Parse timestamp
  const timestampMatch = manifestText.match(
    /(?:timestamp|time|date|signed.?at)[:\s]+([^\n]+(?:Z|[+-]\d{2}:\d{2})?)/i
  );
  if (timestampMatch?.[1]) {
    section.timestamp = timestampMatch[1].trim();
  }

  // Alternative: ISO 8601 timestamp
  if (!section.timestamp) {
    const isoMatch = manifestText.match(
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)/
    );
    if (isoMatch?.[1]) {
      section.timestamp = isoMatch[1];
    }
  }

  logger.debug('Found credentials info', {
    hasSigner: !!section.claimSigner,
    hasTimestamp: !!section.timestamp,
  });

  return Object.keys(section).length > 0 ? section : undefined;
}





