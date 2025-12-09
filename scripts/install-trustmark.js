#!/usr/bin/env node

/**
 * Post-install script to automatically install Python TrustMark dependencies
 * Runs after npm install completes
 */

const { execSync } = require('child_process');
const os = require('os');

console.log('\n📦 Installing Python TrustMark dependencies...\n');

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
  const pythonCmd = checkPython();
  
  if (!pythonCmd) {
    console.log('⚠️  Python 3 not found!\n');
    console.log('TrustMark watermark detection requires Python 3.8.5 or higher.\n');
    console.log('Installation instructions:');
    console.log('  • macOS: brew install python3');
    console.log('  • Ubuntu: sudo apt install python3 python3-pip');
    console.log('  • Windows: Download from python.org\n');
    console.log('After installing Python, run: npm run install-trustmark\n');
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
  console.log('  MCP Content Credentials - TrustMark Setup');
  console.log('═══════════════════════════════════════════════════════\n');

  const success = installTrustMark();

  if (success) {
    console.log('✅ TrustMark installation complete!\n');
    console.log('Your MCP server can now detect:');
    console.log('  • Embedded C2PA manifests (via c2patool)');
    console.log('  • TrustMark watermarks (via Python TrustMark)\n');
    console.log('Start your server: npm start\n');
  } else {
    console.log('⚠️  TrustMark installation incomplete\n');
    console.log('The server will still work for embedded C2PA manifests.');
    console.log('Watermark detection will be disabled until TrustMark is installed.\n');
    console.log('To install TrustMark manually:');
    console.log('  pip3 install trustmark Pillow\n');
    console.log('See INSTALL_TRUSTMARK.md for detailed instructions.\n');
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// Run if executed directly (not required)
if (require.main === module) {
  main();
}

module.exports = { main };

