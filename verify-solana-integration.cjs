// Verify Solana Integration Configuration
// This script validates that the TradeForce AI application
// is correctly configured for real Solana wallet integration

const fs = require('fs');
const path = require('path');

async function verifyConfiguration() {
  console.log('\n=== TradeForce AI Solana Integration Verification ===\n');
  
  try {
    // Check wallet configuration
    console.log('Checking wallet configuration...');
    const walletConfigPath = path.join(__dirname, 'lib', 'walletConfig.js');
    
    if (!fs.existsSync(walletConfigPath)) {
      console.error('❌ ERROR: walletConfig.js not found!');
      return false;
    }
    
    const walletConfigContent = await fs.promises.readFile(walletConfigPath, 'utf8');
    
    // Verify essential settings
    const requiredSettings = {
      'minTransactions: 0': walletConfigContent.includes('minTransactions: 0'),
      'enableMockData: false': walletConfigContent.includes('enableMockData: false'),
      'requireSignature: true': walletConfigContent.includes('requireSignature: true'),
      'networkEndpoint: devnet': walletConfigContent.includes('api.devnet.solana.com'),
    };
    
    let configValid = true;
    for (const [setting, isPresent] of Object.entries(requiredSettings)) {
      if (isPresent) {
        console.log(`✅ ${setting}: Correctly configured`);
      } else {
        console.error(`❌ ${setting}: Missing or incorrect`);
        configValid = false;
      }
    }
    
    // Check for .env.local
    console.log('\nChecking environment configuration...');
    const envPath = path.join(__dirname, '.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = await fs.promises.readFile(envPath, 'utf8');
      
      if (envContent.includes('SOLANA_NETWORK=devnet')) {
        console.log('✅ SOLANA_NETWORK: Correctly set to devnet');
      } else {
        console.error('❌ SOLANA_NETWORK: Not set to devnet');
        configValid = false;
      }
      
      if (envContent.includes('USE_REAL_SOLANA_WALLET=true')) {
        console.log('✅ USE_REAL_SOLANA_WALLET: Correctly enabled');
      } else {
        console.error('❌ USE_REAL_SOLANA_WALLET: Not enabled');
        configValid = false;
      }
    } else {
      console.warn('⚠️ .env.local file not found, environment may not be properly configured');
    }
    
    // Check for mock wallet data
    console.log('\nChecking for mock wallet data...');
    const testWalletPath = path.join(__dirname, 'public', 'test-wallets.json');
    
    if (fs.existsSync(testWalletPath)) {
      console.warn('⚠️ test-wallets.json file found. This may interfere with real wallet connections.');
      configValid = false;
    } else {
      console.log('✅ No mock wallet data found - good!');
    }
    
    // Final verdict
    if (configValid) {
      console.log('\n✅ VERIFICATION PASSED: TradeForce AI is correctly configured for real Solana wallet integration.');
    } else {
      console.error('\n❌ VERIFICATION FAILED: Configuration issues found. Please run start-solana-real.bat to fix them.');
    }
    
    return configValid;
  } catch (error) {
    console.error('Error verifying configuration:', error);
    return false;
  }
}

// Run verification
verifyConfiguration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error during verification:', error);
  process.exit(1);
});
