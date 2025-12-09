/**
 * Main C2PA Manifest Parser
 * Orchestrates parsing of manifest sections using specialized parsers
 */

import type { ParsedManifestData } from '../types/manifest.types.js';
import { parseWhoThisComesFrom } from './identity-parser.js';
import { parseAboutThisContent } from './content-parser.js';
import { parseAboutTheseCredentials } from './credentials-parser.js';
import { parseValidationInfo } from './validation-parser.js';
import { createLogger } from '../logger.js';

const logger = createLogger('manifest-parser');

/**
 * Parse c2patool detailed output into structured manifest data
 * with proper information hierarchy
 */
export function parseManifest(manifestText: string): ParsedManifestData {
  logger.debug('Parsing manifest with modular parsers', { textLength: manifestText.length });

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

    logger.info('Manifest parsed successfully', {
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



