/**
 * Parser for validation information (certificate, trust)
 */

import type { ValidationInfo } from '../types/manifest.types.js';
import { createLogger } from '../logger.js';

const logger = createLogger('validation-parser');

/**
 * Parse validation information section
 */
export function parseValidationInfo(manifestText: string): ValidationInfo | undefined {
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

  logger.debug('Found validation info', {
    hasCertificate: !!section.certificate,
    trustInfoCount: trustInfo.length,
  });

  return Object.keys(section).length > 0 ? section : undefined;
}





