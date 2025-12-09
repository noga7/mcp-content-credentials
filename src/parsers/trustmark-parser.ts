/**
 * Parser for TrustMark watermark data
 *
 * Formats TrustMark watermark information into human-readable sections
 */

import type { TrustMarkWatermarkData } from '../types/index.js';

/**
 * Format TrustMark watermark data for display
 */
export function formatTrustMarkData(watermarkData: TrustMarkWatermarkData): string {
  const sections: string[] = [];

  sections.push('=== TrustMark Watermark Detected ===\n');

  // Identifier section
  sections.push('Watermark Identifier:');
  sections.push(`  ${watermarkData.identifier}\n`);

  // Schema information
  sections.push('Encoding Schema:');
  sections.push(`  ${watermarkData.schema}`);
  sections.push(`  ${getSchemaDescription(watermarkData.schema)}\n`);

  // Manifest URL if available
  if (watermarkData.manifestUrl) {
    sections.push('Manifest Location:');
    sections.push(`  ${watermarkData.manifestUrl}\n`);
  }

  // Technical details
  sections.push('Technical Details:');
  sections.push(`  Raw Payload: ${watermarkData.raw}`);
  sections.push(`  Payload Length: ${watermarkData.raw.length} bits`);

  return sections.join('\n');
}

/**
 * Get human-readable description of the encoding schema
 */
function getSchemaDescription(schema: string): string {
  const descriptions: Record<string, string> = {
    BCH_SUPER: 'Maximum error correction - Most robust against modifications',
    BCH_5: 'High error correction - Good balance of robustness and capacity',
    BCH_4: 'Medium error correction - Balanced performance',
    BCH_3: 'Lower error correction - Higher data capacity',
  };

  return descriptions[schema] || 'Unknown schema';
}

/**
 * Parse TrustMark identifier to determine content type
 */
export function parseTrustMarkIdentifier(identifier: string): {
  type: 'url' | 'identifier' | 'hash';
  value: string;
  description: string;
} {
  // Check if it's a URL
  if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
    return {
      type: 'url',
      value: identifier,
      description: 'URL reference to Content Credentials manifest',
    };
  }

  // Check if it's a hash-like identifier (hex string)
  if (/^[0-9a-fA-F]+$/.test(identifier) && identifier.length >= 32) {
    return {
      type: 'hash',
      value: identifier,
      description: 'Hash-based identifier for Content Credentials lookup',
    };
  }

  // Default to generic identifier
  return {
    type: 'identifier',
    value: identifier,
    description: 'Direct Content Credentials identifier',
  };
}
