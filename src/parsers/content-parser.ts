/**
 * Parser for content actions and generative AI information
 */

import type { AboutThisContent, ContentAction } from '../types/manifest.types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('content-parser');

/**
 * Parse content actions from manifest text
 */
export function parseContentActions(manifestText: string): ContentAction[] | undefined {
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

  logger.debug('Found actions', { count: actions.length });
  return actions.length > 0 ? actions : undefined;
}

/**
 * Parse generative AI information
 */
export function parseGenAIInfo(manifestText: string): AboutThisContent['genAIInfo'] | undefined {
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

  logger.debug('Found GenAI info', { hasInfo: Object.keys(genAI).length > 0 });
  return Object.keys(genAI).length > 0 ? genAI : undefined;
}

/**
 * Parse "About this content" section
 */
export function parseAboutThisContent(manifestText: string): AboutThisContent | undefined {
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
