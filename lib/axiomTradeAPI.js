'use client';

import { clusterApiUrl, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import marketDataAggregator from './marketDataAggregator.js';
import tradeExecutionService from './tradeExecutionService.js';
import axiomScraper from './axiomScraper.js';
import logger from './logger.js';

// Mock token data for development purposes - simulates Axiom token listings
const MOCK_TOKENS = [
  {
    name: 'BONK/SOL',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    price: 0.00000012,
    volume: 2430000,
    change24h: 25.4,
    marketCap: 540000,
    isNew: true,
    highVolume: true
  },
  {
    name: 'JUP/SOL',
    address: '7KEeBNRq4Bj88Qa3xGpYjSXc2bNiwaFqsj2vMKViVzV2',
    price: 0.0112,
    volume: 1320000,
    change24h: 5.3,
    marketCap: 1240000,
    isNew: false,
    highVolume: true
  },
  {
    name: 'DFL/SOL',
    address: '6Y7LFP8kDnEMdm2E5NQqfsgFfmXXpPLoYX6jJJvTBq9U',
    price: 0.00314,
    volume: 450000,
    change24h: -5.1,
    marketCap: 780000,
    isNew: false,
    highVolume: false
  },
  {
    name: 'PYTH/SOL',
    address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    price: 0.00853,
    volume: 890000,
    change24h: 12.8,
    marketCap: 2100000,
    isNew: false,
    highVolume: false
  },
  {
    name: 'WOOF/SOL',
    address: 'CJsVraKy1nRZKvAHmLW6sMKXQKbRNkjUxSWtHaHR5Jqk',
    price: 0.00000045,
    volume: 980000,
    change24h: 31.2,
    marketCap: 320000,
    isNew: true,
    highVolume: true
  }
];

/**
 * Initialize the trading services
 * @returns {Promise<boolean>} Success status
 */
export async function initializeServices() {
  try {
    // Initialize market data aggregator
    const marketDataInitialized = await marketDataAggregator.initialize();
    
    if (!marketDataInitialized) {
      logger.error('Failed to initialize market data aggregator');
      return false;
    }
    
    // Initialize trade execution service
    const tradeExecInitialized = await tradeExecutionService.initialize();
    
    if (!tradeExecInitialized) {
      logger.error('Failed to initialize trade execution service');
      return false;
    }
    
    // Initialize AXIOM scraper
    const axiomInitialized = await axiomScraper.initialize();
    
    if (!axiomInitialized) {
      logger.warn('Failed to initialize AXIOM scraper, some functionality may be limited');
    }
    
    logger.info('AXIOM Trade API services initialized successfully');
    return true;
  } catch (error) {
    logger.error(`Error initializing AXIOM Trade API services: ${error.message}`);
    return false;
  }
}

/**
 * Simulates Axiom API for scanning tokens with specific criteria
 * @param {Object} strategies Configuration for trading strategies
 * @returns {Promise<Array>} Matched tokens based on strategies
 */
export async function scanTokens(strategies) {
  try {
    // Try to get trending tokens from AXIOM scraper
    const topTokens = await axiomScraper.getTopTokens();
    
    if (topTokens && topTokens.success && topTokens.data && topTokens.data.length > 0) {
      // Filter tokens based on selected strategies
      return topTokens.data.filter(token => {
        if (strategies.newToken && token.isNew) return true;
        if (strategies.highVolume && parseFloat(token.volume) > 500000) return true;
        if (strategies.bullishMomentum && parseFloat(token.change) > 10) return true;
        if (strategies.whaleTracking && parseFloat(token.volume) > 1000000) return true;
        return false;
      });
    }
    
    // Fallback to mock data if AXIOM scraper fails
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Filter tokens based on selected strategies
    return MOCK_TOKENS.filter(token => {
      if (strategies.newToken && token.isNew) return true;
      if (strategies.highVolume && token.highVolume) return true;
      if (strategies.bullishMomentum && token.change24h > 10) return true;
      if (strategies.whaleTracking && token.volume > 1000000) return true;
      return false;
    });
  } catch (error) {
    logger.error(`Error scanning tokens: ${error.message}`);
    
    // Fallback to mock data
    return MOCK_TOKENS.filter(token => {
      if (strategies.newToken && token.isNew) return true;
      if (strategies.highVolume && token.highVolume) return true;
      if (strategies.bullishMomentum && token.change24h > 10) return true;
      if (strategies.whaleTracking && token.volume > 1000000) return true;
      return false;
    });
  }
}

/**
 * Get market data for a token
 * @param {string} tokenAddressOrSymbol Token address or symbol
 * @returns {Promise<Object>} Market data
 */
export async function getMarketData(tokenAddressOrSymbol) {
  try {
    // Check if input is an address or symbol
    const isAddress = tokenAddressOrSymbol.length > 20; // Simple heuristic
    
    if (isAddress) {
      // Get market data from aggregator
      const marketData = await marketDataAggregator.getMarketData(tokenAddressOrSymbol);
      return marketData;
    } else {
      // For symbols, try to get data from AXIOM scraper
      const tokenData = await axiomScraper.getMarketData(tokenAddressOrSymbol);
      
      if (tokenData && tokenData.success) {
        return tokenData;
      }
      
      // Fallback to mock data
      const mockToken = MOCK_TOKENS.find(t => t.name.includes(tokenAddressOrSymbol));
      
      if (mockToken) {
        return {
          success: true,
          data: {
            symbol: tokenAddressOrSymbol,
            address: mockToken.address,
            price: mockToken.price,
            change: `${mockToken.change24h}%`,
            volume: `$${(mockToken.volume / 1000000).toFixed(1)}M`,
            marketCap: `$${(mockToken.marketCap / 1000000).toFixed(1)}M`
          }
        };
      }
      
      return {
        success: false,
        error: 'Token not found'
      };
    }
  } catch (error) {
    logger.error(`Error getting market data: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates a buy transaction for a token on Devnet
 * This is a simplified version - actual implementation would connect to Raydium/Jupiter
 * 
 * @param {Object} params Transaction parameters
 * @returns {Promise<Transaction>} The prepared transaction
 */
export async function createBuyTransaction({
  connection,
  publicKey,
  tokenAddress,
  amountInSol
}) {
  try {
    // For demonstration, we'll create a transaction that transfers SOL to yourself
    // In a real implementation, this would be a swap transaction using Jupiter or Raydium
    
    // Create a simple transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey, // Sending to self for demo
        lamports: amountInSol * LAMPORTS_PER_SOL
      })
    );
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    
    // Add a memo to simulate token purchase
    const memoInstruction = new Transaction().add({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`Simulated buy of ${tokenAddress} for ${amountInSol} SOL`, 'utf-8')
    });
    
    transaction.add(memoInstruction);
    
    return { transaction, blockhash, lastValidBlockHeight };
  } catch (error) {
    console.error('Error creating buy transaction:', error);
    throw new Error('Failed to create buy transaction');
  }
}

/**
 * Execute a token purchase on Axiom (simulated for Devnet)
 * 
 * @param {Object} params Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
export async function executeTrade({
  connection,
  publicKey,
  signTransaction,
  token,
  amountInSol,
  stopLossPercent,
  takeProfitPercent
}) {
  try {
    // Set execution mode to devnet
    tradeExecutionService.setExecutionMode('devnet');
    
    // Set risk parameters
    tradeExecutionService.setRiskParameters({
      maxLoss: stopLossPercent / 100,
      maxPositionSize: amountInSol / 10 // Assume 10 SOL max portfolio
    });
    
    // Prepare trade parameters
    const tradeParams = {
      side: 'buy',
      market: token.address,
      entryPrice: token.price,
      quantity: amountInSol / token.price,
      orderType: 'limit',
      stopLoss: token.price * (1 - stopLossPercent/100),
      takeProfit: token.price * (1 + takeProfitPercent/100)
    };
    
    // If we have a wallet connection, use it for the transaction
    if (connection && publicKey && signTransaction) {
      // Create buy transaction
      const { transaction, blockhash, lastValidBlockHeight } = await createBuyTransaction({
        connection,
        publicKey,
        tokenAddress: token.address,
        amountInSol
      });
      
      // Sign transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });
      
      // Add signature to trade parameters
      tradeParams.signature = signature;
    }
    
    // Execute trade using trade execution service
    const result = await tradeExecutionService.executeTrade({
      symbol: token.address,
      side: tradeParams.side,
      quantity: tradeParams.quantity,
      price: tradeParams.entryPrice,
      orderType: tradeParams.orderType,
      platform: 'solana',
      network: 'devnet'
    });
    
    if (!result || !result.success) {
      throw new Error(`Trade execution failed: ${result?.error || 'Unknown error'}`);
    }
    
    // Create a trade object
    const trade = {
      id: result.orderId, // Use orderId from result
      token: token.name,
      tokenAddress: token.address,
      entry: token.price,
      current: token.price,
      size: amountInSol,
      profit: 0,
      time: 'Just now',
      stopLoss: tradeParams.stopLoss,
      takeProfit: tradeParams.takeProfit,
      signature: tradeParams.signature
    };
    
    return {
      success: true,
      trade,
      signature: tradeParams.signature
    };
  } catch (error) {
    console.error('Error executing trade:', error);
    throw new Error('Failed to execute trade: ' + error.message);
  }
}

/**
 * Start automatic trading bot that scans and executes trades
 * 
 * @param {Object} params Bot configuration
 * @returns {Promise<Object>} Bot instance
 */
export async function startTradingBot({
  connection,
  publicKey,
  signTransaction,
  strategies,
  riskParams
}) {
  // Scan for tokens matching criteria
  const matchedTokens = await scanTokens(strategies);
  
  if (matchedTokens.length === 0) {
    throw new Error('No tokens matching your strategy criteria were found');
  }
  
  // Select the best token based on criteria (simplified algorithm)
  const selectedToken = matchedTokens.sort((a, b) => {
    // Score based on volume and change
    const scoreA = (a.volume / 1000000) + (a.change24h > 0 ? a.change24h : 0);
    const scoreB = (b.volume / 1000000) + (b.change24h > 0 ? b.change24h : 0);
    return scoreB - scoreA;
  })[0];
  
  // Execute trade with the selected token
  const tradeResult = await executeTrade({
    connection,
    publicKey,
    signTransaction,
    token: selectedToken,
    amountInSol: riskParams.positionSize,
    stopLossPercent: riskParams.stopLoss,
    takeProfitPercent: riskParams.takeProfit
  });
  
  return {
    success: true,
    botId: `bot-${Date.now()}`,
    token: selectedToken,
    trade: tradeResult.trade,
    status: 'active'
  };
}

/**
 * Close a trade (simulated)
 * 
 * @param {Object} params Close trade parameters
 * @returns {Promise<Object>} Close result
 */
export async function closeTrade({
  connection,
  publicKey,
  signTransaction,
  trade
}) {
  try {
    // Cancel order using trade execution service
    const result = await tradeExecutionService.cancelOrder(trade.id);
    
    if (!result || !result.success) {
      throw new Error(`Order cancellation failed: ${result?.error || 'Unknown error'}`);
    }
    
    // If we have a wallet connection, use it for the transaction
    if (connection && publicKey && signTransaction) {
      // Create a transaction that simulates selling the token
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 10000 // Minimal amount for the simulation
        })
      );
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Sign transaction
      const signedTransaction = await signTransaction(transaction);
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });
      
      return {
        success: true,
        signature,
        profit: trade.profit
      };
    }
    
    return {
      success: true,
      profit: trade.profit
    };
  } catch (error) {
    console.error('Error closing trade:', error);
    throw new Error('Failed to close trade: ' + error.message);
  }
}

/**
 * Get trade history
 * 
 * @param {number} limit - Number of trades to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} - Trade history
 */
export async function getTradeHistory(limit = 10, offset = 0) {
  try {
    const trades = tradeExecutionService.getTradeHistory(limit, offset);
    
    return {
      success: true,
      trades
    };
  } catch (error) {
    logger.error(`Error getting trade history: ${error.message}`);
    return {
      success: false,
      error: error.message,
      trades: []
    };
  }
}

/**
 * Get active orders
 * 
 * @returns {Promise<Object>} - Active orders
 */
export async function getActiveOrders() {
  try {
    const orders = tradeExecutionService.getActiveOrders();
    
    return {
      success: true,
      orders
    };
  } catch (error) {
    logger.error(`Error getting active orders: ${error.message}`);
    return {
      success: false,
      error: error.message,
      orders: []
    };
  }
}

/**
 * Cancel an order
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Cancellation result
 */
export async function cancelOrder(orderId) {
  try {
    const result = await tradeExecutionService.cancelOrder(orderId);
    
    return {
      success: result.success,
      orderId
    };
  } catch (error) {
    logger.error(`Error cancelling order: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get token info
 * 
 * @param {string} tokenAddressOrSymbol - Token address or symbol
 * @returns {Promise<Object>} - Token info
 */
export async function getTokenInfo(tokenAddressOrSymbol) {
  try {
    // Get market data
    const marketData = await getMarketData(tokenAddressOrSymbol);
    
    if (!marketData || !marketData.success) {
      throw new Error('Failed to get token info');
    }
    
    // Extract token info from market data
    return {
      success: true,
      data: {
        symbol: marketData.data.symbol,
        name: marketData.data.name || `${marketData.data.symbol} Token`,
        address: marketData.data.address || tokenAddressOrSymbol,
        decimals: marketData.data.decimals || 18,
        totalSupply: marketData.data.totalSupply || '1000000000000000000000000000'
      }
    };
  } catch (error) {
    logger.error(`Error getting token info: ${error.message}`);
    
    // Fallback to mock data
    if (tokenAddressOrSymbol.length > 20) {
      // If it's an address, find the mock token with that address
      const mockToken = MOCK_TOKENS.find(t => t.address === tokenAddressOrSymbol);
      
      if (mockToken) {
        return {
          success: true,
          data: {
            symbol: mockToken.name.split('/')[0],
            name: `${mockToken.name.split('/')[0]} Token`,
            address: mockToken.address,
            decimals: 18,
            totalSupply: '1000000000000000000000000000'
          }
        };
      }
    } else {
      // If it's a symbol, find the mock token with that symbol
      const mockToken = MOCK_TOKENS.find(t => t.name.includes(tokenAddressOrSymbol));
      
      if (mockToken) {
        return {
          success: true,
          data: {
            symbol: tokenAddressOrSymbol,
            name: `${tokenAddressOrSymbol} Token`,
            address: mockToken.address,
            decimals: 18,
            totalSupply: '1000000000000000000000000000'
          }
        };
      }
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process natural language trading instruction
 * 
 * @param {string} instruction - Natural language instruction
 * @returns {Promise<Object>} - Processed instruction result
 */
export async function processInstruction(instruction) {
  try {
    const result = await tradeExecutionService.processInstruction(instruction);
    
    return {
      success: result.success,
      message: result.message,
      actions: result.actions
    };
  } catch (error) {
    logger.error(`Error processing instruction: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Initialize services on module load
initializeServices().catch(error => {
  logger.error(`Failed to initialize AXIOM Trade API services: ${error.message}`);
});
