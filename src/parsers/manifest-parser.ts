/**
 * Main C2PA Manifest Parser
 * Orchestrates parsing of manifest sections using specialized parsers
 */

import type {
  ParsedManifestData,
  ContentAction,
  WhoThisComesFrom,
  CreatorIdentity,
  ValidationInfo,
} from '../types/manifest.types.js';
import { parseWhoThisComesFrom } from './identity-parser.js';
import { parseAboutThisContent } from './content-parser.js';
import { parseAboutTheseCredentials } from './credentials-parser.js';
import { parseValidationInfo } from './validation-parser.js';
import { createLogger } from '../logger.js';

const logger = createLogger('manifest-parser');

/**
 * Parse c2pa-node detailed output into structured manifest data
 * with proper information hierarchy
 */
export function parseManifest(manifestText: string): ParsedManifestData {
  logger.debug('Parsing manifest', { textLength: manifestText.length });

  // Try to parse as JSON first (c2pa-node v2 Reader.json())
  const trimmed = manifestText.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      const parsedFromJson = parseManifestJson(json, manifestText);
      logger.info('Parsed manifest from JSON successfully', {
        hasWhoThisComesFrom: !!parsedFromJson.whoThisComesFrom,
        hasLinkedIn: !!parsedFromJson.whoThisComesFrom?.linkedInIdentity,
        hasAboutContent: !!parsedFromJson.aboutThisContent,
        hasCredentials: !!parsedFromJson.aboutTheseCredentials,
        hasValidation: !!parsedFromJson.validationInfo,
      });
      return parsedFromJson;
    } catch {
      logger.debug('Manifest is not valid JSON, falling back to text parsing');
    }
  }

  // Fallback: parse text output (legacy)
  const parsed: ParsedManifestData = { rawManifest: manifestText };
  try {
    const whoThisComesFrom = parseWhoThisComesFrom(manifestText);
    if (whoThisComesFrom) parsed.whoThisComesFrom = whoThisComesFrom;

    const aboutThisContent = parseAboutThisContent(manifestText);
    if (aboutThisContent) parsed.aboutThisContent = aboutThisContent;

    const aboutTheseCredentials = parseAboutTheseCredentials(manifestText);
    if (aboutTheseCredentials) parsed.aboutTheseCredentials = aboutTheseCredentials;

    const validationInfo = parseValidationInfo(manifestText);
    if (validationInfo) parsed.validationInfo = validationInfo;

    logger.info('Parsed manifest from text successfully', {
      hasWhoThisComesFrom: !!parsed.whoThisComesFrom,
      hasLinkedIn: !!parsed.whoThisComesFrom?.linkedInIdentity,
      hasAboutContent: !!parsed.aboutThisContent,
      hasCredentials: !!parsed.aboutTheseCredentials,
      hasValidation: !!parsed.validationInfo,
    });
  } catch (error) {
    logger.error('Error parsing manifest (text)', error);
  }
  return parsed;
}

/**
 * Parse structured JSON manifest (c2pa-node Reader.json())
 * Extracts comprehensive information from the manifest structure
 */
function parseManifestJson(json: unknown, rawText: string): ParsedManifestData {
  const parsed: ParsedManifestData = { rawManifest: rawText };

  try {
    if (!json || typeof json !== 'object') return parsed;
    const root = json as Record<string, unknown>;

    // Get active manifest ID
    const activeId = root.active_manifest || root.activeManifest;
    if (!activeId || typeof activeId !== 'string') return parsed;

    const manifests = root.manifests;
    if (!manifests || typeof manifests !== 'object') return parsed;

    const mf = (manifests as Record<string, unknown>)[activeId];
    if (!mf || typeof mf !== 'object') return parsed;
    const manifest = mf as Record<string, unknown>;

    // Parse creator/identity information
    const whoThisComesFrom = parseCreatorInfo(manifest);
    if (whoThisComesFrom) parsed.whoThisComesFrom = whoThisComesFrom;

    // Parse actions from assertions
    const actions = parseActions(manifest);
    if (actions.length > 0) {
      parsed.aboutThisContent = { actions };
    }

    // Parse signature info and credentials
    const aboutTheseCredentials = parseSignatureInfo(manifest);
    if (aboutTheseCredentials) {
      parsed.aboutTheseCredentials = aboutTheseCredentials;
    }

    // Parse validation information
    const validationInfo = parseValidationResults(root, manifest);
    if (validationInfo) {
      parsed.validationInfo = validationInfo;
    }
  } catch (error) {
    logger.error('Error parsing JSON manifest', error);
  }

  return parsed;
}

/**
 * Parse creator information from claim_generator_info
 */
function parseCreatorInfo(manifest: Record<string, unknown>): WhoThisComesFrom | undefined {
  const claimGenInfo = manifest.claim_generator_info;
  if (!Array.isArray(claimGenInfo) || claimGenInfo.length === 0) return undefined;

  const identities: CreatorIdentity[] = [];
  for (const gen of claimGenInfo) {
    if (gen && typeof gen === 'object') {
      const g = gen as Record<string, unknown>;
      const name = typeof g.name === 'string' ? g.name : undefined;
      const version = typeof g.version === 'string' ? g.version : undefined;

      if (name) {
        const identity: CreatorIdentity = { name };
        if (version) identity.identifier = `v${version}`;
        identities.push(identity);
      }
    }
  }

  return identities.length > 0 ? { otherIdentities: identities } : undefined;
}

/**
 * Parse actions from assertions
 */
function parseActions(manifest: Record<string, unknown>): ContentAction[] {
  const actions: ContentAction[] = [];
  const assertions = manifest.assertions;

  if (Array.isArray(assertions)) {
    for (const assertion of assertions) {
      if (assertion && typeof assertion === 'object') {
        const a = assertion as Record<string, unknown>;
        if (a.label === 'c2pa.actions.v2' && a.data && typeof a.data === 'object') {
          const data = a.data as Record<string, unknown>;
          const actionsArray = data.actions;
          if (Array.isArray(actionsArray)) {
            for (const actionItem of actionsArray) {
              if (actionItem && typeof actionItem === 'object') {
                const item = actionItem as Record<string, unknown>;
                const actionStr = typeof item.action === 'string' ? item.action : null;
                if (actionStr) {
                  const act: ContentAction = { action: actionStr };
                  if (typeof item.softwareAgent === 'string')
                    act.softwareAgent = item.softwareAgent;
                  if (typeof item.when === 'string') act.when = item.when;
                  if (item.parameters && typeof item.parameters === 'object')
                    act.parameters = item.parameters as Record<string, unknown>;
                  actions.push(act);
                }
              }
            }
          }
        }
      }
    }
  }

  return actions;
}

/**
 * Parse signature information for credentials
 */
function parseSignatureInfo(
  manifest: Record<string, unknown>
): { claimSigner?: string; timestamp?: string; signedBy?: string } | undefined {
  const sigInfo = manifest.signature_info || manifest.signature;
  if (!sigInfo || typeof sigInfo !== 'object') return undefined;

  const sig = sigInfo as Record<string, unknown>;
  const result: { claimSigner?: string; timestamp?: string; signedBy?: string } = {};

  if (typeof sig.common_name === 'string') result.claimSigner = sig.common_name;
  if (typeof sig.issuer === 'string' && !result.claimSigner) result.signedBy = sig.issuer;
  if (typeof sig.time === 'string') result.timestamp = sig.time;

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Parse validation results and certificate info
 */
function parseValidationResults(
  root: Record<string, unknown>,
  manifest: Record<string, unknown>
): ValidationInfo | undefined {
  const validationInfo: ValidationInfo = {};

  // Parse certificate from signature_info
  const sigInfo = manifest.signature_info || manifest.signature;
  if (sigInfo && typeof sigInfo === 'object') {
    const sig = sigInfo as Record<string, unknown>;
    const cert: NonNullable<ValidationInfo['certificate']> = {};

    if (typeof sig.issuer === 'string') cert.issuer = sig.issuer;
    if (typeof sig.common_name === 'string') cert.subject = sig.common_name;
    if (typeof sig.cert_serial_number === 'string') cert.serialNumber = sig.cert_serial_number;
    if (typeof sig.time === 'string') cert.validFrom = sig.time;

    if (Object.keys(cert).length > 0) {
      validationInfo.certificate = cert;
    }
  }

  // Parse trust/validation status
  const trustInfo: string[] = [];
  const validationStatus = root.validation_status;
  if (Array.isArray(validationStatus)) {
    for (const status of validationStatus) {
      if (status && typeof status === 'object') {
        const s = status as Record<string, unknown>;
        if (typeof s.explanation === 'string') {
          trustInfo.push(s.explanation);
        }
      }
    }
  }

  if (trustInfo.length > 0) {
    validationInfo.trustInfo = trustInfo;
  }

  return Object.keys(validationInfo).length > 0 ? validationInfo : undefined;
}





