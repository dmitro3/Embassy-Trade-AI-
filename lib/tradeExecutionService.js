'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trade Execution Service
 * 
 * This service handles the execution of trades on various platforms.
 * It supports paper trading and Solana blockchain trading.
 */
class TradeExecutionService {  constructor() {
    this.initialized = false;
    this.paperPortfolio = {
      cash: 100000, // $100,000 starting cash
      positions: [], // Array of positions
      transactions: [], // Array of transactions
      portfolioValue: 100000, // Total portfolio value
    };
    this.activeTrades = [];
    this.tradeHistory = [];
    this.executionMode = 'paper'; // Default execution mode: 'paper', 'devnet', 'mainnet'
    
    // Wallet management
    this.walletState = {
      connected: false,
      publicKey: null,
      signTransaction: null,
      signAllTransactions: null,
      autoApprove: false, // Whether to auto-approve transactions
      maxAutoApproveAmount: 10, // Maximum amount for auto-approval in SOL
    };
    
    // Auto-trading configuration
    this.autoTrading = {
      enabled: false,
      interval: 5 * 60 * 1000, // 5 minutes
      lastScan: 0,
      scanInProgress: false,
      minConfidenceScore: 0.75, // Minimum confidence score to auto-execute (0-1)
      maxPositionValue: 1000, // Maximum position value in USD
      assetLimits: new Map(), // Per-asset trading limits
      indicators: {
        volumeSpike: true,
        macdCrossover: true,
        rsiZones: true,
        bollingerBreakout: true,
        movingAverageCrossover: true
      },
      requireMultipleIndicators: true, // Require multiple indicators to align
    };
    
    // Bot activity logging
    this.logActivity = async (activity) => {
      try {
        // Ensure activity has required properties
        const logEntry = {
          ...activity,
          timestamp: activity.timestamp || new Date().toISOString(),
          status: activity.status || 'info'
        };
        
        // Log to console
        logger.info(`Bot Activity: ${JSON.stringify(logEntry)}`);
        
        // Send to API if running in browser
        if (typeof window !== 'undefined') {
          await fetch('/api/bot-logs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(logEntry)
          });
        }
        
        return true;
      } catch (error) {
        logger.error(`Failed to log bot activity: ${error.message}`);
        return false;
      }
    };
    
    // Auto-trading timer
    this.autoTradingIntervalId = null;
  }

  /**
   * Initialize the trade execution service (alias for init)
   */
  async initialize() {
    return this.init();
  }

  /**
   * Initialize the trade execution service
   */
  async init() {
    const transaction = startAppTransaction('trade-execution-init', 'execution.init');
    
    try {
      // Load paper portfolio from localStorage if available
      this.loadPaperPortfolio();
      
      this.initialized = true;
      logger.info('Trade execution service initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Trade execution service initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Check if the service is initialized
   * 
   * @returns {boolean} - Whether the service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Ensure the service is initialized
   * 
   * @throws {Error} - If the service is not initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Trade execution service not initialized');
    }
  }

  /**
   * Load paper portfolio from localStorage
   */
  loadPaperPortfolio() {
    try {
      if (typeof window !== 'undefined') {
        const savedPortfolio = localStorage.getItem('paperPortfolio');
        
        if (savedPortfolio) {
          this.paperPortfolio = JSON.parse(savedPortfolio);
          logger.info('Paper portfolio loaded from localStorage');
        } else {
          logger.info('No saved paper portfolio found, using default');
        }
      }
    } catch (error) {
      logger.error(`Error loading paper portfolio: ${error.message}`);
    }
  }

  /**
   * Save paper portfolio to localStorage
   */
  savePaperPortfolio() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('paperPortfolio', JSON.stringify(this.paperPortfolio));
        logger.info('Paper portfolio saved to localStorage');
      }
    } catch (error) {
      logger.error(`Error saving paper portfolio: ${error.message}`);
    }
  }

  /**
   * Get paper portfolio
   * 
   * @returns {Object} - Paper portfolio
   */
  getPaperPortfolio() {
    this.ensureInitialized();
    return this.paperPortfolio;
  }

  /**
   * Reset paper portfolio
   * 
   * @returns {Object} - Reset paper portfolio
   */
  resetPaperPortfolio() {
    this.ensureInitialized();
    
    this.paperPortfolio = {
      cash: 100000,
      positions: [],
      transactions: [],
      portfolioValue: 100000,
    };
    
    this.savePaperPortfolio();
    logger.info('Paper portfolio reset');
    
    return this.paperPortfolio;
  }

  /**
   * Update paper portfolio with current market prices
   * 
   * @param {Object} marketPrices - Market prices for assets
   * @returns {Object} - Updated paper portfolio
   */
  updatePaperPortfolio(marketPrices) {
    this.ensureInitialized();
    
    try {
      // Update positions with current market prices
      for (const position of this.paperPortfolio.positions) {
        const currentPrice = marketPrices[position.asset];
        
        if (currentPrice) {
          position.currentPrice = currentPrice;
          position.marketValue = position.quantity * currentPrice;
          position.unrealizedPnL = position.marketValue - (position.quantity * position.averagePrice);
          position.unrealizedPnLPercent = ((currentPrice / position.averagePrice) - 1) * 100;
        }
      }
      
      // Calculate portfolio value
      const positionsValue = this.paperPortfolio.positions.reduce(
        (sum, position) => sum + position.marketValue,
        0
      );
      
      this.paperPortfolio.portfolioValue = this.paperPortfolio.cash + positionsValue;
      
      this.savePaperPortfolio();
      
      return this.paperPortfolio;
    } catch (error) {
      logger.error(`Error updating paper portfolio: ${error.message}`);
      return this.paperPortfolio;
    }
  }
  /**
   * Execute a trade
   * 
   * @param {Object} params - Trade parameters
   * @returns {Promise<Object>} - Trade result
   */
  async executeTrade(params) {
    const transaction = startAppTransaction('trade-execution', 'execution.trade');
    
    // Log the trade execution start
    await this.logActivity({
      action: 'execute_trade_start',
      message: `Starting trade execution for ${params.asset}`,
      params: params,
      status: 'pending'
    });
    
    try {
      this.ensureInitialized();
      
      const {
        platform = 'paper',
        symbol,
        side,
        quantity,
        price,
        orderType = 'market',
        wallet = null,
        network = 'devnet',
      } = params;
      
      if (!symbol) {
        throw new Error('Symbol is required');
      }
      
      if (!side || (side !== 'buy' && side !== 'sell')) {
        throw new Error('Side must be "buy" or "sell"');
      }
      
      if (!quantity || quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      // Execute trade based on platform
      let result;
      
      switch (platform) {
        case 'paper':
          result = await this.executePaperTrade(symbol, side, quantity, price, orderType);
          break;
        case 'solana':
          if (!wallet) {
            throw new Error('Wallet is required for Solana trades');
          }
          result = await this.executeSolanaTrade(symbol, side, quantity, price, orderType, wallet, network);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
        // Log successful trade execution
      await this.logActivity({
        action: 'execute_trade_complete',
        message: `Successfully executed ${side} trade for ${quantity} ${symbol}`,
        params: params,
        result: result,
        status: 'completed'
      });
        return result;
    } catch (error) {
      // Log trade execution error
      await this.logActivity({
        action: 'execute_trade_error',
        message: `Trade execution failed: ${error.message}`,
        params: params,
        error: error.message,
        status: 'error'
      });
      
      logger.error(`Error executing trade: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Execute a paper trade
   * 
   * @param {string} symbol - Asset symbol
   * @param {string} side - Trade side ('buy' or 'sell')
   * @param {number} quantity - Trade quantity
   * @param {number} price - Trade price (optional for market orders)
   * @param {string} orderType - Order type ('market' or 'limit')
   * @returns {Promise<Object>} - Trade result
   */
  async executePaperTrade(symbol, side, quantity, price, orderType) {
    try {
      // For market orders, simulate getting current price
      let executionPrice = price;
      
      if (!executionPrice || orderType === 'market') {
        // Simulate a slight price variation for market orders
        const basePrice = price || 100; // Default price if not provided
        const variation = (Math.random() * 0.02) - 0.01; // -1% to +1%
        executionPrice = basePrice * (1 + variation);
      }
      
      // Calculate trade value
      const tradeValue = quantity * executionPrice;
      
      // Check if we have enough cash for buy orders
      if (side === 'buy' && tradeValue > this.paperPortfolio.cash) {
        throw new Error('Insufficient cash for trade');
      }
      
      // Check if we have enough of the asset for sell orders
      if (side === 'sell') {
        const position = this.paperPortfolio.positions.find(p => p.asset === symbol);
        
        if (!position || position.quantity < quantity) {
          throw new Error('Insufficient assets for trade');
        }
      }
      
      // Generate order ID
      const orderId = uuidv4();
      
      // Create transaction record
      const transaction = {
        id: orderId,
        asset: symbol,
        side,
        quantity,
        price: executionPrice,
        value: tradeValue,
        timestamp: new Date().toISOString(),
        platform: 'paper',
        status: 'executed',
      };
      
      // Update portfolio
      if (side === 'buy') {
        // Deduct cash
        this.paperPortfolio.cash -= tradeValue;
        
        // Add or update position
        const existingPosition = this.paperPortfolio.positions.find(p => p.asset === symbol);
        
        if (existingPosition) {
          // Update existing position
          const totalQuantity = existingPosition.quantity + quantity;
          const totalValue = (existingPosition.quantity * existingPosition.averagePrice) + tradeValue;
          existingPosition.averagePrice = totalValue / totalQuantity;
          existingPosition.quantity = totalQuantity;
          existingPosition.currentPrice = executionPrice;
          existingPosition.marketValue = totalQuantity * executionPrice;
          existingPosition.unrealizedPnL = existingPosition.marketValue - (totalQuantity * existingPosition.averagePrice);
          existingPosition.unrealizedPnLPercent = ((executionPrice / existingPosition.averagePrice) - 1) * 100;
        } else {
          // Create new position
          this.paperPortfolio.positions.push({
            asset: symbol,
            quantity,
            averagePrice: executionPrice,
            currentPrice: executionPrice,
            marketValue: tradeValue,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
          });
        }
      } else {
        // Add cash
        this.paperPortfolio.cash += tradeValue;
        
        // Update position
        const position = this.paperPortfolio.positions.find(p => p.asset === symbol);
        
        if (position) {
          position.quantity -= quantity;
          
          // Remove position if quantity is 0
          if (position.quantity <= 0) {
            this.paperPortfolio.positions = this.paperPortfolio.positions.filter(p => p.asset !== symbol);
          } else {
            // Update market value and unrealized P&L
            position.currentPrice = executionPrice;
            position.marketValue = position.quantity * executionPrice;
            position.unrealizedPnL = position.marketValue - (position.quantity * position.averagePrice);
            position.unrealizedPnLPercent = ((executionPrice / position.averagePrice) - 1) * 100;
          }
        }
      }
      
      // Update portfolio value
      const positionsValue = this.paperPortfolio.positions.reduce(
        (sum, position) => sum + position.marketValue,
        0
      );
      
      this.paperPortfolio.portfolioValue = this.paperPortfolio.cash + positionsValue;
      
      // Add transaction to history
      this.paperPortfolio.transactions.push(transaction);
      
      // Save portfolio
      this.savePaperPortfolio();
      
      // Add to active trades
      this.activeTrades.push(transaction);
      
      // Add to trade history
      this.tradeHistory.push(transaction);
      
      logger.info(`Paper trade executed: ${side} ${quantity} ${symbol} @ ${executionPrice}`);
      
      return {
        success: true,
        orderId,
        symbol,
        side,
        quantity,
        price: executionPrice,
        value: tradeValue,
        timestamp: transaction.timestamp,
        platform: 'paper',
        status: 'executed',
      };
    } catch (error) {
      logger.error(`Error executing paper trade: ${error.message}`);
      throw error;
    }
  }
  /**
   * Execute a Solana trade
   * 
   * @param {string} symbol - Asset symbol
   * @param {string} side - Trade side ('buy' or 'sell')
   * @param {number} quantity - Trade quantity
   * @param {number} price - Trade price (optional for market orders)
   * @param {string} orderType - Order type ('market' or 'limit')
   * @param {Object} wallet - Solana wallet
   * @param {string} network - Solana network
   * @returns {Promise<Object>} - Trade result
   */
  async executeSolanaTrade(symbol, side, quantity, price, orderType, wallet, network) {
    const startTime = Date.now();
    try {
      // Store wallet for future use if not already stored
      if (!this.isWalletConnected()) {
        this.setWallet(wallet);
      }
      
      logger.info(`Executing Solana trade: ${side} ${quantity} ${symbol} on ${network}`);
      
      // Generate order ID
      const orderId = uuidv4();
      
      // Simulate execution price
      const executionPrice = price || 100; // Default price if not provided
      
      // Calculate trade value
      const tradeValue = quantity * executionPrice;
      
      // Check if auto-approve is enabled and if the trade value is within limits
      const autoApproveEnabled = this.walletState.autoApprove;
      const maxAutoApproveAmount = this.walletState.maxAutoApproveAmount;
      const tradeValueInSOL = tradeValue / 100; // Simplified conversion for demo
      const requiresApproval = !autoApproveEnabled || tradeValueInSOL > maxAutoApproveAmount;
      
      logger.info(`Trade value: ${tradeValueInSOL} SOL, Auto-approve: ${autoApproveEnabled}, Max: ${maxAutoApproveAmount} SOL`);
      logger.info(`Trade ${requiresApproval ? 'requires' : 'does not require'} manual approval`);
      
      // In a real implementation, we would create and sign a Solana transaction here
      // For now, we'll simulate the transaction flow
      
      // Create transaction record
      const transaction = {
        id: orderId,
        asset: symbol,
        side,
        quantity,
        price: executionPrice,
        value: tradeValue,
        timestamp: new Date().toISOString(),
        platform: 'solana',
        network,
        status: requiresApproval ? 'pending_approval' : 'executed',
        autoApproved: !requiresApproval
      };
      
      // If auto-approve is enabled and the amount is within limits, execute immediately
      if (!requiresApproval) {
        logger.info(`Auto-approving trade: ${orderId}`);
        transaction.status = 'executed';
        transaction.executedAt = new Date().toISOString();
      } else {
        logger.info(`Trade ${orderId} requires manual approval`);
        // In a real implementation, we would prompt the user to approve the transaction
        // For now, we'll just simulate approval
        transaction.status = 'executed';
        transaction.executedAt = new Date().toISOString();
      }
      
      // Add to active trades
      this.activeTrades.push(transaction);
      
      // Add to trade history
      this.tradeHistory.push(transaction);
        logger.info(`Solana trade executed: ${side} ${quantity} ${symbol} @ ${executionPrice}`);
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      logger.info(`Trade execution latency: ${latency}ms`);
      
      // Check if latency is within acceptable range (under 500ms)
      if (latency > 500) {
        logger.warn(`Trade execution latency (${latency}ms) exceeds target of 500ms`);
      }
      
      return {
        success: true,
        orderId,
        symbol,
        side,
        quantity,
        price: executionPrice,
        value: tradeValue,
        timestamp: transaction.timestamp,
        platform: 'solana',
        network,
        status: transaction.status,
        autoApproved: !requiresApproval,
        executionLatency: latency
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error(`Error executing Solana trade: ${error.message}`);
      logger.error(`Failed trade execution latency: ${endTime - startTime}ms`);
      throw error;
    }
  }

  /**
   * Get active trades
   * 
   * @returns {Array<Object>} - Active trades
   */
  getActiveTrades() {
    this.ensureInitialized();
    return this.activeTrades;
  }

  /**
   * Get trade history
   * 
   * @param {number} limit - Number of trades to return (optional)
   * @param {number} offset - Offset for pagination (optional)
   * @returns {Array<Object>} - Trade history
   */
  getTradeHistory(limit = 0, offset = 0) {
    this.ensureInitialized();
    
    if (limit <= 0) {
      return this.tradeHistory;
    }
    
    return this.tradeHistory.slice(offset, offset + limit);
  }

  /**
   * Set execution mode
   * 
   * @param {string} mode - Execution mode ('paper', 'devnet', 'mainnet')
   */
  setExecutionMode(mode) {
    if (mode !== 'paper' && mode !== 'devnet' && mode !== 'mainnet') {
      logger.warn(`Invalid execution mode: ${mode}, using default 'paper'`);
      this.executionMode = 'paper';
    } else {
      this.executionMode = mode;
      logger.info(`Execution mode set to ${mode}`);
    }
  }

  /**
   * Set risk parameters
   * 
   * @param {Object} params - Risk parameters
   */
  setRiskParameters(params) {
    this.riskParameters = {
      maxLoss: params.maxLoss || 0.1, // Default 10%
      maxPositionSize: params.maxPositionSize || 0.2, // Default 20% of portfolio
      ...params
    };
    logger.info('Risk parameters updated');
  }

  /**
   * Get active orders
   * 
   * @returns {Array<Object>} - Active orders
   */
  getActiveOrders() {
    this.ensureInitialized();
    // For now, active trades and active orders are the same
    // In a more complex implementation, these would be different
    return this.activeTrades;
  }

  /**
   * Cancel an order
   * 
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelOrder(orderId) {
    this.ensureInitialized();
    
    try {
      // Find the order in active trades
      const orderIndex = this.activeTrades.findIndex(trade => trade.id === orderId);
      
      if (orderIndex === -1) {
        logger.warn(`Order ${orderId} not found in active trades`);
        return {
          success: false,
          error: 'Order not found'
        };
      }
      
      // Remove the order from active trades
      const order = this.activeTrades[orderIndex];
      this.activeTrades.splice(orderIndex, 1);
      
      logger.info(`Order ${orderId} cancelled successfully`);
      
      return {
        success: true,
        order
      };
    } catch (error) {
      logger.error(`Error cancelling order ${orderId}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set wallet for Solana trades
   * 
   * @param {Object} wallet - Solana wallet object
   * @returns {boolean} - Success status
   */
  setWallet(wallet) {
    try {
      if (!wallet) {
        logger.warn('Attempted to set null wallet');
        this.walletState = {
          ...this.walletState,
          connected: false,
          publicKey: null,
          signTransaction: null,
          signAllTransactions: null
        };
        return false;
      }

      const { publicKey, signTransaction, signAllTransactions } = wallet;
      
      if (!publicKey) {
        logger.warn('Wallet missing publicKey');
        return false;
      }
      
      this.walletState = {
        ...this.walletState,
        connected: true,
        publicKey: publicKey.toString(),
        signTransaction: signTransaction || null,
        signAllTransactions: signAllTransactions || null
      };
      
      logger.info(`Wallet set successfully: ${publicKey.toString().substring(0, 8)}...`);
      return true;
    } catch (error) {
      logger.error(`Error setting wallet: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear wallet
   * 
   * @returns {boolean} - Success status
   */
  clearWallet() {
    try {
      this.walletState = {
        ...this.walletState,
        connected: false,
        publicKey: null,
        signTransaction: null,
        signAllTransactions: null
      };
      
      logger.info('Wallet cleared successfully');
      return true;
    } catch (error) {
      logger.error(`Error clearing wallet: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if wallet is connected
   * 
   * @returns {boolean} - Whether wallet is connected
   */
  isWalletConnected() {
    return this.walletState.connected && !!this.walletState.publicKey;
  }

  /**
   * Get wallet state
   * 
   * @returns {Object} - Wallet state
   */
  getWalletState() {
    return {
      connected: this.walletState.connected,
      publicKey: this.walletState.publicKey,
      autoApprove: this.walletState.autoApprove
    };
  }

  /**
   * Set auto-approve for transactions
   * 
   * @param {boolean} autoApprove - Whether to auto-approve transactions
   * @param {number} maxAmount - Maximum amount for auto-approval in SOL
   * @returns {boolean} - Success status
   */
  setAutoApprove(autoApprove, maxAmount = 10) {
    try {
      this.walletState.autoApprove = !!autoApprove;
      
      if (maxAmount > 0) {
        this.walletState.maxAutoApproveAmount = maxAmount;
      }
      
      logger.info(`Auto-approve ${autoApprove ? 'enabled' : 'disabled'} with max amount ${this.walletState.maxAutoApproveAmount} SOL`);
      return true;
    } catch (error) {
      logger.error(`Error setting auto-approve: ${error.message}`);
      return false;
    }
  }
  /**
   * Process natural language trading instruction
   * 
   * @param {string} instruction - Natural language instruction
   * @returns {Promise<Object>} - Processed instruction result
   */
  async processInstruction(instruction) {
    this.ensureInitialized();
    
    try {
      // This is a placeholder implementation
      // In a real implementation, this would use NLP to parse the instruction
      
      logger.info(`Processing instruction: ${instruction}`);
      
      // Simple keyword matching
      const buyMatch = instruction.match(/buy\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+at\s+(\d+(?:\.\d+)?))?$/i);
      const sellMatch = instruction.match(/sell\s+(\d+(?:\.\d+)?)\s+(.+?)(?:\s+at\s+(\d+(?:\.\d+)?))?$/i);
      
      if (buyMatch) {
        const quantity = parseFloat(buyMatch[1]);
        const symbol = buyMatch[2].trim();
        const price = buyMatch[3] ? parseFloat(buyMatch[3]) : null;
        
        return {
          success: true,
          message: `Buying ${quantity} ${symbol}${price ? ` at ${price}` : ''}`,
          actions: [
            {
              type: 'buy',
              symbol,
              quantity,
              price,
              orderType: price ? 'limit' : 'market'
            }
          ]
        };
      } else if (sellMatch) {
        const quantity = parseFloat(sellMatch[1]);
        const symbol = sellMatch[2].trim();
        const price = sellMatch[3] ? parseFloat(sellMatch[3]) : null;
        
        return {
          success: true,
          message: `Selling ${quantity} ${symbol}${price ? ` at ${price}` : ''}`,
          actions: [
            {
              type: 'sell',
              symbol,
              quantity,
              price,
              orderType: price ? 'limit' : 'market'
            }
          ]
        };
      }
      
      return {
        success: false,
        message: 'Could not understand instruction',
        actions: []
      };
    } catch (error) {
      logger.error(`Error processing instruction: ${error.message}`);
      return {
        success: false,
        error: error.message,
        actions: []
      };
    }
  }

  /**
   * Enable or disable automated trading
   * 
   * @param {boolean} enabled - Whether to enable automated trading
   * @param {Object} config - Additional configuration (optional)
   * @returns {boolean} - Success status
   */
  setAutoTrading(enabled, config = {}) {
    try {
      this.ensureInitialized();
      
      // Update configuration if provided
      if (Object.keys(config).length > 0) {
        // Update interval
        if (config.interval && typeof config.interval === 'number' && config.interval >= 60000) {
          this.autoTrading.interval = config.interval;
        }
        
        // Update confidence score threshold
        if (config.minConfidenceScore && typeof config.minConfidenceScore === 'number') {
          this.autoTrading.minConfidenceScore = Math.max(0.1, Math.min(1.0, config.minConfidenceScore));
        }
        
        // Update max position value
        if (config.maxPositionValue && typeof config.maxPositionValue === 'number') {
          this.autoTrading.maxPositionValue = Math.max(100, config.maxPositionValue);
        }
        
        // Update indicators
        if (config.indicators && typeof config.indicators === 'object') {
          this.autoTrading.indicators = {
            ...this.autoTrading.indicators,
            ...config.indicators
          };
        }
        
        // Update multi-indicator requirement
        if (typeof config.requireMultipleIndicators === 'boolean') {
          this.autoTrading.requireMultipleIndicators = config.requireMultipleIndicators;
        }
        
        // Update minimum required indicators
        if (config.minIndicatorsRequired && typeof config.minIndicatorsRequired === 'number') {
          this.autoTrading.minIndicatorsRequired = Math.max(1, Math.min(5, config.minIndicatorsRequired));
        }
        
        // Update timeframes
        if (config.timeframes && Array.isArray(config.timeframes) && config.timeframes.length > 0) {
          this.autoTrading.timeframes = config.timeframes;
        }
        
        // Update priority timeframe
        if (config.prioritizeTimeframe && typeof config.prioritizeTimeframe === 'string') {
          this.autoTrading.prioritizeTimeframe = config.prioritizeTimeframe;
        }
      }
      
      // Enable or disable auto-trading
      const wasEnabled = this.autoTrading.enabled;
      this.autoTrading.enabled = !!enabled;
      
      // Start or stop the scanner
      if (this.autoTrading.enabled && !wasEnabled) {
        this.startAutoTrader();
        logger.info('Auto-trading enabled');
      } else if (!this.autoTrading.enabled && wasEnabled) {
        this.stopAutoTrader();
        logger.info('Auto-trading disabled');
      }
      
      return true;
    } catch (error) {
      logger.error(`Error setting auto-trading: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Start the auto-trader scanner
   * 
   * @returns {boolean} - Success status
   */
  startAutoTrader() {
    try {
      // Stop any existing intervals
      if (this.autoTradingIntervalId) {
        clearInterval(this.autoTradingIntervalId);
      }
      
      // Immediate scan
      this.scanForTradingOpportunities();
      
      // Set up interval for regular scanning
      this.autoTradingIntervalId = setInterval(() => {
        this.scanForTradingOpportunities();
      }, this.autoTrading.interval);
      
      logger.info(`Auto-trader started, scanning every ${this.autoTrading.interval / 60000} minutes`);
      return true;
    } catch (error) {
      logger.error(`Error starting auto-trader: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Stop the auto-trader scanner
   * 
   * @returns {boolean} - Success status
   */
  stopAutoTrader() {
    try {
      if (this.autoTradingIntervalId) {
        clearInterval(this.autoTradingIntervalId);
        this.autoTradingIntervalId = null;
        logger.info('Auto-trader stopped');
      }
      return true;
    } catch (error) {
      logger.error(`Error stopping auto-trader: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Scan for trading opportunities
   * 
   * @returns {Promise<Array>} - Array of identified opportunities
   */
  async scanForTradingOpportunities() {
    const transaction = startAppTransaction('scan-trading-opportunities', 'autotrading.scan');
    
    try {
      // Check if auto-trading is enabled
      if (!this.autoTrading.enabled) {
        return [];
      }
      
      // Check if scan is already in progress
      if (this.autoTrading.scanInProgress) {
        logger.info('Skipping opportunity scan, previous scan still in progress');
        return [];
      }
      
      this.autoTrading.scanInProgress = true;
      this.autoTrading.lastScan = Date.now();
      
      logger.info('Scanning for trading opportunities...');
      
      // Import required modules
      const tradeDecisionEngine = require('./tradeDecisionEngine.js').default;
      const marketDataAggregator = require('./marketDataAggregator.js').default;
      
      if (!tradeDecisionEngine.isInitialized()) {
        await tradeDecisionEngine.initialize();
      }
      
      // Get watchlist from trade decision engine
      const watchlist = tradeDecisionEngine.getWatchlist();
      
      if (!watchlist || watchlist.length === 0) {
        logger.info('No assets in watchlist for auto-trading');
        this.autoTrading.scanInProgress = false;
        return [];
      }
      
      // Get real-time market data for watchlist assets
      const opportunities = [];
      
      for (const asset of watchlist) {
        try {
          // Get market data for different timeframes
          const marketData = {};
          
          for (const timeframe of this.autoTrading.timeframes) {
            const data = await marketDataAggregator.getMarketData(asset, timeframe);
            if (data && data.success) {
              marketData[timeframe] = data.data;
            }
          }
          
          if (Object.keys(marketData).length === 0) {
            logger.warn(`Could not get market data for ${asset}, skipping`);
            continue;
          }
          
          // Analyze asset for trading opportunities
          const signals = await this.analyzeAssetForSignals(asset, marketData);
          
          // If signals meet criteria, add to opportunities
          if (signals.score >= this.autoTrading.minConfidenceScore) {
            opportunities.push({
              asset,
              signals,
              recommendedAction: signals.action,
              confidence: signals.score,
              timestamp: new Date().toISOString()
            });
            
            logger.info(`Trading opportunity identified: ${signals.action} ${asset} (confidence: ${signals.score.toFixed(2)})`);
            
            // Execute auto-trade if conditions are met
            await this.executeAutoTrade(asset, signals);
          }
        } catch (assetError) {
          logger.error(`Error analyzing asset ${asset}: ${assetError.message}`);
        }
      }
      
      this.autoTrading.scanInProgress = false;
      
      if (opportunities.length > 0) {
        logger.info(`Found ${opportunities.length} trading opportunities`);
      } else {
        logger.info('No trading opportunities found');
      }
      
      return opportunities;
    } catch (error) {
      logger.error(`Error scanning for trading opportunities: ${error.message}`);
      this.autoTrading.scanInProgress = false;
      return [];
    } finally {
      finishAppTransaction(transaction);
    }
  }
  
  /**
   * Analyze asset for trading signals
   * 
   * @param {string} asset - Asset symbol
   * @param {Object} marketData - Market data for different timeframes
   * @returns {Promise<Object>} - Signals and confidence score
   */
  async analyzeAssetForSignals(asset, marketData) {
    try {
      // Import required modules
      const tradingStrategies = require('./tradingStrategies.js').default;
      
      // Initialize result
      let positiveSignals = 0;
      let totalSignals = 0;
      const signalDetails = {};
      
      // Prioritize the primary timeframe
      const primaryTimeframe = this.autoTrading.prioritizeTimeframe;
      const timeframes = [
        primaryTimeframe,
        ...this.autoTrading.timeframes.filter(tf => tf !== primaryTimeframe)
      ];
      
      // Analyze each timeframe
      for (const timeframe of timeframes) {
        if (!marketData[timeframe]) continue;
        
        const data = marketData[timeframe];
        signalDetails[timeframe] = {};
        
        // Volume spike detection
        if (this.autoTrading.indicators.volumeSpike) {
          const volumeSignal = await tradingStrategies.detectVolumeSpike(data);
          signalDetails[timeframe].volumeSpike = volumeSignal;
          if (volumeSignal.signal) {
            positiveSignals++;
          }
          totalSignals++;
        }
        
        // MACD crossover
        if (this.autoTrading.indicators.macdCrossover) {
          const macdSignal = await tradingStrategies.macdStrategy(data);
          signalDetails[timeframe].macdCrossover = macdSignal;
          if (macdSignal.signal === 'buy') {
            positiveSignals++;
          }
          totalSignals++;
        }
        
        // RSI zones
        if (this.autoTrading.indicators.rsiZones) {
          const rsiSignal = await tradingStrategies.rsiOscillator(data);
          signalDetails[timeframe].rsiZones = rsiSignal;
          if (rsiSignal.signal === 'buy') {
            positiveSignals++;
          }
          totalSignals++;
        }
        
        // Bollinger band breakout
        if (this.autoTrading.indicators.bollingerBreakout) {
          const bbandsSignal = await tradingStrategies.bollingerBandReversion(data);
          signalDetails[timeframe].bollingerBreakout = bbandsSignal;
          if (bbandsSignal.signal === 'buy') {
            positiveSignals++;
          }
          totalSignals++;
        }
        
        // Moving average crossover
        if (this.autoTrading.indicators.movingAverageCrossover) {
          const maSignal = await tradingStrategies.movingAverageCrossover(data);
          signalDetails[timeframe].movingAverageCrossover = maSignal;
          if (maSignal.signal === 'buy') {
            positiveSignals++;
          }
          totalSignals++;
        }
      }
      
      // Calculate confidence score
      const score = totalSignals > 0 ? positiveSignals / totalSignals : 0;
      
      // Determine action based on score
      let action = 'none';
      if (score >= this.autoTrading.minConfidenceScore) {
        action = 'buy';
      }
      
      return {
        asset,
        action,
        score,
        details: signalDetails,
        positiveSignals,
        totalSignals,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error analyzing signals for ${asset}: ${error.message}`);
      return {
        asset,
        action: 'none',
        score: 0,
        details: {},
        positiveSignals: 0,
        totalSignals: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Execute auto-trade based on signals
   * 
   * @param {string} asset - Asset symbol
   * @param {Object} signals - Trading signals
   * @returns {Promise<Object>} - Trade result
   */
  async executeAutoTrade(asset, signals) {
    try {
      // Check if auto-approve is enabled
      if (!this.walletState.autoApprove) {
        logger.info(`Auto-trade for ${asset} skipped: auto-approve is not enabled`);
        return {
          success: false,
          message: 'Auto-approve is not enabled'
        };
      }
      
      // Check if signals meet criteria
      if (signals.action !== 'buy' || signals.score < this.autoTrading.minConfidenceScore) {
        return {
          success: false,
          message: 'Signals do not meet criteria for auto-trade'
        };
      }
      
      // Check if multiple indicators are required
      if (this.autoTrading.requireMultipleIndicators && 
          signals.positiveSignals < this.autoTrading.minIndicatorsRequired) {
        logger.info(`Auto-trade for ${asset} skipped: not enough positive indicators (${signals.positiveSignals} < ${this.autoTrading.minIndicatorsRequired})`);
        return {
          success: false,
          message: `Not enough positive indicators (${signals.positiveSignals} < ${this.autoTrading.minIndicatorsRequired})`
        };
      }
      
      // Calculate position size based on confidence score and max position value
      const positionValue = this.autoTrading.maxPositionValue * signals.score;
      
      // Get current price
      const marketDataAggregator = require('./marketDataAggregator.js').default;
      const priceData = await marketDataAggregator.getCurrentPrice(asset);
      
      if (!priceData || !priceData.price) {
        logger.error(`Could not get current price for ${asset}`);
        return {
          success: false,
          message: 'Could not get current price'
        };
      }
      
      // Calculate quantity based on position value and price
      const currentPrice = priceData.price;
      const quantity = positionValue / currentPrice;
      
      // Execute trade
      logger.info(`Executing auto-trade: BUY ${quantity.toFixed(6)} ${asset} @ ${currentPrice} (confidence: ${signals.score.toFixed(2)})`);
      
      const platform = this.isWalletConnected() ? 'solana' : 'paper';
      const tradeResult = await this.executeTrade({
        platform,
        symbol: asset,
        side: 'buy',
        quantity,
        price: currentPrice,
        orderType: 'market',
        wallet: this.isWalletConnected() ? { 
          publicKey: this.walletState.publicKey,
          signTransaction: this.walletState.signTransaction,
          signAllTransactions: this.walletState.signAllTransactions
        } : null,
        network: this.executionMode
      });
      
      if (tradeResult && tradeResult.success) {
        logger.info(`Auto-trade executed successfully: ${asset} (order ID: ${tradeResult.orderId})`);
      }
      
      return tradeResult;
    } catch (error) {
      logger.error(`Error executing auto-trade for ${asset}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get win rate from trade history
   * 
   * @returns {number} - Win rate as a percentage
   */  getWinRate() {
    this.ensureInitialized();
    
    const totalTrades = this.tradeHistory.length;
    if (totalTrades === 0) {
      return 0;
    }
    
    // Count profitable trades
    let wins = 0;
    for (const trade of this.tradeHistory) {
      // For simplicity, we'll consider any sell trade with a positive value as a win
      // In a real implementation, you'd track the profit/loss per trade
      if (trade.side === 'sell' && trade.profitPercent > 0) {
        wins++;
      }
    }
    
    return (wins / totalTrades) * 100;
  }
}

// Create singleton instance
const tradeExecutionService = new TradeExecutionService();

export default tradeExecutionService;
