#!/usr/bin/env node

// Simple runner to test reading credentials from a file
// Usage:
//   npm run read-file -- /absolute/or/relative/path/to/media.ext

import { createC2PAService } from '../build/c2pa-service.js';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run read-file -- <file-path>');
    process.exit(1);
  }

  const service = createC2PAService();
  try {
    const result = await service.readCredentialsFromFile(filePath);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error('Failed to read credentials:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

await main();
