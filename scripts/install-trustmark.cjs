#!/usr/bin/env node

/**
 * Post-install script to automatically install dependencies:
 * - c2patool (for embedded C2PA manifests)
 * - Python TrustMark (for watermark detection)
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
 * Check if c2patool is installed
 */
function checkC2PATool() {
  try {
    const version = execSync('c2patool --version', { encoding: 'utf8', stdio: 'pipe' });
    console.log(`  ✅ Found c2patool: ${version.trim()}\n`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Install c2patool
 */
function installC2PATool() {
  const platform = os.platform();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Installing c2patool (C2PA Manifest Reader)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (checkC2PATool()) {
    console.log('✅ c2patool already installed!\n');
    return true;
  }

  console.log('  c2patool not found. Attempting installation...\n');

  // Try platform-specific installation
  if (platform === 'darwin') {
    // macOS - try Homebrew
    if (tryCommandSilent('which brew')) {
      console.log('  Found Homebrew, installing c2patool...\n');
      const success = tryCommand(
        'brew install contentauth/tools/c2patool',
        'Installing c2patool via Homebrew'
      );
      if (success) return true;
    } else {
      console.log('  ℹ️  Homebrew not found\n');
    }
  } else if (platform === 'linux') {
    // Linux - try to download binary
    console.log('  Downloading c2patool binary for Linux...\n');
    const arch = os.arch();
    const archMap = {
      'x64': 'x86_64',
      'arm64': 'aarch64'
    };
    const linuxArch = archMap[arch] || arch;
    
    try {
      // Get latest release URL
      const downloadUrl = `https://github.com/contentauth/c2pa-rs/releases/latest/download/c2patool-linux-${linuxArch}`;
      const installPath = `${os.homedir()}/.local/bin/c2patool`;
      
      // Create bin directory if it doesn't exist
      execSync(`mkdir -p ${os.homedir()}/.local/bin`, { stdio: 'pipe' });
      
      // Download and install
      execSync(`curl -L "${downloadUrl}" -o "${installPath}"`, { stdio: 'inherit' });
      execSync(`chmod +x "${installPath}"`, { stdio: 'pipe' });
      
      console.log(`  ✅ c2patool installed to ${installPath}\n`);
      console.log(`  ⚠️  Add to PATH: export PATH="$HOME/.local/bin:$PATH"\n`);
      return true;
    } catch (error) {
      console.log('  ❌ Binary download failed\n');
    }
  }

  // If we get here, automatic installation failed
  console.log('⚠️  Could not install c2patool automatically\n');
  console.log('Manual installation instructions:\n');
  
  if (platform === 'darwin') {
    console.log('  macOS:');
    console.log('    brew install contentauth/tools/c2patool\n');
  } else if (platform === 'linux') {
    console.log('  Linux:');
    console.log('    Download from: https://github.com/contentauth/c2pa-rs/releases');
    console.log('    Or use Cargo: cargo install c2pa-tool\n');
  } else if (platform === 'win32') {
    console.log('  Windows:');
    console.log('    Download from: https://github.com/contentauth/c2pa-rs/releases');
    console.log('    Or use Cargo: cargo install c2pa-tool\n');
  }
  
  return false;
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

  let c2patoolSuccess = false;
  let trustmarkSuccess = false;

  // Install c2patool
  try {
    c2patoolSuccess = installC2PATool();
  } catch (error) {
    console.log('⚠️  c2patool installation error:', error.message, '\n');
  }

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
  
  if (c2patoolSuccess) {
    console.log('  ✅ Embedded C2PA manifests (via c2patool)');
  } else {
    console.log('  ⚠️  Embedded C2PA manifests (c2patool not installed)');
  }
  
  if (trustmarkSuccess) {
    console.log('  ✅ TrustMark watermarks (via Python TrustMark)');
  } else {
    console.log('  ⚠️  TrustMark watermarks (Python TrustMark not installed)');
  }

  console.log('');

  if (c2patoolSuccess && trustmarkSuccess) {
    console.log('🎉 All dependencies installed successfully!\n');
    console.log('Start your server: npm start\n');
  } else if (c2patoolSuccess || trustmarkSuccess) {
    console.log('⚠️  Some dependencies installed successfully\n');
    console.log('The server will work with installed components.');
    console.log('See above for manual installation instructions.\n');
    console.log('To retry installation: npm run install-deps\n');
  } else {
    console.log('⚠️  No dependencies installed automatically\n');
    console.log('Please install manually (see above instructions).');
    console.log('To retry installation: npm run install-deps\n');
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

// Run if executed directly (not required)
if (require.main === module) {
  main();
}

module.exports = { main };

