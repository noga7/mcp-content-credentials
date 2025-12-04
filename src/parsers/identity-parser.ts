/**
 * Parser for identity and creator information
 */

import type {
  LinkedInIdentity,
  CreatorIdentity,
  WhoThisComesFrom,
} from '../types/manifest.types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('identity-parser');

/**
 * Parse LinkedIn verified identity from manifest text
 */
export function parseLinkedInIdentity(manifestText: string): LinkedInIdentity | undefined {
  // Look for LinkedIn profile URL
  const linkedInMatch = manifestText.match(
    /linkedin\.com\/in\/([\w-]+)|linkedin[:\s]+(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)/i
  );

  if (linkedInMatch) {
    const username = linkedInMatch[1] || linkedInMatch[2];
    if (username) {
      // Look for associated name near the LinkedIn mention
      const nameMatch = manifestText.match(
        new RegExp(
          `(?:name|creator|author)[:\\s]+([^\\n]+)(?:[\\s\\S]{0,200}linkedin|linkedin[\\s\\S]{0,200}(?:name|creator|author)[:\\s]+([^\\n]+))`,
          'i'
        )
      );

      const name = nameMatch?.[1]?.trim() || nameMatch?.[2]?.trim() || username;

      logger.debug('Found LinkedIn identity', { name, username });
      return {
        name,
        profileUrl: `https://www.linkedin.com/in/${username}`,
        verified: true,
      };
    }
  }

  return undefined;
}

/**
 * Parse other creator identities from manifest text
 */
export function parseOtherIdentities(manifestText: string): CreatorIdentity[] | undefined {
  const identities: CreatorIdentity[] = [];

  // Look for creator/author mentions
  const creatorMatches = manifestText.matchAll(/(?:creator|author|made by)[:\s]+([^\n]+)/gi);
  for (const match of creatorMatches) {
    const name = match[1]?.trim();
    if (name && !name.toLowerCase().includes('linkedin')) {
      identities.push({ name });
    }
  }

  // Look for social media handles (not LinkedIn)
  const socialMatches = manifestText.matchAll(
    /(?:instagram|twitter|x\.com|facebook|tiktok|youtube)[:\s]+(@?[\w.-]+)/gi
  );
  const socialAccounts: string[] = [];
  for (const match of socialMatches) {
    const handle = match[1]?.trim();
    if (handle) {
      socialAccounts.push(handle);
    }
  }

  if (socialAccounts.length > 0) {
    if (identities.length > 0) {
      const lastIdentity = identities[identities.length - 1];
      if (lastIdentity) {
        lastIdentity.socialAccounts = socialAccounts;
      }
    } else {
      identities.push({ socialAccounts });
    }
  }

  logger.debug('Found identities', { count: identities.length });
  return identities.length > 0 ? identities : undefined;
}

/**
 * Parse "Who this comes from" section
 */
export function parseWhoThisComesFrom(manifestText: string): WhoThisComesFrom | undefined {
  const section: WhoThisComesFrom = {};

  // Parse LinkedIn identity first (priority)
  const linkedInIdentity = parseLinkedInIdentity(manifestText);
  if (linkedInIdentity) {
    section.linkedInIdentity = linkedInIdentity;
  }

  // Parse other identities
  const otherIdentities = parseOtherIdentities(manifestText);
  if (otherIdentities) {
    section.otherIdentities = otherIdentities;
  }

  return Object.keys(section).length > 0 ? section : undefined;
}
