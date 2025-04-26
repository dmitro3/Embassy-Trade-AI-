// Add this file to provide a central place for API key access
// This ensures keys are loaded from .env and properly used across the application

const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../.env' });

/**
 * API Keys and Configuration
 * Securely manages access to API keys and configuration values
 */
const apiKeys = {
  // Solana
  solanaDevnetAddress: process.env.SOLANA_DEVNET_ADDRESS || 'Gzf96o4iZdPtytRdoqVwo1fbzgQ4AkhwtET3LhG3p8dS',
  
  // External APIs
  shyft: {
    apiKey: process.env.SHYFT_API_KEY || 'whv00T87G8Sd8TeK',
    websocketUrl: process.env.SHYFT_WEBSOCKET_URL || 'wss://devnet-rpc.shyft.to?api_key=whv00T87G8Sd8TeK'
  },
  
  birdeye: {
    apiKey: process.env.BIRDEYE_API_KEY || ''
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  
  photon: {
    privateKey: process.env.PHOTON_PRIVATE_KEY || ''
  },
  
  swapService: {
    apiKey: process.env.SWAP_SERVICE_API_KEY || ''
  },
  
  grok: {
    apiKey: process.env.GROK_API_KEY || ''
  },
  
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || ''
  },
  
  axiom: {
    apiKey: process.env.AXIOM_API_KEY || ''
  },
  
  sentry: {
    dsn: process.env.SENTRY_DSN || ''
  }
};

// Feature flags
const features = {
  enableRaydium: process.env.ENABLE_RAYDIUM_INTEGRATION === 'true',
  enableJupiter: process.env.ENABLE_JUPITER_INTEGRATION === 'true',
  enablePhoton: process.env.ENABLE_PHOTON_INTEGRATION === 'true',
  enableDexScreener: process.env.ENABLE_DEXSCREENER_INTEGRATION === 'true',
  enablePumpFun: process.env.ENABLE_PUMPFUN_INTEGRATION === 'true',
  enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true'
};

/**
 * Get API key for a specific service
 * @param {string} service - Service name
 * @returns {string} - API key for the service
 */
function getApiKey(service) {
  switch (service) {
    case 'shyft':
      return apiKeys.shyft.apiKey;
    case 'birdeye':
      return apiKeys.birdeye.apiKey;
    case 'openai':
      return apiKeys.openai.apiKey;
    case 'photon':
      return apiKeys.photon.privateKey;
    case 'swap':
      return apiKeys.swapService.apiKey;
    case 'grok':
      return apiKeys.grok.apiKey;
    case 'firebase':
      return apiKeys.firebase.apiKey;
    case 'axiom':
      return apiKeys.axiom.apiKey;
    default:
      console.warn(`API key for ${service} not found`);
      return '';
  }
}

// Export configuration
module.exports = {
  apiKeys,
  features,
  getApiKey
};
