#!/usr/bin/env node

// Compare c2patool outputs (-d vs normal) with c2pa-node Reader.json()
// Usage: npm run compare -- /path/to/media.jpg

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createC2PAService } from '../build/c2pa-service.js';

const execFileAsync = promisify(execFile);

async function getC2paToolOutput(filePath, detailed = false) {
  const args = [filePath];
  if (detailed) args.push('-d');
  try {
    const { stdout, stderr } = await execFileAsync('c2patool', args, { maxBuffer: 10 * 1024 * 1024 });
    return { stdout, stderr };
  } catch (err) {
    return { stdout: '', stderr: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run compare -- <file-path>');
    process.exit(1);
  }

  console.log('=== c2patool (normal) ===');
  const normal = await getC2paToolOutput(filePath, false);
  console.log(normal.stdout || normal.stderr || '(no output)');

  console.log('\n=== c2patool (-d detailed) ===');
  const detailed = await getC2paToolOutput(filePath, true);
  console.log(detailed.stdout || detailed.stderr || '(no output)');

  console.log('\n=== c2pa-node Reader.json() via service ===');
  try {
    const service = createC2PAService();
    const result = await service.readCredentialsFromFile(filePath);
    // Show manifestData and rawOutput
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Failed to read via service:', err instanceof Error ? err.message : err);
  }
}

await main();
