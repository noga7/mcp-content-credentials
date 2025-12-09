#!/usr/bin/env node

/**
 * TrustMark Diagnostic Test
 * 
 * Tests TrustMark detection with detailed logging
 */

import { createTrustMarkService } from './build/trustmark-service.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTrustMark(imagePath) {
  console.log('='.repeat(60));
  console.log('TrustMark Diagnostic Test');
  console.log('='.repeat(60));
  console.log(`Image: ${imagePath}\n`);

  const trustMarkService = createTrustMarkService();

  try {
    console.log('🔍 Detecting TrustMark watermark...\n');
    const result = await trustMarkService.detectWatermark(imagePath);

    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.success && result.hasWatermark && result.watermarkData) {
      console.log('✅ TrustMark watermark FOUND!');
      console.log('   Identifier:', result.watermarkData.identifier);
      console.log('   Schema:', result.watermarkData.schema);
      if (result.watermarkData.manifestUrl) {
        console.log('   Manifest URL:', result.watermarkData.manifestUrl);
      }
    } else if (result.success && !result.hasWatermark) {
      console.log('❌ No TrustMark watermark detected');
    } else if (!result.success) {
      console.log('⚠️  TrustMark detection failed');
      console.log('   Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Exception thrown:', error.message);
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
}

// Get image path from command line
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('Usage: node test-trustmark.js <image-path>');
  process.exit(1);
}

testTrustMark(imagePath);

