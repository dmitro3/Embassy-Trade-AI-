// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\tradeforceAI.js
'use client';

import logger from './logger.js';
import { technicalIndicators } from './indicators.js';
import marketDataAggregator from './marketDataAggregator.js';
import shyftService from './shyftService.js';
import birdeyeService from './birdeyeService.js';

/**
 * TradeForce AI System
 * 
 * Enhanced AI trading system with RoundTable consensus mechanism
 * for collaborative decision making and autonomous trading
 */
class TradeforceAI {
  constructor() {
    this.initialized = false;
    
    // Market scanning settings
    this.scanInterval = 15 * 60 * 1000; // 15 minutes
    this.lastScanTime = 0;
    this.scanResults = [];
    
    // AI agents for RoundTable
    this.agents = [
      { 
        name: 'Trend Analyst', 
        strategy: 'movingAverageCrossover', 
        weight: 1.0,
        specialty: 'trend detection' 
      },
      { 
        name: 'Momentum Scout', 
        strategy: 'macdStrategy', 
        weight: 1.0,
        specialty: 'momentum shifts' 
      },
      { 
        name: 'Reversal Hunter', 
        strategy: 'rsiOscillator', 
        weight: 1.0,
        specialty: 'oversold/overbought conditions' 
      },
      { 
        name: 'Volatility Expert', 
        strategy: 'bollingerBandReversion', 
        weight: 1.0,
        specialty: 'volatility breakouts' 
      }
    ];
    
    // RoundTable settings
    this.consensusThreshold = 0.7; // 70% confidence required
    this.minAgentAgreement = 3; // At least 3 agents must agree
    
    // Trading settings
    this.stopLossPercent = 0.02; // 2%
    this.takeProfitPercent = 0.05; // 5%
    this.trailingStopEnabled = false;
    this.trailingStopDistance = 0.01; // 1%
    
    // Strategy criteria
    this.strategyCriteria = {
      minVolume: 10000, // Minimum 24h volume
      maxMarketCap: null, // No upper limit
      minMarketCap: 1000000, // Minimum $1M market cap
      excludeStablecoins: true,
      minPriceChangePercent: 3, // Minimum 3% price change in 24h
      supportedTokens: [] // Will be populated during initialization
    };
    
    // Market state tracking
    this.marketState = {
      trend: 'neutral', // bullish, bearish, neutral
      volatility: 'medium', // low, medium, high
      sentiment: 'neutral', // positive, negative, neutral
      riskScore: 5 // 1-10 scale
    };
    
    // Watchlist
    this.watchlist = [];
    
    // Recent analyses
    this.recentAnalyses = [];
  }
  
  /**
   * Initialize the TradeForce AI system
   */
  async init() {
    try {
      logger.info('Initializing TradeForce AI system');
      
      // Initialize market data aggregator
      if (!marketDataAggregator.isInitialized()) {
        await marketDataAggregator.init();
      }
      
      // Fetch initial token list for supported tokens
      await this.refreshSupportedTokens();
      
      // Initialize watchlist with default tokens
      if (this.watchlist.length === 0) {
        this.watchlist = [
          'So11111111111111111111111111111111111111112', // SOL
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
        ];
      }
      
      // Initial market scan
      await this.scanMarket();
      
      this.initialized = true;
      logger.info('TradeForce AI system initialized successfully');
      
      return true;
    } catch (error) {
      logger.error(`TradeForce AI initialization error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check if the system is initialized
   * 
   * @returns {boolean} - Whether the system is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * Ensure the system is initialized
   * 
   * @throws {Error} - If the system is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('TradeForce AI system not initialized');
    }
  }
  
  /**
   * Refresh the list of supported tokens
   */
  async refreshSupportedTokens() {
    try {
      let tokens = [];
      
      // Try to get tokens from SHYFT API
      try {
        tokens = await shyftService.getTopTokens(50);
      } catch (error) {
        logger.warn(`Failed to get tokens from SHYFT: ${error.message}`);
        
        // Fallback to Birdeye
        try {
          tokens = await birdeyeService.getTokenList(50);
        } catch (err) {
          logger.warn(`Failed to get tokens from Birdeye: ${err.message}`);
        }
      }
      
      // Filter tokens based on criteria
      if (tokens && tokens.length > 0) {
        this.strategyCriteria.supportedTokens = tokens.map(token => ({
          address: token.address,
          symbol: token.symbol || '',
          name: token.name || '',
          logoURI: token.logoURI || token.logo || ''
        }));
        
        logger.info(`Refreshed supported tokens: ${tokens.length} tokens available`);
      } else {
        logger.warn('No tokens found, using default tokens');
        
        // Use default tokens
        this.strategyCriteria.supportedTokens = [
          { 
            address: 'So11111111111111111111111111111111111111112', 
            symbol: 'SOL', 
            name: 'Solana',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
          },
          { 
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 
            symbol: 'USDC', 
            name: 'USD Coin',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
          }
        ];
      }
    } catch (error) {
      logger.error(`Error refreshing supported tokens: ${error.message}`);
    }
  }
  
  /**
   * Start automatic market scanning
   * 
   * @param {number} interval - Scan interval in milliseconds
   */
  startAutoScan(interval = this.scanInterval) {
    this.ensureInitialized();
    
    logger.info(`Starting automatic market scanning with interval ${interval}ms`);
    
    // Clear any existing interval
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }
    
    // Set scan interval
    this.scanInterval = interval;
    
    // Initial scan
    this.scanMarket();
    
    // Set up interval for future scans
    this.scanIntervalId = setInterval(() => {
      this.scanMarket();
    }, interval);
    
    return true;
  }
  
  /**
   * Stop automatic market scanning
   */
  stopAutoScan() {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
      
      logger.info('Automatic market scanning stopped');
      return true;
    }
    
    return false;
  }
  
  /**
   * Scan the market for trading opportunities
   */
  async scanMarket() {
    try {
      this.ensureInitialized();
      
      logger.info('Scanning market for trading opportunities');
      
      // Update last scan time
      this.lastScanTime = Date.now();
      
      // Get tokens to scan (watchlist + supported tokens)
      const tokensToScan = [...new Set([
        ...this.watchlist,
        ...this.strategyCriteria.supportedTokens.map(t => t.address)
      ])].slice(0, 20); // Limit to 20 tokens to avoid rate limits
      
      // Scan each token
      const scans = [];
      for (const tokenAddress of tokensToScan) {
        try {
          // Get market data
          const marketData = await marketDataAggregator.getHistoricalOHLCV(tokenAddress, {
            interval: '1h',
            limit: 100
          });
          
          // Get current price
          const priceData = await marketDataAggregator.getCurrentPrice(tokenAddress);
          
          // Get token info
          const tokenInfo = await marketDataAggregator.getTokenInfo(tokenAddress);
          
          // Analyze token with RoundTable
          const analysis = await this.analyzeAssetWithRoundTable(
            tokenAddress, 
            marketData,
            { 
              currentPrice: priceData,
              tokenInfo
            }
          );
          
          // Add to scan results if consensus reached
          if (analysis.hasConsensus && analysis.consensusConfidence >= this.consensusThreshold) {
            scans.push({
              ...analysis,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          logger.warn(`Error scanning ${tokenAddress}: ${error.message}`);
        }
      }
      
      // Update scan results
      this.scanResults = scans;
      
      // Update market state
      this.updateMarketState();
      
      logger.info(`Market scan complete: ${scans.length} opportunities found`);
      
      return scans;
    } catch (error) {
      logger.error(`Error scanning market: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Analyze asset with the RoundTable consensus mechanism
   * 
   * @param {string} asset - Asset address
   * @param {Array} marketData - Historical market data
   * @param {Object} options - Additional options
   * @returns {Object} - Analysis result
   */
  async analyzeAssetWithRoundTable(asset, marketData, options = {}) {
    try {
      this.ensureInitialized();
      
      logger.info(`Analyzing ${asset} with RoundTable`);
      
      // Get token info if not provided
      let tokenInfo = options.tokenInfo;
      if (!tokenInfo) {
        tokenInfo = await marketDataAggregator.getTokenInfo(asset);
      }
      
      // Get current price if not provided
      let currentPrice = options.currentPrice?.price;
      if (!currentPrice) {
        const priceData = await marketDataAggregator.getCurrentPrice(asset);
        currentPrice = priceData?.price || 0;
      }
      
      // Run analysis with each agent
      const agentSignals = [];
      
      for (const agent of this.agents) {
        try {
          let result;
          
          switch (agent.strategy) {
            case 'movingAverageCrossover':
              result = await technicalIndicators.movingAverageCrossover(marketData, {
                fastPeriod: 9,
                slowPeriod: 21
              });
              break;
            case 'macdStrategy':
              result = await technicalIndicators.macdIndicator(marketData, {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
              });
              break;
            case 'rsiOscillator':
              result = await technicalIndicators.rsiIndicator(marketData, {
                rsiPeriod: 14,
                oversoldThreshold: 30,
                overboughtThreshold: 70
              });
              break;
            case 'bollingerBandReversion':
              result = await technicalIndicators.bollingerBands(marketData, {
                period: 20,
                stdDev: 2
              });
              break;
            default:
              result = { action: 'hold', confidence: 0.5, notes: ['Unknown strategy'] };
              break;
          }
          
          agentSignals.push({
            agent: agent.name,
            strategy: agent.strategy,
            specialty: agent.specialty,
            action: result.action,
            confidence: result.confidence,
            weight: agent.weight,
            notes: result.notes || []
          });
        } catch (error) {
          logger.warn(`Agent ${agent.name} analysis error: ${error.message}`);
          
          // Add failed agent with neutral signal
          agentSignals.push({
            agent: agent.name,
            strategy: agent.strategy,
            specialty: agent.specialty,
            action: 'hold',
            confidence: 0.5,
            weight: agent.weight,
            notes: [`Error: ${error.message}`]
          });
        }
      }
      
      // Calculate consensus
      const buySignals = agentSignals.filter(s => s.action === 'buy');
      const sellSignals = agentSignals.filter(s => s.action === 'sell');
      const holdSignals = agentSignals.filter(s => s.action === 'hold');
      
      // Total weight of all agents
      const totalWeight = this.agents.reduce((sum, agent) => sum + agent.weight, 0);
      
      // Calculate weighted confidence for each action
      const buyConfidence = buySignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      const sellConfidence = sellSignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      const holdConfidence = holdSignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      
      // Determine consensus action
      let consensusAction = 'hold';
      let consensusConfidence = holdConfidence;
      
      if (buySignals.length >= this.minAgentAgreement && buyConfidence > sellConfidence && buyConfidence > holdConfidence) {
        consensusAction = 'buy';
        consensusConfidence = buyConfidence;
      } else if (sellSignals.length >= this.minAgentAgreement && sellConfidence > buyConfidence && sellConfidence > holdConfidence) {
        consensusAction = 'sell';
        consensusConfidence = sellConfidence;
      }
      
      // Check if consensus meets threshold
      const hasConsensus = consensusAction !== 'hold' && consensusConfidence >= this.consensusThreshold;
      
      // Calculate stop loss and take profit
      const stopLoss = consensusAction === 'buy' 
        ? currentPrice * (1 - this.stopLossPercent)
        : consensusAction === 'sell'
          ? currentPrice * (1 + this.stopLossPercent)
          : null;
      
      const takeProfit = consensusAction === 'buy'
        ? currentPrice * (1 + this.takeProfitPercent)
        : consensusAction === 'sell'
          ? currentPrice * (1 - this.takeProfitPercent)
          : null;
      
      // Calculate quantity based on risk management (placeholder)
      const availableBalance = options.availableBalance || 1000; // Default $1000
      const riskPercentage = 0.02; // 2% risk per trade
      const positionSize = availableBalance * riskPercentage;
      const quantity = positionSize / currentPrice;
      
      // Build result object
      const result = {
        asset,
        symbol: tokenInfo?.symbol || '',
        name: tokenInfo?.name || '',
        logoURI: tokenInfo?.logoURI || '',
        currentPrice,
        action: consensusAction,
        hasConsensus,
        consensusConfidence,
        agentSignals,
        agreeingAgents: consensusAction === 'buy' ? buySignals.length : 
                       consensusAction === 'sell' ? sellSignals.length : holdSignals.length,
        stopLoss,
        takeProfit,
        quantity,
        riskReward: this.takeProfitPercent / this.stopLossPercent,
        timestamp: new Date().toISOString()
      };
      
      // Add to recent analyses
      this.recentAnalyses.unshift(result);
      
      // Keep only the last 20 analyses
      if (this.recentAnalyses.length > 20) {
        this.recentAnalyses.pop();
      }
      
      logger.info(`Analysis complete for ${asset}: ${result.action} with ${(result.consensusConfidence * 100).toFixed(2)}% confidence`);
      
      return result;
    } catch (error) {
      logger.error(`Error analyzing ${asset} with RoundTable: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update the overall market state
   */
  async updateMarketState() {
    try {
      // Use recent analyses to determine market trend
      const recentBuys = this.recentAnalyses.filter(a => a.action === 'buy').length;
      const recentSells = this.recentAnalyses.filter(a => a.action === 'sell').length;
      
      // Update market trend
      if (recentBuys > recentSells * 2) {
        this.marketState.trend = 'bullish';
      } else if (recentSells > recentBuys * 2) {
        this.marketState.trend = 'bearish';
      } else {
        this.marketState.trend = 'neutral';
      }
      
      // Update volatility
      const volatilityScores = this.recentAnalyses.map(a => {
        const volatilitySignals = a.agentSignals.filter(s => s.strategy === 'bollingerBandReversion');
        if (volatilitySignals.length > 0) {
          return volatilitySignals[0].confidence;
        }
        return 0.5;
      });
      
      const avgVolatility = volatilityScores.reduce((sum, score) => sum + score, 0) / 
                          (volatilityScores.length || 1);
      
      if (avgVolatility > 0.7) {
        this.marketState.volatility = 'high';
      } else if (avgVolatility < 0.4) {
        this.marketState.volatility = 'low';
      } else {
        this.marketState.volatility = 'medium';
      }
      
      // Update risk score based on trend and volatility
      let riskScore = 5; // Default medium risk
      
      if (this.marketState.trend === 'bullish') {
        riskScore -= 2;
      } else if (this.marketState.trend === 'bearish') {
        riskScore += 2;
      }
      
      if (this.marketState.volatility === 'high') {
        riskScore += 2;
      } else if (this.marketState.volatility === 'low') {
        riskScore -= 1;
      }
      
      // Clamp between 1-10
      this.marketState.riskScore = Math.max(1, Math.min(10, riskScore));
      
      logger.info(`Market state updated: Trend=${this.marketState.trend}, Volatility=${this.marketState.volatility}, Risk=${this.marketState.riskScore}`);
    } catch (error) {
      logger.error(`Error updating market state: ${error.message}`);
    }
  }
  
  /**
   * Get trading recommendations based on recent analyses and scans
   * 
   * @param {Object} options - Options for recommendations
   * @returns {Array} - Trading recommendations
   */
  getRecommendations(options = {}) {
    try {
      this.ensureInitialized();
      
      const { limit = 5, minConfidence = 0.7 } = options;
      
      // Combine recent analyses and scan results
      const allSignals = [
        ...this.recentAnalyses,
        ...this.scanResults
      ];
      
      // Filter for consensus signals with sufficient confidence
      const recommendations = allSignals
        .filter(signal => signal.hasConsensus && signal.consensusConfidence >= minConfidence)
        .sort((a, b) => b.consensusConfidence - a.consensusConfidence) // Sort by confidence (descending)
        .slice(0, limit);
      
      return recommendations;
    } catch (error) {
      logger.error(`Error getting recommendations: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Add an asset to the watchlist
   * 
   * @param {string} asset - Asset address
   * @returns {boolean} - Whether the asset was added successfully
   */
  addToWatchlist(asset) {
    try {
      if (!this.watchlist.includes(asset)) {
        this.watchlist.push(asset);
        logger.info(`Added ${asset} to watchlist`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error adding ${asset} to watchlist: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Remove an asset from the watchlist
   * 
   * @param {string} asset - Asset address
   * @returns {boolean} - Whether the asset was removed successfully
   */
  removeFromWatchlist(asset) {
    try {
      const index = this.watchlist.indexOf(asset);
      if (index !== -1) {
        this.watchlist.splice(index, 1);
        logger.info(`Removed ${asset} from watchlist`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error removing ${asset} from watchlist: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get the current watchlist
   * 
   * @returns {Array} - Watchlist assets
   */
  getWatchlist() {
    return [...this.watchlist];
  }
  
  /**
   * Update trading settings
   * 
   * @param {Object} settings - New settings
   * @returns {boolean} - Whether settings were updated successfully
   */
  updateSettings(settings) {
    try {
      if (settings.consensusThreshold !== undefined) {
        this.consensusThreshold = Math.max(0.5, Math.min(0.9, settings.consensusThreshold));
      }
      
      if (settings.minAgentAgreement !== undefined) {
        this.minAgentAgreement = Math.max(2, Math.min(this.agents.length, settings.minAgentAgreement));
      }
      
      if (settings.stopLossPercent !== undefined) {
        this.stopLossPercent = Math.max(0.005, Math.min(0.1, settings.stopLossPercent));
      }
      
      if (settings.takeProfitPercent !== undefined) {
        this.takeProfitPercent = Math.max(0.01, Math.min(0.3, settings.takeProfitPercent));
      }
      
      if (settings.trailingStopEnabled !== undefined) {
        this.trailingStopEnabled = !!settings.trailingStopEnabled;
      }
      
      if (settings.trailingStopDistance !== undefined) {
        this.trailingStopDistance = Math.max(0.005, Math.min(0.1, settings.trailingStopDistance));
      }
      
      logger.info('Trading settings updated');
      return true;
    } catch (error) {
      logger.error(`Error updating settings: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get the current settings
   * 
   * @returns {Object} - Current settings
   */
  getSettings() {
    return {
      consensusThreshold: this.consensusThreshold,
      minAgentAgreement: this.minAgentAgreement,
      stopLossPercent: this.stopLossPercent,
      takeProfitPercent: this.takeProfitPercent,
      trailingStopEnabled: this.trailingStopEnabled,
      trailingStopDistance: this.trailingStopDistance,
      riskScore: this.marketState.riskScore,
      marketTrend: this.marketState.trend,
      marketVolatility: this.marketState.volatility
    };
  }
}

// Create and export singleton instance
const tradeforceAI = new TradeforceAI();
export default tradeforceAI;
