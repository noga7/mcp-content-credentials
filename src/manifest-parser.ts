/**
 * C2PA Manifest Parser
 * Parses c2patool output and extracts structured information
 * with proper information hierarchy
 */

import type {
  ParsedManifestData,
  WhoThisComesFrom,
  LinkedInIdentity,
  CreatorIdentity,
  AboutThisContent,
  ContentAction,
  AboutTheseCredentials,
  ValidationInfo,
} from './types.js';
import { createLogger } from './logger.js';

const logger = createLogger('manifest-parser');

/**
 * Parse LinkedIn verified identity from manifest text
 */
function parseLinkedInIdentity(manifestText: string): LinkedInIdentity | undefined {
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
function parseOtherIdentities(manifestText: string): CreatorIdentity[] | undefined {
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

  return identities.length > 0 ? identities : undefined;
}

/**
 * Parse "Who this comes from" section
 */
function parseWhoThisComesFrom(manifestText: string): WhoThisComesFrom | undefined {
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

/**
 * Parse content actions from manifest text
 */
function parseContentActions(manifestText: string): ContentAction[] | undefined {
  const actions: ContentAction[] = [];

  // Common C2PA actions
  const actionPatterns = [
    /(?:action|edited|modified|created|generated)[:\s]+([^\n]+)/gi,
    /c2pa\.actions?\.([a-z.]+)/gi,
  ];

  for (const pattern of actionPatterns) {
    const matches = manifestText.matchAll(pattern);
    for (const match of matches) {
      const actionText = match[1]?.trim();
      if (actionText) {
        const action: ContentAction = { action: actionText };

        // Look for software agent near this action
        const softwareMatch = manifestText.match(
          new RegExp(`${actionText}[\\s\\S]{0,100}(?:software|agent|tool)[:\\s]+([^\\n]+)`, 'i')
        );
        if (softwareMatch?.[1]) {
          action.softwareAgent = softwareMatch[1].trim();
        }

        // Look for timestamp
        const whenMatch = manifestText.match(
          new RegExp(`${actionText}[\\s\\S]{0,100}(\\d{4}-\\d{2}-\\d{2}T[^\\s]+)`, 'i')
        );
        if (whenMatch?.[1]) {
          action.when = whenMatch[1];
        }

        actions.push(action);
      }
    }
  }

  return actions.length > 0 ? actions : undefined;
}

/**
 * Parse generative AI information
 */
function parseGenAIInfo(manifestText: string): AboutThisContent['genAIInfo'] | undefined {
  const genAI: NonNullable<AboutThisContent['genAIInfo']> = {};

  // Check for AI generation
  if (/(?:ai|artificial intelligence|generative|generated|gen.?ai)/i.test(manifestText)) {
    genAI.generative = true;
  }

  // Check for training usage
  if (/(?:training|data.?mining|model.?training)/i.test(manifestText)) {
    genAI.training = true;
  }

  // Look for model name
  const modelMatch = manifestText.match(/(?:model|ai.?model)[:\s]+([^\n]+)/i);
  if (modelMatch?.[1]) {
    genAI.model = modelMatch[1].trim();
  }

  // Look for version
  const versionMatch = manifestText.match(/version[:\s]+([^\n]+)/i);
  if (versionMatch?.[1] && genAI.model) {
    genAI.version = versionMatch[1].trim();
  }

  return Object.keys(genAI).length > 0 ? genAI : undefined;
}

/**
 * Parse "About this content" section
 */
function parseAboutThisContent(manifestText: string): AboutThisContent | undefined {
  const section: AboutThisContent = {};

  const actions = parseContentActions(manifestText);
  if (actions) {
    section.actions = actions;
  }

  const genAIInfo = parseGenAIInfo(manifestText);
  if (genAIInfo) {
    section.genAIInfo = genAIInfo;
  }

  return Object.keys(section).length > 0 ? section : undefined;
}

/**
 * Parse "About these Content Credentials" section
 */
function parseAboutTheseCredentials(manifestText: string): AboutTheseCredentials | undefined {
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

  return Object.keys(section).length > 0 ? section : undefined;
}

/**
 * Parse validation information section
 */
function parseValidationInfo(manifestText: string): ValidationInfo | undefined {
  const section: ValidationInfo = {};

  // Parse certificate information
  const cert: NonNullable<ValidationInfo['certificate']> = {};

  const issuerMatch = manifestText.match(/issuer[:\s]+([^\n]+)/i);
  if (issuerMatch?.[1]) {
    cert.issuer = issuerMatch[1].trim();
  }

  const subjectMatch = manifestText.match(/subject[:\s]+([^\n]+)/i);
  if (subjectMatch?.[1]) {
    cert.subject = subjectMatch[1].trim();
  }

  const serialMatch = manifestText.match(/serial[:\s]*(?:number)?[:\s]+([^\n]+)/i);
  if (serialMatch?.[1]) {
    cert.serialNumber = serialMatch[1].trim();
  }

  const validFromMatch = manifestText.match(/(?:valid from|not before)[:\s]+([^\n]+)/i);
  if (validFromMatch?.[1]) {
    cert.validFrom = validFromMatch[1].trim();
  }

  const validUntilMatch = manifestText.match(/(?:valid until|not after)[:\s]+([^\n]+)/i);
  if (validUntilMatch?.[1]) {
    cert.validUntil = validUntilMatch[1].trim();
  }

  if (Object.keys(cert).length > 0) {
    section.certificate = cert;
  }

  // Parse trust information
  const trustInfo: string[] = [];
  const trustMatches = manifestText.matchAll(/(?:trust|trusted|verified by)[:\s]+([^\n]+)/gi);
  for (const match of trustMatches) {
    const trust = match[1]?.trim();
    if (trust) {
      trustInfo.push(trust);
    }
  }

  if (trustInfo.length > 0) {
    section.trustInfo = trustInfo;
  }

  return Object.keys(section).length > 0 ? section : undefined;
}

/**
 * Parse c2patool detailed output into structured manifest data
 * with proper information hierarchy
 */
export function parseManifest(manifestText: string): ParsedManifestData {
  logger.debug('Parsing manifest with new hierarchy', { textLength: manifestText.length });

  const parsed: ParsedManifestData = {
    rawManifest: manifestText,
  };

  try {
    // 1. Who this comes from
    const whoThisComesFrom = parseWhoThisComesFrom(manifestText);
    if (whoThisComesFrom) {
      parsed.whoThisComesFrom = whoThisComesFrom;
    }

    // 2. About this content
    const aboutThisContent = parseAboutThisContent(manifestText);
    if (aboutThisContent) {
      parsed.aboutThisContent = aboutThisContent;
    }

    // 3. About these Content Credentials
    const aboutTheseCredentials = parseAboutTheseCredentials(manifestText);
    if (aboutTheseCredentials) {
      parsed.aboutTheseCredentials = aboutTheseCredentials;
    }

    // 4. Validation info
    const validationInfo = parseValidationInfo(manifestText);
    if (validationInfo) {
      parsed.validationInfo = validationInfo;
    }

    logger.info('Manifest parsed successfully with new hierarchy', {
      hasWhoThisComesFrom: !!parsed.whoThisComesFrom,
      hasLinkedIn: !!parsed.whoThisComesFrom?.linkedInIdentity,
      hasAboutContent: !!parsed.aboutThisContent,
      hasCredentials: !!parsed.aboutTheseCredentials,
      hasValidation: !!parsed.validationInfo,
    });
  } catch (error) {
    logger.error('Error parsing manifest', error);
  }

  return parsed;
}
