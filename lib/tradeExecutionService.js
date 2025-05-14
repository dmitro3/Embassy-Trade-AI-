'use client';

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import logger from './logger';
import axios from 'axios';

/**
 * Trade Execution Service
 * 
 * Enhanced trade execution service with:
 * - Jupiter Aggregator SDK integration for DevNet trades
 * - Photon integration for high-frequency trading
 * - Risk management with stop-loss and take-profit
 */
class TradeExecutionService {
  constructor() {
    // API endpoints
    this.jupiterApiUrl = 'https://quote-api.jup.ag/v6';
    this.photonApiUrl = 'https://api.photon.trade/v1';
    
    // Network configuration
    this.connection = null;
    this.network = 'devnet';
    this.networkUrl = 'https://api.devnet.solana.com';
    this.initialized = false;
    this.jupiterInitialized = false;
    this.photonInitialized = false;
    this.krakenInitialized = false;
    
    // Wallet state
    this.wallet = {
      connected: false,
      publicKey: null,
      signTransaction: null,
      signAllTransactions: null
    };
    
    // Exchange services
    this.krakenService = null;
    
    // Risk management settings
    this.riskManagement = {
      enabled: true,
      defaultStopLoss: 2, // 2% stop loss
      defaultTakeProfit: 5, // 5% take profit
      maxConcurrentTrades: 5,
      maxTradeSize: 1 // 1 SOL
    };
    
    // Active trades
    this.activeTrades = [];
    
    // Performance metrics
    this.performance = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      winRate: 0
    };
    
    // Token price cache
    this.tokenPriceCache = {};
  }

  /**
   * Initialize the service with network connection
   */
  initialize(network = 'devnet') {
    try {
      this.network = network;
      this.networkUrl = network === 'mainnet' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
      
      // Initialize Solana connection
      this.connection = new Connection(this.networkUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      });
      
      this.initialized = true;
      logger.info(`Trade execution service initialized on ${network}`);
      
      // Start monitoring active trades for stop-loss/take-profit
      this.startTradeMonitoring();
      
      return true;
    } catch (error) {
      logger.error(`Failed to initialize trade execution service: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Initialize Jupiter SDK
   */
  async initializeJupiter() {
    try {
      if (this.jupiterInitialized) {
        return true;
      }
      
      // Check Jupiter API health
      const response = await axios.get(`${this.jupiterApiUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.jupiterInitialized = true;
        logger.info('Jupiter SDK initialized successfully');
        return true;
      } else {
        throw new Error(`Jupiter API health check failed: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize Jupiter SDK: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Initialize Photon
   */
  async initializePhoton() {
    try {
      if (this.photonInitialized) {
        return true;
      }
      
      // In a real implementation, you would check the Photon API health
      // For now, we just mark it as initialized
      this.photonInitialized = true;
      logger.info('Photon initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Photon: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Initialize Kraken trading service
   * @returns {Promise<boolean>} Success status
   */
  async initializeKraken() {
    try {
      if (this.krakenInitialized) {
        return true;
      }
      
      // Dynamically import to ensure client-side compatibility
      const krakenModule = await import('./krakenTradingService');
      this.krakenService = krakenModule.default;
      
      // Initialize the Kraken service
      const success = await this.krakenService.initialize();
      
      if (success) {
        this.krakenInitialized = true;
        logger.info('Kraken trading service initialized successfully');
        return true;
      } else {
        throw new Error('Kraken service initialization failed');
      }
    } catch (error) {
      logger.error(`Failed to initialize Kraken trading service: ${error.message}`);
      return false;
    }
  }

  /**
   * Set wallet for trade execution
   */
  setWallet(wallet) {
    try {
      if (!wallet || !wallet.publicKey) {
        logger.error('Invalid wallet provided to setWallet');
        return false;
      }

      this.wallet = {
        connected: true,
        publicKey: wallet.publicKey.toString(),
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions
      };

      logger.info(`Wallet connected: ${this.wallet.publicKey.substring(0, 6)}...`);
      return true;
    } catch (error) {
      logger.error(`Error setting wallet: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear current wallet connection
   */
  clearWallet() {
    this.wallet = {
      connected: false,
      publicKey: null,
      signTransaction: null,
      signAllTransactions: null
    };
    
    logger.info('Wallet disconnected');
  }
  
  /**
   * Start monitoring active trades for stop-loss/take-profit
   */
  startTradeMonitoring() {
    // Check active trades every 30 seconds
    setInterval(() => {
      this.monitorActiveTrades();
    }, 30000);
    
    logger.info('Trade monitoring started');
  }
  
  /**
   * Monitor active trades for stop-loss/take-profit
   */
  async monitorActiveTrades() {
    if (!this.riskManagement.enabled || this.activeTrades.length === 0) {
      return;
    }
    
    logger.debug(`Monitoring ${this.activeTrades.length} active trades`);
    
    // Check each active trade
    for (const trade of this.activeTrades) {
      try {
        // Skip trades without stop-loss or take-profit
        if (!trade.stopLoss && !trade.takeProfit) {
          continue;
        }
        
        // Get current price
        const currentPrice = await this.getTokenPrice(trade.outputToken);
        
        if (!currentPrice) {
          continue;
        }
        
        // Calculate PnL
        const entryPrice = trade.entryPrice || 0;
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        
        // Update trade PnL
        trade.currentPnL = pnlPercent;
        trade.lastUpdated = new Date().toISOString();
        
        // Check stop-loss
        if (trade.stopLoss && pnlPercent <= -trade.stopLoss) {
          logger.info(`Stop-loss triggered for trade ${trade.id}: ${pnlPercent.toFixed(2)}%`);
          
          // Close trade
          if (trade.wallet) {
            await this.closeTrade({
              tradeId: trade.id,
              inputToken: trade.inputToken,
              outputToken: trade.outputToken,
              amount: trade.outputAmount,
              wallet: trade.wallet,
              reason: 'stop_loss'
            });
          }
        }
        
        // Check take-profit
        if (trade.takeProfit && pnlPercent >= trade.takeProfit) {
          logger.info(`Take-profit triggered for trade ${trade.id}: ${pnlPercent.toFixed(2)}%`);
          
          // Close trade
          if (trade.wallet) {
            await this.closeTrade({
              tradeId: trade.id,
              inputToken: trade.inputToken,
              outputToken: trade.outputToken,
              amount: trade.outputAmount,
              wallet: trade.wallet,
              reason: 'take_profit'
            });
          }
        }
      } catch (error) {
        logger.error(`Error monitoring trade ${trade.id}: ${error.message}`);
      }
    }
  }
  
  /**
   * Get token price
   */
  async getTokenPrice(symbol) {
    try {
      // Check cache first
      if (this.tokenPriceCache[symbol]) {
        return this.tokenPriceCache[symbol];
      }
      
      // In a real implementation, this would fetch the price from an API
      // For now, we'll return a simulated price
      const simulatedPrices = {
        'SOL': 100,
        'USDC': 1,
        'RAY': 0.5,
        'JUP': 1.2,
        'BONK': 0.00001
      };
      
      return simulatedPrices[symbol] || 1;
    } catch (error) {
      logger.error(`Failed to get token price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute a trade using Jupiter API
   */
  async executeTrade(tradeDetails) {
    try {
      if (!this.initialized) {
        this.initialize();
      }
      
      // Initialize Jupiter if needed
      if (!this.jupiterInitialized) {
        await this.initializeJupiter();
      }
      
      const { 
        inputToken, 
        outputToken, 
        amount, 
        slippage = 1.0, 
        wallet,
        stopLoss = this.riskManagement.defaultStopLoss,
        takeProfit = this.riskManagement.defaultTakeProfit
      } = tradeDetails;
      
      if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Valid wallet with publicKey and signTransaction is required');
      }
      
      // Check risk management
      if (this.riskManagement.enabled) {
        // Check max concurrent trades
        if (this.activeTrades.length >= this.riskManagement.maxConcurrentTrades) {
          throw new Error(`Maximum concurrent trades (${this.riskManagement.maxConcurrentTrades}) reached`);
        }
        
        // Check max trade size
        if (amount > this.riskManagement.maxTradeSize) {
          throw new Error(`Trade amount (${amount} SOL) exceeds maximum (${this.riskManagement.maxTradeSize} SOL)`);
        }
      }
      
      logger.info(`Executing trade: ${amount} ${inputToken} -> ${outputToken}`);
      
      // Step 1: Get token addresses
      const inputTokenAddress = this.getTokenAddress(inputToken);
      const outputTokenAddress = this.getTokenAddress(outputToken);
      
      if (!inputTokenAddress || !outputTokenAddress) {
        throw new Error(`Invalid token symbols: ${inputToken} or ${outputToken}`);
      }
      
      // Step 2: Get routes from Jupiter API
      const routes = await this.getRoutes(inputTokenAddress, outputTokenAddress, amount, slippage);
      
      if (!routes || !routes.length) {
        throw new Error('No valid routes found for this trade');
      }
      
      // Select best route (first one is best by default)
      const bestRoute = routes[0];
      
      // Step 3: Get quote and swap transaction
      const { swapTransaction } = await this.getSwapTransaction(bestRoute, wallet.publicKey.toString());
      
      if (!swapTransaction) {
        throw new Error('Failed to generate swap transaction');
      }
      
      // Step 4: Deserialize, sign and submit transaction
      const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // Step 5: Submit transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      );
      
      // Step 6: Confirm transaction
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      logger.info(`Trade executed successfully: ${signature}`);
      
      // Get token prices for PnL tracking
      const outputTokenPrice = await this.getTokenPrice(outputToken);
      
      // Create trade record
      const tradeId = Math.random().toString(36).substring(2, 15);
      const trade = {
        id: tradeId,
        status: 'open',
        txHash: signature,
        inputToken,
        outputToken,
        inputAmount: amount,
        outputAmount: bestRoute.outAmount / Math.pow(10, bestRoute.outputDecimals),
        entryPrice: outputTokenPrice,
        stopLoss,
        takeProfit,
        timestamp: new Date().toISOString(),
        wallet: {
          publicKey: wallet.publicKey.toString(),
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions
        }
      };
      
      // Add to active trades
      this.activeTrades.push(trade);
      
      // Update performance metrics
      this.performance.totalTrades++;
      this.performance.successfulTrades++;
      
      return {
        status: 'completed',
        tradeId,
        txHash: signature,
        inputToken,
        outputToken,
        amount,
        expectedOutput: bestRoute.outAmount / Math.pow(10, bestRoute.outputDecimals),
        stopLoss,
        takeProfit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Trade execution failed: ${error.message}`);
      
      // Update performance metrics
      this.performance.totalTrades++;
      this.performance.failedTrades++;
      
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Execute a trade using Photon API
   */
  async executePhotonTrade(tradeDetails) {
    try {
      if (!this.initialized) {
        this.initialize();
      }
      
      // Initialize Photon if needed
      if (!this.photonInitialized) {
        await this.initializePhoton();
      }
      
      const { 
        inputToken, 
        outputToken, 
        amount, 
        wallet,
        stopLoss = this.riskManagement.defaultStopLoss,
        takeProfit = this.riskManagement.defaultTakeProfit
      } = tradeDetails;
      
      if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Valid wallet with publicKey and signTransaction is required');
      }
      
      logger.info(`Executing Photon trade: ${amount} ${inputToken} -> ${outputToken}`);
      
      // In a real implementation, this would call the Photon API
      // For now, we'll simulate a successful trade
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a random transaction hash
      const signature = `photon_${Math.random().toString(36).substring(2, 15)}`;
      
      // Create trade record
      const tradeId = Math.random().toString(36).substring(2, 15);
      const outputAmount = amount * (1 + (Math.random() * 0.1 - 0.05)); // Simulate +/- 5% slippage
      
      // Get token prices for PnL tracking
      const outputTokenPrice = await this.getTokenPrice(outputToken) || 1;
      
      const trade = {
        id: tradeId,
        status: 'open',
        txHash: signature,
        inputToken,
        outputToken,
        inputAmount: amount,
        outputAmount,
        entryPrice: outputTokenPrice,
        stopLoss,
        takeProfit,
        timestamp: new Date().toISOString(),
        exchange: 'photon',
        wallet: {
          publicKey: wallet.publicKey.toString(),
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions
        }
      };
      
      // Add to active trades
      this.activeTrades.push(trade);
      
      // Update performance metrics
      this.performance.totalTrades++;
      this.performance.successfulTrades++;
      
      return {
        status: 'completed',
        tradeId,
        txHash: signature,
        inputToken,
        outputToken,
        amount,
        expectedOutput: outputAmount,
        stopLoss,
        takeProfit,
        timestamp: new Date().toISOString(),
        exchange: 'photon'
      };
    } catch (error) {
      logger.error(`Photon trade execution failed: ${error.message}`);
      
      // Update performance metrics
      this.performance.totalTrades++;
      this.performance.failedTrades++;
      
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        exchange: 'photon'
      };
    }
  }
    /**
   * Execute a trade using Kraken API
   * @param {Object} orderParams Order parameters from KrakenOrderForm
   * @returns {Promise<Object>} Order result
   */
  async executeKrakenTrade(orderParams) {
    try {
      if (!this.initialized) {
        this.initialize();
      }
      
      // Initialize Kraken if needed
      if (!this.krakenInitialized) {
        await this.initializeKraken();
      }
      
      if (!this.krakenService) {
        throw new Error('Kraken service not initialized');
      }
      
      // Extract order parameters
      const { 
        pair,
        type,
        ordertype,
        price,
        volume,
        validate = false
      } = orderParams;
      
      // Log the trade request
      logger.info(`Executing Kraken ${validate ? 'validation for' : ''} ${type} order: ${volume} ${pair} at ${ordertype === 'market' ? 'market price' : price + ' USD'}`);
      
      // Execute the order through the Kraken trading service
      const orderResult = await this.krakenService.addOrder({
        pair,
        type,
        ordertype,
        price,
        volume,
        validate
      });
      
      // If successful, add to active trades (except validation orders)
      if (orderResult.success && !validate) {
        // Create a unique ID for tracking
        const tradeId = `kraken_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        const trade = {
          id: tradeId,
          status: 'open',
          txHash: orderResult.txid || orderResult.transactionId,
          pair,
          type, // buy or sell
          ordertype, // market or limit
          price: ordertype === 'limit' ? parseFloat(price) : null,
          volume: parseFloat(volume),
          timestamp: new Date().toISOString(),
          exchange: 'kraken',
          krakenOrderId: orderResult.txid || orderResult.transactionId
        };
        
        // Add to active trades
        this.activeTrades.push(trade);
        
        // Update performance metrics
        this.performance.totalTrades++;
        this.performance.successfulTrades++;
        
        return {
          success: true,
          validateOnly: validate,
          transactionId: orderResult.txid || orderResult.transactionId,
          details: {
            pair,
            type,
            volume,
            price: ordertype === 'limit' ? price : 'market',
            timestamp: new Date().toISOString()
          }
        };
      } else if (orderResult.success && validate) {
        // Validation successful
        return {
          success: true,
          validateOnly: true,
          details: {
            pair,
            type,
            volume,
            price: ordertype === 'limit' ? price : 'market',
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // Order failed
        return {
          success: false,
          error: orderResult.error || 'Unknown error occurred',
          validateOnly: validate
        };
      }    } catch (error) {
      logger.error(`Kraken trade execution failed: ${error.message}`);
      
      // Update performance metrics
      this.performance.totalTrades++;
      this.performance.failedTrades++;
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        validateOnly: orderParams?.validate || false
      };
      this.performance.failedTrades++;
      
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
        exchange: 'kraken'
      };
    }
  }
  
  /**
   * Close a trade position (reverse trade)
   */
  async closeTrade(tradeDetails) {
    try {
      const { tradeId, inputToken, outputToken, amount, wallet, reason = 'manual' } = tradeDetails;
      
      if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Valid wallet with publicKey and signTransaction is required');
      }
      
      logger.info(`Closing trade: ${tradeId} (${reason})`);
      
      // Find the trade in active trades
      const tradeIndex = this.activeTrades.findIndex(t => t.id === tradeId);
      
      if (tradeIndex === -1) {
        throw new Error(`Trade ${tradeId} not found in active trades`);
      }
      
      const trade = this.activeTrades[tradeIndex];
      
      // Reverse the original trade (swap output back to input)
      const result = await this.executeTrade({
        inputToken: outputToken, // Original output token
        outputToken: inputToken, // Original input token
        amount,
        slippage: 1.0,
        wallet
      });
      
      // Update trade status
      trade.status = 'closed';
      trade.closeReason = reason;
      trade.closeTxHash = result.txHash;
      trade.closeTimestamp = new Date().toISOString();
      
      // Calculate PnL
      const exitPrice = await this.getTokenPrice(outputToken) || 0;
      const entryPrice = trade.entryPrice || 0;
      const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      
      trade.exitPrice = exitPrice;
      trade.pnlPercent = pnlPercent;
      
      // Remove from active trades
      this.activeTrades.splice(tradeIndex, 1);
      
      return {
        status: 'completed',
        tradeId,
        closeTxHash: result.txHash,
        pnlPercent,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to close trade: ${error.message}`);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get token address by symbol
   */
  getTokenAddress(symbol) {
    const tokenAddresses = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    };
    
    return tokenAddresses[symbol.toUpperCase()];
  }
  
  /**
   * Get token decimals (for amount calculation)
   */
  getTokenDecimals(tokenAddress) {
    // Common tokens and their decimals
    const tokenDecimals = {
      'So11111111111111111111111111111111111111112': 9, // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 6, // RAY
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 6, // JUP
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5 // BONK
    };
    
    return tokenDecimals[tokenAddress] || 9; // Default to 9 decimals if unknown
  }
  
  /**
   * Get routes from Jupiter API
   */
  async getRoutes(inputTokenAddress, outputTokenAddress, amount, slippage) {
    try {
      // Get token info to determine decimals
      const inputDecimals = this.getTokenDecimals(inputTokenAddress);
      
      // Convert amount to raw amount with proper decimals
      const rawAmount = Math.floor(amount * Math.pow(10, inputDecimals));
      
      // Format slippage (e.g., 1.0 -> 1)
      const slippageBps = Math.floor(slippage * 100);
      
      // Build Jupiter API request URL
      const quoteUrl = new URL(`${this.jupiterApiUrl}/quote`);
      quoteUrl.searchParams.append('inputMint', inputTokenAddress);
      quoteUrl.searchParams.append('outputMint', outputTokenAddress);
      quoteUrl.searchParams.append('amount', rawAmount.toString());
      quoteUrl.searchParams.append('slippageBps', slippageBps.toString());
      
      // Make the API call with proper error handling
      const response = await fetch(quoteUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter API error (${response.status}): ${errorText}`);
      }
      
      // Parse response
      const quoteResponse = await response.json();
      
      if (!quoteResponse || !quoteResponse.data || !quoteResponse.data.length) {
        throw new Error('No routes available for this swap');
      }
      
      return quoteResponse.data;
    } catch (error) {
      logger.error(`Failed to get routes: ${error.message}`);
      throw new Error(`Failed to get routes: ${error.message}`);
    }
  }
  
  /**
   * Get swap transaction from Jupiter API
   */
  async getSwapTransaction(route, userPublicKey) {
    try {
      // Build API request URL
      const swapUrl = `${this.jupiterApiUrl}/swap`;
      
      // Prepare request body
      const requestBody = {
        route,
        userPublicKey,
        wrapUnwrapSOL: true
      };
      
      // Make API call
      const response = await fetch(swapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter Swap API error (${response.status}): ${errorText}`);
      }
      
      // Parse response
      const swapResponse = await response.json();
      
      if (!swapResponse || !swapResponse.swapTransaction) {
        throw new Error('Failed to generate swap transaction');
      }
      
      return swapResponse;
    } catch (error) {
      logger.error(`Failed to create swap transaction: ${error.message}`);
      throw new Error(`Failed to create swap transaction: ${error.message}`);
    }
  }
  
  /**
   * Get active trades
   */
  getActiveTrades() {
    return this.activeTrades;
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    // Calculate additional metrics
    this.performance.winRate = this.performance.totalTrades > 0 
      ? (this.performance.profitableTrades / this.performance.totalTrades) * 100 
      : 0;
    
    this.performance.averageProfitPct = this.performance.profitableTrades > 0 
      ? this.performance.totalProfit / this.performance.profitableTrades 
      : 0;
    
    this.performance.averageLossPct = this.performance.unprofitableTrades > 0 
      ? this.performance.totalLoss / this.performance.unprofitableTrades 
      : 0;
    
    return this.performance;
  }
}

// Create singleton instance
const tradeExecutionService = new TradeExecutionService();

// Initialize with DevNet
tradeExecutionService.initialize('devnet');

export default tradeExecutionService;
