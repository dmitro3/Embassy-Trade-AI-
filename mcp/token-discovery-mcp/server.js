/**
 * Token Discovery MCP Server
 * 
 * This server provides token discovery capabilities for the TradeForce AI
 * trading system, including integration with BirdEye, DexScreener, and
 * other token discovery platforms.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const BirdEyeConnector = require('./connectors/birdeye-connector');
const DexScreenerConnector = require('./connectors/dexscreener-connector');
const PumpFunConnector = require('./connectors/pumpfun-connector');

// Load environment variables
require('dotenv').config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 3002;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Configuration path for user settings
const USER_CONFIG_PATH = path.join(__dirname, 'config', 'user-config.json');
const DEFAULT_CONFIG_PATH = path.join(__dirname, 'config', 'default-config.json');

// Ensure config directory exists
if (!fs.existsSync(path.join(__dirname, 'config'))) {
  fs.mkdirSync(path.join(__dirname, 'config'), { recursive: true });
}

// Load or create user configuration
function loadUserConfig() {
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(USER_CONFIG_PATH, 'utf8'));
      console.log('Loaded user configuration');
      return config;
    } else {
      // Create default configuration if none exists
      const defaultConfig = {
        scanInterval: 15, // minutes
        filters: {
          birdeye: {
            minLiquidity: 2000,
            maxLiquidity: 300000,
            minHolders: 15,
            maxAgeHours: 72,
            minPriceChangePercent: 5,
            riskTolerance: 'moderate'
          },
          dexscreener: {
            minLiquidity: 2000,
            maxLiquidity: 300000,
            minPriceChange: 10,
            minVolume: 1000,
            excludedDexes: []
          },
          pumpfun: {
            maxAgeHours: 24,
            minHolders: 20,
            minLiquidity: 5000, 
            maxLiquidity: 500000,
            minPriceChangePercent: 10,
            minBuyRatio: 1.5,
            riskTolerance: 'moderate'
          }
        },
        sources: {
          birdeye: true,
          dexscreener: true,
          pumpfun: true
        },
        advanced: {
          scoreThreshold: 65,
          maxResults: 50,
          autoRefresh: true,
          notifications: true
        }
      };
      
      // Save default config
      fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log('Created default user configuration');
      return defaultConfig;
    }
  } catch (error) {
    console.error('Error loading user configuration:', error);
    return {
      scanInterval: 15,
      filters: {
        birdeye: { minLiquidity: 2000, maxLiquidity: 300000 },
        dexscreener: { minLiquidity: 2000, maxLiquidity: 300000 },
        pumpfun: { minLiquidity: 5000, maxLiquidity: 500000 }
      },
      sources: { birdeye: true, dexscreener: true, pumpfun: true },
      advanced: { scoreThreshold: 65, maxResults: 50 }
    };
  }
}

// Initialize user configuration
const userConfig = loadUserConfig();

// Initialize advanced risk assessment
const RiskAssessment = require('./services/risk-assessment');
const riskAssessment = new RiskAssessment();

// Initialize connectors with API keys from our secure config
const birdeye = new BirdEyeConnector({
  apiKey: getApiKey('birdeye')
});
const dexscreener = new DexScreenerConnector();
const pumpfun = new PumpFunConnector();

// Log available connectors
console.log('MCP Token Discovery initialized with connectors:');
console.log('- BirdEye:', !!getApiKey('birdeye') ? 'ENABLED' : 'DISABLED (no API key)');
console.log('- DexScreener:', 'ENABLED');
console.log('- PumpFun:', 'ENABLED');
console.log('- SHYFT Integration:', !!getApiKey('shyft') ? 'ENABLED' : 'DISABLED (no API key)');

// Bot status tracking
let botStatus = {
  isRunning: true,
  startedAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  connectors: {
    birdeye: true,
    dexscreener: true
  }
};

// Scheduled job for routine scanning
let scanJob = null;
let lastScanResults = {
  timestamp: null,
  birdeye: [],
  dexscreener: []
};

// Start bot scan job
function startScanJob(intervalMinutes = 15) {
  if (scanJob) {
    clearInterval(scanJob);
  }

  console.log(`Starting token scan job at ${intervalMinutes} minute intervals`);
  
  // Run initial scan immediately
  performTokenScan();
  
  // Set up recurring job
  scanJob = setInterval(performTokenScan, intervalMinutes * 60 * 1000);
  
  botStatus.isRunning = true;
  botStatus.startedAt = new Date().toISOString();
}

// Stop bot scan job
function stopScanJob() {
  if (scanJob) {
    clearInterval(scanJob);
    scanJob = null;
  }
  
  botStatus.isRunning = false;
}

// Perform token scan
async function performTokenScan() {
  try {
    console.log('Performing token scan...');
    botStatus.lastActivity = new Date().toISOString();
    
    // Get opportunities from each connector in parallel
    const [birdeyeResults, dexscreenerResults] = await Promise.all([
      birdeye.findSnipeOpportunities({
        minLiquidity: 2000,
        maxLiquidity: 300000,
        minHolders: 15,
        maxAgeHours: 72
      }).catch(err => {
        console.error('Error fetching BirdEye opportunities:', err);
        botStatus.connectors.birdeye = false;
        return [];
      }),
      dexscreener.findSnipeOpportunities({
        minLiquidity: 2000,
        maxLiquidity: 300000,
        minPriceChange: 10
      }).catch(err => {
        console.error('Error fetching DexScreener opportunities:', err);
        botStatus.connectors.dexscreener = false;
        return [];
      })
    ]);
    
    // Update connector status
    botStatus.connectors.birdeye = birdeyeResults.length > 0;
    botStatus.connectors.dexscreener = dexscreenerResults.length > 0;
    
    // Store results
    lastScanResults = {
      timestamp: new Date().toISOString(),
      birdeye: birdeyeResults,
      dexscreener: dexscreenerResults
    };
    
    console.log(`Token scan complete. Found ${birdeyeResults.length} BirdEye and ${dexscreenerResults.length} DexScreener opportunities`);
  } catch (error) {
    console.error('Error in token scan job:', error);
  }
}

/**
 * ROUTES
 */

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    healthy: true,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    message: 'Token Discovery MCP Server is running'
  });
});

// Get available tools
// Import API key manager to use credentials securely
const { apiKeys, features, getApiKey } = require('./config/api-keys');

// Bot status endpoint - this specific endpoint is what TradeForce frontend is looking for
app.get('/get_bot_status', (req, res) => {
  res.json({
    status: 'active',
    isRunning: botStatus.isRunning,
    startedAt: botStatus.startedAt,
    lastActivity: botStatus.lastActivity,
    connectors: {
      ...botStatus.connectors,
      birdeye: botStatus.connectors.birdeye && !!getApiKey('birdeye'),
      jupiter: features.enableJupiter,
      raydium: features.enableRaydium,
      photon: features.enablePhoton && !!getApiKey('photon'),
      shyft: !!getApiKey('shyft'),
      dexscreener: features.enableDexScreener,
      pumpfun: features.enablePumpFun,
      grok: !!getApiKey('grok')
    },
    lastScanTimestamp: lastScanResults.timestamp,
    tools: [
      'scan_new_tokens',
      'analyze_token',
      'monitor_token',
      'get_snipe_opportunities',
      'get_bot_status',
      'start_bot',
      'stop_bot'
    ],
    apiStatus: {
      birdeye: !!getApiKey('birdeye'),
      shyft: !!getApiKey('shyft'),
      openai: !!getApiKey('openai'),
      photon: !!getApiKey('photon'),
      grok: !!getApiKey('grok')
    }
  });
});

app.get('/tools', (req, res) => {
  res.json({
    tools: {
      'scan_new_tokens': {
        name: 'scan_new_tokens',
        description: 'Scan for new tokens on supported platforms',
        parameters: {
          limit: 'Number of tokens to return (default: 20)',
          minAge: 'Minimum token age in hours',
          maxAge: 'Maximum token age in hours'
        }
      },
      'analyze_token': {
        name: 'analyze_token',
        description: 'Analyze a specific token',
        parameters: {
          tokenAddress: 'Token address to analyze'
        }
      },
      'monitor_token': {
        name: 'monitor_token',
        description: 'Add a token to monitoring list',
        parameters: {
          tokenAddress: 'Token address to monitor'
        }
      },
      'get_snipe_opportunities': {
        name: 'get_snipe_opportunities',
        description: 'Get current snipe opportunities',
        parameters: {
          source: 'Source platform (birdeye, dexscreener, all)',
          limit: 'Number of opportunities to return',
          minLiquidity: 'Minimum liquidity in USD',
          maxLiquidity: 'Maximum liquidity in USD'
        }
      },
      'get_bot_status': {
        name: 'get_bot_status',
        description: 'Get token discovery bot status'
      },
      'start_bot': {
        name: 'start_bot',
        description: 'Start token discovery bot',
        parameters: {
          intervalMinutes: 'Scan interval in minutes'
        }
      },
      'stop_bot': {
        name: 'stop_bot',
        description: 'Stop token discovery bot'
      }
    }
  });
});

// Tool: Get bot status
app.get('/tools/get_bot_status', (req, res) => {
  res.json({
    isRunning: botStatus.isRunning,
    startedAt: botStatus.startedAt,
    lastActivity: botStatus.lastActivity,
    connectors: botStatus.connectors,
    lastScanTimestamp: lastScanResults.timestamp
  });
});

// Tool: Start bot
app.post('/tools/start_bot', (req, res) => {
  const intervalMinutes = req.body.intervalMinutes || 15;
  startScanJob(intervalMinutes);
  
  res.json({
    success: true,
    message: `Bot started with ${intervalMinutes} minute intervals`,
    botStatus
  });
});

// Tool: Stop bot
app.post('/tools/stop_bot', (req, res) => {
  stopScanJob();
  
  res.json({
    success: true,
    message: 'Bot stopped',
    botStatus
  });
});

// Tool: Scan new tokens
app.post('/tools/scan_new_tokens', async (req, res) => {
  try {
    const {
      limit = 20,
      minAge = 0,
      maxAge = 72,
      platform = 'all'
    } = req.body;
    
    let results = [];
    
    if (platform === 'all' || platform === 'birdeye') {
      const birdeyeTokens = await birdeye.getNewTokens(limit);
      results = [
        ...results,
        ...birdeyeTokens
          .filter(token => {
            const ageHours = (Date.now() - (token.addTime * 1000)) / (1000 * 60 * 60);
            return ageHours >= minAge && ageHours <= maxAge;
          })
          .map(token => ({
            ...token,
            source: 'birdeye'
          }))
      ];
    }
    
    if (platform === 'all' || platform === 'dexscreener') {
      const dexscreenerPairs = await dexscreener.getNewPairs(limit);
      results = [
        ...results,
        ...dexscreenerPairs.map(pair => ({
          address: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: pair.priceUsd,
          liquidity: pair.liquidity?.usd,
          volume24h: pair.volume?.h24,
          priceChange24h: pair.priceChange?.h24,
          source: 'dexscreener'
        }))
      ];
    }
    
    res.json({
      success: true,
      count: results.length,
      data: results.slice(0, limit)
    });
  } catch (error) {
    console.error('Error scanning new tokens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Analyze token
app.post('/tools/analyze_token', async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token address is required'
      });
    }
    
    // Get token data from both sources
    const [birdeyeData, dexscreenerData] = await Promise.all([
      birdeye.getTokenMarketData(tokenAddress).catch(err => null),
      dexscreener.getTokenByAddress(tokenAddress).catch(err => [])
    ]);
    
    // Get additional metadata
    const metadata = await birdeye.getTokenMetadata(tokenAddress).catch(err => null);
    
    // Combine data
    const analysis = {
      address: tokenAddress,
      metadata: metadata,
      birdeye: birdeyeData,
      dexscreener: dexscreenerData && dexscreenerData.length > 0 ? dexscreenerData[0] : null,
      analysis: {
        riskScore: calculateRiskScore(birdeyeData, dexscreenerData),
        potentialScore: calculatePotentialScore(birdeyeData, dexscreenerData),
        recommendation: generateRecommendation(birdeyeData, dexscreenerData)
      }
    };
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Get snipe opportunities
app.post('/tools/get_snipe_opportunities', async (req, res) => {
  try {
    const {
      source = 'all',
      limit = 20,
      minLiquidity = 2000,
      maxLiquidity = 300000,
      minPriceChange = 5,
      refresh = false
    } = req.body;
    
    let opportunities = [];
    
    // If refresh is true or no previous scan results
    if (refresh || !lastScanResults.timestamp) {
      // Fetch new opportunities
      if (source === 'all' || source === 'birdeye') {
        const birdeyeResults = await birdeye.findSnipeOpportunities({
          minLiquidity,
          maxLiquidity,
          minHolders: 15,
          maxAgeHours: 72
        });
        
        opportunities = [
          ...opportunities,
          ...birdeyeResults.map(token => ({
            ...token,
            source: 'birdeye'
          }))
        ];
      }
      
      if (source === 'all' || source === 'dexscreener') {
        const dexscreenerResults = await dexscreener.findSnipeOpportunities({
          minLiquidity,
          maxLiquidity,
          minPriceChange
        });
        
        opportunities = [
          ...opportunities,
          ...dexscreenerResults.map(pair => ({
            address: pair.baseToken?.address,
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
            price: pair.priceUsd,
            liquidity: pair.liquidity?.usd,
            volume24h: pair.volume?.h24,
            priceChange24h: pair.priceChange?.h24,
            score: pair.score,
            pairAddress: pair.pairAddress,
            source: 'dexscreener'
          }))
        ];
      }
    } else {
      // Use cached results
      if (source === 'all' || source === 'birdeye') {
        opportunities = [
          ...opportunities,
          ...lastScanResults.birdeye.map(token => ({
            ...token,
            source: 'birdeye'
          }))
        ];
      }
      
      if (source === 'all' || source === 'dexscreener') {
        opportunities = [
          ...opportunities,
          ...lastScanResults.dexscreener.map(pair => ({
            address: pair.baseToken?.address,
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
            price: pair.priceUsd,
            liquidity: pair.liquidity?.usd,
            volume24h: pair.volume?.h24,
            priceChange24h: pair.priceChange?.h24,
            score: pair.score,
            pairAddress: pair.pairAddress,
            source: 'dexscreener'
          }))
        ];
      }
    }
    
    // Sort by score and limit results
    opportunities.sort((a, b) => b.score - a.score);
    
    res.json({
      success: true,
      count: opportunities.length,
      lastUpdated: lastScanResults.timestamp || new Date().toISOString(),
      data: opportunities.slice(0, limit)
    });
  } catch (error) {
    console.error('Error getting snipe opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tool: Monitor token
app.post('/tools/monitor_token', async (req, res) => {
  try {
    const { tokenAddress } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token address is required'
      });
    }
    
    // In a real implementation, we would add this token to a database
    // For simplicity, we'll just pretend to do so
    
    res.json({
      success: true,
      message: `Token ${tokenAddress} added to monitoring`,
      monitoringEnabled: true
    });
  } catch (error) {
    console.error('Error monitoring token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * HELPER FUNCTIONS
 */

// Calculate risk score for a token
function calculateRiskScore(birdeyeData, dexscreenerData) {
  // This is a simple implementation - would be more sophisticated in production
  let riskScore = 50; // Default medium risk
  
  // Adjust based on BirdEye data
  if (birdeyeData) {
    // Liquidity factor - lower liquidity is higher risk
    const liquidity = birdeyeData.liquidity || 0;
    if (liquidity < 5000) riskScore += 20;
    else if (liquidity < 20000) riskScore += 10;
    else if (liquidity > 100000) riskScore -= 10;
    
    // Holders factor - fewer holders is higher risk
    const holders = birdeyeData.holders || 0;
    if (holders < 20) riskScore += 15;
    else if (holders < 100) riskScore += 5;
    else if (holders > 500) riskScore -= 10;
  }
  
  // Adjust based on DexScreener data
  if (dexscreenerData && dexscreenerData.length > 0) {
    const pair = dexscreenerData[0];
    
    // Volume factor - lower volume is higher risk
    const volume = parseFloat(pair.volume?.h24 || 0);
    if (volume < 1000) riskScore += 15;
    else if (volume < 10000) riskScore += 5;
    else if (volume > 50000) riskScore -= 10;
    
    // Transaction count factor - fewer transactions is higher risk
    const txns = parseInt(pair.txns?.h24?.buys || 0) + parseInt(pair.txns?.h24?.sells || 0);
    if (txns < 10) riskScore += 15;
    else if (txns < 50) riskScore += 5;
    else if (txns > 200) riskScore -= 10;
  }
  
  // Ensure score is within 0-100 range
  return Math.min(Math.max(riskScore, 0), 100);
}

// Calculate potential score for a token
function calculatePotentialScore(birdeyeData, dexscreenerData) {
  // This is a simple implementation - would be more sophisticated in production
  let potentialScore = 50; // Default medium potential
  
  // Adjust based on BirdEye data
  if (birdeyeData) {
    // Price change factor - higher price change is higher potential
    const priceChange = birdeyeData.priceChange24h || 0;
    if (priceChange > 50) potentialScore += 20;
    else if (priceChange > 20) potentialScore += 10;
    else if (priceChange < 0) potentialScore -= 15;
    
    // Market cap factor - lower market cap has more growth potential
    const marketCap = birdeyeData.marketCap || 0;
    if (marketCap < 100000) potentialScore += 15;
    else if (marketCap < 1000000) potentialScore += 5;
    else if (marketCap > 10000000) potentialScore -= 10;
  }
  
  // Adjust based on DexScreener data
  if (dexscreenerData && dexscreenerData.length > 0) {
    const pair = dexscreenerData[0];
    
    // Price change factor
    const priceChange = parseFloat(pair.priceChange?.h24 || 0);
    if (priceChange > 50) potentialScore += 20;
    else if (priceChange > 20) potentialScore += 10;
    else if (priceChange < 0) potentialScore -= 15;
    
    // Buy/sell ratio factor - more buys than sells is positive
    const buys = parseInt(pair.txns?.h24?.buys || 0);
    const sells = parseInt(pair.txns?.h24?.sells || 0);
    if (buys > sells * 2) potentialScore += 15; // 2:1 buy/sell ratio
    else if (buys > sells) potentialScore += 5;
    else if (sells > buys * 2) potentialScore -= 15; // 1:2 buy/sell ratio
  }
  
  // Ensure score is within 0-100 range
  return Math.min(Math.max(potentialScore, 0), 100);
}

// Generate recommendation based on token data
function generateRecommendation(birdeyeData, dexscreenerData) {
  const riskScore = calculateRiskScore(birdeyeData, dexscreenerData);
  const potentialScore = calculatePotentialScore(birdeyeData, dexscreenerData);
  
  // Generate recommendation based on risk and potential
  if (riskScore > 75) {
    return {
      action: 'AVOID',
      reason: 'High risk assessment',
      confidence: 100 - riskScore
    };
  } else if (potentialScore > 75) {
    return {
      action: 'CONSIDER_ENTRY',
      reason: 'High potential for growth',
      confidence: potentialScore
    };
  } else if (potentialScore > 60 && riskScore < 60) {
    return {
      action: 'MONITOR',
      reason: 'Moderate potential with acceptable risk',
      confidence: potentialScore - riskScore / 2
    };
  } else {
    return {
      action: 'SKIP',
      reason: 'Insufficient potential compared to risk',
      confidence: 50
    };
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Token Discovery MCP Server running on port ${PORT}`);
  
  // Start token scan job with default interval
  startScanJob();
});

module.exports = app;
