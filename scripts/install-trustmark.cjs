#!/usr/bin/env node

/**
 * Post-install script to automatically install dependencies:
 * - Python TrustMark (for watermark detection)
 * - c2pa-node is installed via npm dependencies
 * 
 * Runs after npm install completes
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

console.log('\n📦 Installing Content Credentials dependencies...\n');

/**
 * Try to execute a command and return success status
 */
function tryCommand(command, description) {
  try {
    console.log(`  ⏳ ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`  ✅ ${description} - Success!\n`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${description} - Failed\n`);
    return false;
  }
}

/**
 * Try to execute a command silently and return success status
 */
function tryCommandSilent(command) {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Python 3 is available
 */
function checkPython() {
  const pythonCommands = ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
      console.log(`  ✅ Found Python: ${version.trim()}\n`);
      return cmd;
    } catch (error) {
      // Try next command
    }
  }
  
  return null;
}

/**
 * Install TrustMark
 */
function installTrustMark() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Installing TrustMark (Watermark Detection)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const pythonCmd = checkPython();
  
  if (!pythonCmd) {
    console.log('⚠️  Python 3 not found!\n');
    console.log('TrustMark watermark detection requires Python 3.8.5 or higher.\n');
    console.log('Installation instructions:');
    console.log('  • macOS: brew install python3');
    console.log('  • Ubuntu: sudo apt install python3 python3-pip');
    console.log('  • Windows: Download from python.org\n');
    console.log('After installing Python, run: npm run install-deps\n');
    return false;
  }

  // Determine pip command
  const pipCommands = ['pip3', 'pip'];
  let pipCmd = null;
  
  for (const cmd of pipCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' });
      pipCmd = cmd;
      break;
    } catch (error) {
      // Try next command
    }
  }
  
  if (!pipCmd) {
    console.log('⚠️  pip not found!\n');
    console.log('Install pip and try again: python3 -m ensurepip\n');
    return false;
  }

  // Try installing with pip
  console.log(`  Using pip command: ${pipCmd}\n`);
  
  const installSuccess = tryCommand(
    `${pipCmd} install --user trustmark Pillow`,
    'Installing TrustMark and Pillow'
  );

  if (!installSuccess) {
    // Try alternative installation methods
    console.log('  Trying alternative installation method...\n');
    const altSuccess = tryCommand(
      `${pythonCmd} -m pip install --user trustmark Pillow`,
      'Installing with python -m pip'
    );
    
    if (!altSuccess) {
      console.log('⚠️  TrustMark installation failed\n');
      console.log('Manual installation:');
      console.log(`  ${pipCmd} install trustmark Pillow\n`);
      console.log('Or:');
      console.log(`  ${pythonCmd} -m pip install trustmark Pillow\n`);
      return false;
    }
  }

  // Verify installation
  try {
    console.log('  ⏳ Verifying TrustMark installation...');
    execSync(
      `${pythonCmd} -c "from trustmark import TrustMark; print('TrustMark version:', TrustMark.__version__ if hasattr(TrustMark, '__version__') else 'installed')"`,
      { stdio: 'inherit' }
    );
    console.log('  ✅ TrustMark verification - Success!\n');
    return true;
  } catch (error) {
    console.log('  ⚠️  TrustMark verification failed\n');
    return false;
  }
}

/**
 * Main installation process
 */
function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MCP Content Credentials - Dependency Setup');
  console.log('═══════════════════════════════════════════════════════\n');

  let trustmarkSuccess = false;

  // Note: c2pa-node is installed via npm dependencies automatically
  console.log('  ℹ️  @contentauth/c2pa-node installed via npm dependencies\n');

  // Install TrustMark
  try {
    trustmarkSuccess = installTrustMark();
  } catch (error) {
    console.log('⚠️  TrustMark installation error:', error.message, '\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Installation Summary');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Your MCP server can now detect:\n');
  
  console.log('  ✅ Embedded C2PA manifests (via @contentauth/c2pa-node)');
  
  if (trustmarkSuccess) {
    console.log('  ✅ TrustMark watermarks (via Python TrustMark)');
  } else {
    console.log('  ⚠️  TrustMark watermarks (Python TrustMark not installed)');
  }

  console.log('');

  if (trustmarkSuccess) {
    console.log('🎉 All dependencies installed successfully!\n');
    console.log('Start your server: npm start\n');
  } else {
    console.log('⚠️  @contentauth/c2pa-node installed, TrustMark needs manual setup\n');
    console.log('The server will work for embedded C2PA manifests.');
    console.log('See above for manual TrustMark installation instructions.\n');
    console.log('To retry installation: npm run install-deps\n');
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// Run if executed directly (not required)
if (require.main === module) {
  main();
}

module.exports = { main };

