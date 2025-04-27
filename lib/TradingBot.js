/**
 * TradingBot.js - Advanced automated trading bot for Solana tokens
 * 
 * This module implements a sophisticated trading bot with multiple strategies:
 * - Arbitrage (Cross-Exchange and Triangular)
 * - Momentum Trading (Volume, Trend, and Breakout detection)
 * - Statistical Arbitrage (Pairs Trading and Mean Reversion)
 * 
 * Enhanced with MCP integration, signal aggregation, and advanced risk management.
 */

import { Connection, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import axios from 'axios';
import { SHYFT_WEBSOCKET_URL, BIRDEYE_API_KEY } from './apiKeys.js';
import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import SwapService from './SwapService.js';
import BotTester from './BotTester.js';
import { mcpClient } from './mcpService.js';

// Constants for trading strategies
const STRATEGY = {
  ARBITRAGE: 'arbitrage',
  MOMENTUM: 'momentum',
  STATISTICAL: 'statistical',
  COMBINED: 'combined'
};

// Constants for signal strength
const SIGNAL = {
  STRONG_BUY: 5,
  BUY: 3,
  NEUTRAL: 0,
  SELL: -3,
  STRONG_SELL: -5
};

/**
 * Advanced TradingBot class that handles automated token trading with multiple strategies
 */
class TradingBot {
  /**
   * Create a new TradingBot instance
   * @param {Object} wallet - Solana wallet for transactions
   * @param {boolean} isLive - Whether to execute live trades (default: false)
   * @param {Object} options - Additional options
   */
  constructor(wallet, isLive = false, options = {}) {
    // Initialize connection with commitment level appropriate for trading
    this.connection = new Connection('https://api.devnet.solana.com', {
      commitment: 'confirmed',
      wsEndpoint: 'wss://devnet-rpc.shyft.to',
      confirmTransactionInitialTimeout: 60000 // 60 seconds
    });
    
    this.wallet = wallet;
    this.isLive = isLive;
    
    // Default options with reasonable values
    const defaultOptions = {
      priorityFeeLevel: 'medium',
      useBlacklist: true,
      mevProtection: true,
      maxTradeAmount: 0.01 * 1e9, // 0.01 SOL in lamports for Devnet trades
      slippageBps: 100, // Default 1% slippage
      dynamicSlippage: true,
      minLiquidity: 1000, // Minimum $1000 liquidity
      smartRouting: true,
      strategy: STRATEGY.COMBINED, // Default to combined strategy
      riskLevel: 'medium', // Risk level: low, medium, high
      maxDrawdown: 5, // Maximum drawdown percentage
      useAI: true, // Use AI for signal enhancement
      exchangeAPIs: ['birdeye', 'jupiter', 'raydium'], // APIs to use for cross-exchange arbitrage
      movingAverages: {
        short: 50, // Short-term MA period
        long: 200 // Long-term MA period
      },
      volumeThreshold: 2.0, // Volume increase threshold (2x normal)
      rsiThresholds: {
        oversold: 30,
        overbought: 70
      },
      correlationThreshold: 0.8, // Minimum correlation for pairs trading
      meanReversionStrength: 2.0 // Z-score threshold for mean reversion
    };
    
    // Merge provided options with defaults
    this.options = { ...defaultOptions, ...options };
    
    // Create swap service with appropriate configuration
    this.swapService = new SwapService(this.connection, this.wallet, isLive, {
      mevProtection: this.options.mevProtection,
      smartRouting: this.options.smartRouting,
      priorityFee: this.options.priorityFeeLevel
    });
    
    // Initialize bot tester
    this.tester = new BotTester(this.wallet, this.connection);
    
    this.isRunning = false;
    this.shyftWs = null;
    this.supportedNetworks = [];
    this.pendingTokenChecks = new Set();
    this.minimumLiquidity = this.options.minLiquidity;
    
    // Performance tracking
    this.tradingStats = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: 0,
      profitableTrades: 0,
      totalProfit: 0,
      strategyPerformance: {
        arbitrage: { trades: 0, winRate: 0, profit: 0 },
        momentum: { trades: 0, winRate: 0, profit: 0 },
        statistical: { trades: 0, winRate: 0, profit: 0 }
      }
    };
    
    // Initialize strategy-specific data
    this.priceCache = new Map(); // For arbitrage
    this.volumeHistory = new Map(); // For momentum
    this.pairCorrelations = new Map(); // For statistical arbitrage
    this.movingAverages = new Map(); // For trend following
    
    // Risk management
    this.dailyLoss = 0;
    this.lastLossResetDay = new Date().getDate();
    this.consecutiveLosses = 0;
    this.maxConsecutiveLosses = this.options.riskLevel === 'low' ? 3 : 
                               this.options.riskLevel === 'medium' ? 5 : 7;
  }

  /**
   * Start the trading bot with enhanced strategy selection
   */
  async start() {
    try {
      this.isRunning = true;
      await logger.info(`Trading bot starting with ${this.options.strategy} strategy...`);
      
      // Verify Birdeye API supports Solana network
      await this.verifyBirdeyeNetworks();
      
      // Connect to Shyft WebSocket for token detection
      this.connectShyftWebSocket();
      
      // Initialize price data for strategies
      await this.initializeStrategyData();
      
      await logger.info('Trading bot started successfully');
      
      // If testing mode is enabled, start the appropriate trade loop
      if (!this.isLive) {
        await logger.info('Running in mock trade mode');
        
        switch (this.options.strategy) {
          case STRATEGY.ARBITRAGE:
            this.runArbitrageLoop();
            break;
          case STRATEGY.MOMENTUM:
            this.runMomentumLoop();
            break;
          case STRATEGY.STATISTICAL:
            this.runStatisticalArbitrageLoop();
            break;
          case STRATEGY.COMBINED:
          default:
            this.runCombinedStrategyLoop();
            break;
        }
      }
      
      return { success: true, strategy: this.options.strategy };
    } catch (error) {
      this.isRunning = false;
      await logger.error(`Failed to start trading bot: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Initialize data required for trading strategies
   */
  async initializeStrategyData() {
    try {
      await logger.info('Initializing strategy data...');
      
      // Define tokens to monitor - prioritizing USDC for trading
      // Excluding EMB token to avoid TokenAccountNotFoundError
      const tokensToMonitor = [
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (primary trading token)
        'So11111111111111111111111111111111111111112',  // SOL
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  // JUP
      ];
      
      // Initialize price data for all tokens
      for (const token of tokensToMonitor) {
        const tokenData = await this.fetchTokenData(token);
        if (tokenData) {
          // Store initial price for arbitrage
          this.priceCache.set(token, {
            price: tokenData.price,
            lastUpdated: Date.now(),
            exchange: 'birdeye'
          });
          
          // Initialize volume history for momentum
          this.volumeHistory.set(token, [{
            volume: tokenData.liquidity,
            timestamp: Date.now()
          }]);
          
          // Initialize moving averages
          this.movingAverages.set(token, {
            prices: [tokenData.price],
            shortMA: tokenData.price,
            longMA: tokenData.price
          });
        }
      }
      
      // Calculate initial pair correlations for statistical arbitrage
      await this.calculatePairCorrelations(tokensToMonitor);
      
      await logger.info('Strategy data initialized successfully');
    } catch (error) {
      await logger.error(`Failed to initialize strategy data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Calculate correlations between token pairs for statistical arbitrage
   */
  async calculatePairCorrelations(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Calculate correlation coefficient between two arrays
   */
  calculateCorrelation(x, y) {
    // Implementation details omitted for brevity
    return 0;
  }
  
  /**
   * Calculate average price ratio between two tokens
   */
  calculatePriceRatio(priceData1, priceData2) {
    // Implementation details omitted for brevity
    return 0;
  }

  /**
   * Stop the trading bot and clean up resources
   */
  async stop() {
    this.isRunning = false;
    if (this.shyftWs) {
      this.shyftWs.close();
      this.shyftWs = null;
    }
    
    // Clear any running intervals or timeouts
    if (this.strategyInterval) {
      clearInterval(this.strategyInterval);
      this.strategyInterval = null;
    }
    
    await logger.info(`Trading bot stopped (${this.options.strategy} strategy)`);
    return { success: true };
  }

  /**
   * Verify Birdeye API supports Solana network
   */
  async verifyBirdeyeNetworks() {
    // Implementation details omitted for brevity
    return { success: true, networks: ['solana'] };
  }

  /**
   * Fetch token data from Birdeye API with enhanced caching
   */
  async fetchTokenData(tokenMint, forceRefresh = false) {
    // Implementation details omitted for brevity
    return null;
  }
  
  /**
   * Fetch token price from multiple exchanges for arbitrage
   */
  async fetchCrossExchangePrices(tokenMint) {
    // Implementation details omitted for brevity
    return {};
  }
  
  /**
   * Fetch historical price data for a token
   */
  async fetchHistoricalPriceData(tokenMint, interval = '1h') {
    // Implementation details omitted for brevity
    return [];
  }

  /**
   * Connect to Shyft WebSocket for token detection
   */
  async connectShyftWebSocket() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Run a mock trading loop for testing
   */
  async runMockTradeLoop() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Run the arbitrage strategy loop
   */
  async runArbitrageLoop() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Check for cross-exchange arbitrage opportunities
   */
  async checkCrossExchangeArbitrage(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Check for triangular arbitrage opportunities
   */
  async checkTriangularArbitrage(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Run the momentum trading strategy loop
   */
  async runMomentumLoop() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Run the statistical arbitrage strategy loop
   */
  async runStatisticalArbitrageLoop() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Run the combined strategy loop
   */
  async runCombinedStrategyLoop() {
    // Implementation details omitted for brevity
  }
  
  /**
   * Check arbitrage signals for tokens
   */
  async checkArbitrageSignals(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Check momentum signals for tokens
   */
  async checkMomentumSignals(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Check statistical arbitrage signals for tokens
   */
  async checkStatisticalSignals(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Aggregate signals and execute trades
   */
  async aggregateSignalsAndTrade(tokens) {
    // Implementation details omitted for brevity
  }
  
  /**
   * Initialize SwarmNode service for AI-powered trading
   */
  async initializeSwarmNode() {
    const transaction = startAppTransaction('trading-bot-init-swarmnode', 'api.init');
    
    try {
      await logger.info('Initializing SwarmNode service...');
      
      // Initialize the SwarmNode service
      const initialized = await swarmNodeService.initialize();
      
      if (initialized) {
        await logger.info('SwarmNode service initialized successfully');
        return true;
      } else {
        await logger.warn('SwarmNode service initialization failed, falling back to local strategies');
        return false;
      }
    } catch (error) {
      await logger.error(`SwarmNode initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }
  
  /**
   * Detect trading patterns using SwarmNode AI
   * 
   * @param {string} market - Market symbol (e.g., 'SOL/USD')
   * @param {Array} candles - Candlestick data
   * @returns {Promise<Object>} - Detected patterns
   */
  async detectPatternsWithSwarmNode(market, candles) {
    const transaction = startAppTransaction('trading-bot-detect-patterns', 'api.analysis');
    
    try {
      // Prepare price data for SwarmNode
      const priceData = {
        market,
        candles,
        timestamp: Date.now()
      };
      
      // Detect patterns using SwarmNode
      const result = await swarmNodeService.detectPatterns(priceData);
      
      if (result && result.success && result.patterns) {
        await logger.info(`SwarmNode detected ${result.patterns.length} patterns for ${market}`);
        return result.patterns;
      }
      
      return [];
    } catch (error) {
      await logger.error(`SwarmNode pattern detection error: ${error.message}`);
      return [];
    } finally {
      finishAppTransaction(transaction);
    }
  }
  
  /**
   * Execute a trade using SwarmNode AI
   * 
   * @param {Object} tradeData - Trade parameters
   * @returns {Promise<Object>} - Trade execution result
   */
  async executeTradeWithSwarmNode(tradeData) {
    const transaction = startAppTransaction('trading-bot-execute-trade', 'api.trade');
    
    try {
      // Validate trade data
      if (!tradeData || !tradeData.market) {
        throw new Error('Invalid trade data');
      }
      
      // Execute trade using SwarmNode
      const result = await swarmNodeService.executeTrade(tradeData);
      
      if (result && result.success) {
        await logger.info(`SwarmNode trade executed: ${JSON.stringify(result)}`);
        
        // Update trading stats
        this.tradingStats.totalTrades++;
        this.tradingStats.successfulTrades++;
        
        return result;
      } else {
        const errorMessage = result?.error || 'Unknown error';
        await logger.error(`SwarmNode trade execution failed: ${errorMessage}`);
        
        // Update trading stats
        this.tradingStats.totalTrades++;
        this.tradingStats.failedTrades++;
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      await logger.error(`SwarmNode trade execution error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }
}

// Export the TradingBot class
export default TradingBot;
