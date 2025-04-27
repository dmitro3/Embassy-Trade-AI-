/**
 * Copy Trading Module for Embassy Trade
 * 
 * This module enables users to follow and copy trades from top-performing traders
 * on the platform, with configurable settings and risk management.
 */

import axios from 'axios';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
// Removing the Jupiter import and replacing with a mock implementation
// import { Jupiter } from '@jup-ag/core';

// Mock Jupiter implementation for development
const JupiterMock = {
  load: async ({ connection, cluster, platformFeeAndAccounts }) => {
    console.log('Mock Jupiter loaded for cluster:', cluster);
    return {
      computeRoutes: async ({ inputMint, outputMint, amount, slippageBps }) => {
        console.log(`Computing routes from ${inputMint} to ${outputMint} for amount ${amount}`);
        return [
          { 
            inAmount: amount,
            outAmount: amount * 1.02,
            priceImpactPct: 0.5,
            marketInfos: [{ label: 'Mock DEX' }],
            otherAmountThreshold: 0
          }
        ];
      },
      exchange: async ({ routeInfo, userPublicKey, wrapAndUnwrapSol, mevProtection }) => {
        console.log(`Mock exchange with route for user ${userPublicKey}, MEV protection: ${mevProtection}`);
        return {
          execute: async () => {
            // Simulate a successful swap
            return {
              txid: 'mock-txid-' + Date.now(),
              inputAmount: routeInfo.inAmount,
              outputAmount: routeInfo.outAmount,
              outputAmountInDecimal: 9,
              success: true
            };
          }
        };
      }
    };
  }
};

// Cache for trader profiles and their trades
const traderCache = new Map();
const processedTradesCache = new Map();

/**
 * Start copy trading for a specific trader
 * 
 * @param {Object} wallet - User's wallet
 * @param {Object} connection - Solana connection object
 * @param {Function} setLogs - Callback to update logs
 * @param {String} traderPublicKey - Public key of the trader to copy
 * @param {Object} options - Configuration options
 * @returns {Function} Cleanup function
 */
export const startCopyTrading = async (wallet, connection, setLogs, traderPublicKey, options = {}) => {
  if (!wallet || !wallet.publicKey) {
    setLogs([{ type: 'error', message: 'Wallet not connected', timestamp: Date.now() }]);
    return () => {};
  }

  if (!traderPublicKey) {
    setLogs([{ type: 'error', message: 'No trader public key provided', timestamp: Date.now() }]);
    return () => {};
  }

  try {
    // Validate public key format
    new PublicKey(traderPublicKey);
  } catch (error) {
    setLogs([{ type: 'error', message: `Invalid trader public key: ${error.message}`, timestamp: Date.now() }]);
    return () => {};
  }

  // Default options
  const {
    maxTradesPerHour = 5,
    mevProtection = true,
    tradeAmount = 0.05,
    minProfitability = 20, // Only copy traders with >20% win rate
    copyDelay = 5000, // 5 seconds delay to avoid frontrunning
    stopLossPercent = 5,
    takeProfitPercent = 15
  } = options;

  const user = wallet.publicKey.toString();
  const message = `Sign to authenticate: ${user}`;
  const messageBytes = new TextEncoder().encode(message);
  
  try {
    const signature = await wallet.signMessage(messageBytes);
    const signatureBase58 = bs58.encode(signature);

    setLogs([{ 
      type: 'info', 
      message: `Starting copy trading for trader: ${traderPublicKey.slice(0, 8)}...`, 
      timestamp: Date.now() 
    }]);

    // Create API client with authentication
    const backendApi = axios.create({
      baseURL: '/api',
      headers: {
        publicKey: user,
        signature: signatureBase58,
        message
      }
    });

    // Fetch trader profile to verify they're valid and public
    const traderProfileResponse = await backendApi.get(`/trader/profile/${traderPublicKey}`);
    
    if (!traderProfileResponse.data || !traderProfileResponse.data.profile) {
      setLogs([{ type: 'error', message: 'Trader profile not found or not public', timestamp: Date.now() }]);
      return () => {};
    }

    const traderProfile = traderProfileResponse.data.profile;
    const traderAnalytics = traderProfileResponse.data.analytics || {};

    // Check if trader meets minimum profitability criteria
    if (traderAnalytics.winRate < minProfitability) {
      setLogs([{ 
        type: 'warning', 
        message: `Trader's win rate (${traderAnalytics.winRate}%) is below minimum threshold (${minProfitability}%)`, 
        timestamp: Date.now() 
      }]);
    }

    // Follow the trader in the backend
    await backendApi.post(`/trader/follow/${traderPublicKey}`);

    setLogs(prev => [...prev, { 
      type: 'success', 
      message: `Successfully following trader ${traderPublicKey.slice(0, 8)}...`, 
      timestamp: Date.now() 
    }]);

    // Store trader in cache
    traderCache.set(traderPublicKey, {
      profile: traderProfile,
      analytics: traderAnalytics,
      lastChecked: Date.now()
    });

    // Initialize Jupiter for executing trades
    const network = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
    const jupiter = await JupiterMock.load({ 
      connection, 
      cluster: network, 
      platformFeeAndAccounts: {
        feeBps: 20, // 0.2%
        feeAccounts: {}
      }
    });

    // Track trades per hour to enforce limit
    const tradeCounter = {
      count: 0,
      lastReset: Date.now()
    };

    // Map to track active positions from copy trading
    const activePositions = new Map();

    // Poll for new trades
    const tradeInterval = setInterval(async () => {
      try {
        // Reset trade counter after an hour
        const now = Date.now();
        if (now - tradeCounter.lastReset > 3600000) {
          tradeCounter.count = 0;
          tradeCounter.lastReset = now;
        }

        // Check if max trades per hour reached
        if (tradeCounter.count >= maxTradesPerHour) {
          return;
        }

        // Fetch trader's trades
        const tradesResponse = await backendApi.get(`/trades/${traderPublicKey}`, {
          params: {
            limit: 10,
            sort: '-entryTime'
          }
        });

        const trades = tradesResponse.data;
        if (!trades || !Array.isArray(trades) || trades.length === 0) {
          return;
        }

        // Look for new trades
        for (const trade of trades) {
          if (!trade.positionId || processedTradesCache.has(trade.positionId)) {
            continue;
          }

          // Add to processed cache
          processedTradesCache.set(trade.positionId, true);

          // Only process trades created in the last 15 minutes
          const tradeTime = new Date(trade.entryTime).getTime();
          if (now - tradeTime > 15 * 60 * 1000) {
            continue;
          }

          // Only copy BUY trades, not closing trades
          if (!trade.inputMint || !trade.outputMint || !trade.inputAmount || trade.closeTime) {
            continue;
          }

          setLogs(prev => [...prev, { 
            type: 'signal', 
            message: `New trade detected from ${traderPublicKey.slice(0, 8)}... buying ${trade.outputMint.slice(0, 8)}...`, 
            timestamp: Date.now() 
          }]);

          // Wait before executing trade to avoid frontrunning
          await new Promise(resolve => setTimeout(resolve, copyDelay));

          try {
            // Execute the copy trade
            const solMint = 'So11111111111111111111111111111111111111112';
            
            // Create copy trade identifier
            const copyPositionId = `copy-${trade.positionId}-${Date.now()}`;

            // Compute routes
            const routes = await jupiter.computeRoutes({
              inputMint: new PublicKey(solMint),
              outputMint: new PublicKey(trade.outputMint),
              amount: tradeAmount * 1e9, // convert to lamports
              slippageBps: 50 // 0.5% slippage
            });

            if (!routes || routes.length === 0) {
              setLogs(prev => [...prev, { 
                type: 'error', 
                message: `No routes found for ${trade.outputMint}`, 
                timestamp: Date.now() 
              }]);
              continue;
            }

            // Execute the swap
            const { execute } = await jupiter.exchange({
              routeInfo: routes[0],
              userPublicKey: wallet.publicKey,
              wrapAndUnwrapSol: true,
              mevProtection
            });

            const result = await execute();

            // Record successful trade
            tradeCounter.count++;

            // Record position for monitoring
            const entryPrice = result.outputAmount / Math.pow(10, result.outputAmountInDecimal);
            activePositions.set(copyPositionId, {
              mint: trade.outputMint,
              entryPrice,
              stopLoss: entryPrice * (1 - stopLossPercent / 100),
              takeProfit: entryPrice * (1 + takeProfitPercent / 100),
              tradeAmount: tradeAmount,
              originalTradeId: trade.positionId,
              traderPublicKey
            });

            // Record trade in backend
            await backendApi.post('/trades/copy', {
              originalTradeId: trade.positionId,
              traderPublicKey,
              inputMint: solMint,
              outputMint: trade.outputMint,
              inputAmount: tradeAmount,
              outputAmount: result.outputAmount / Math.pow(10, result.outputAmountInDecimal),
              entryPrice,
              entryTime: new Date(),
              positionId: copyPositionId,
              isSnipeTrade: false
            });

            setLogs(prev => [...prev, { 
              type: 'success', 
              message: `Successfully copied trade: Bought ${trade.outputMint.slice(0, 8)}... for ${tradeAmount} SOL`, 
              timestamp: Date.now() 
            }]);

          } catch (tradeError) {
            setLogs(prev => [...prev, { 
              type: 'error', 
              message: `Failed to copy trade: ${tradeError.message}`, 
              timestamp: Date.now() 
            }]);
          }
        }
      } catch (error) {
        setLogs(prev => [...prev, { 
          type: 'error', 
          message: `Copy trading error: ${error.message}`, 
          timestamp: Date.now() 
        }]);
      }
    }, 30000); // Poll every 30 seconds

    // Monitor positions for stop loss / take profit
    const monitorInterval = setInterval(async () => {
      try {
        for (const [positionId, position] of activePositions.entries()) {
          try {
            const priceResponse = await axios.get(`https://api.shyft.to/sol/v1/token/${position.mint}?network=${network}&api_key=${process.env.NEXT_PUBLIC_SHYFT_API_KEY || 'whv00T87G8Sd8TeK'}`);
            
            if (!priceResponse.data?.result?.price) continue;
            
            const currentPrice = priceResponse.data.result.price;
            
            // Check stop loss and take profit
            if (currentPrice <= position.stopLoss || currentPrice >= position.takeProfit) {
              // Execute sell
              const routes = await jupiter.computeRoutes({
                inputMint: new PublicKey(position.mint),
                outputMint: new PublicKey('So11111111111111111111111111111111111111112'),
                amount: position.tradeAmount * 1e9, // amount in lamports
                slippageBps: 100 // 1% slippage for exit
              });

              if (!routes || routes.length === 0) continue;

              const { execute } = await jupiter.exchange({
                routeInfo: routes[0],
                userPublicKey: wallet.publicKey,
                wrapAndUnwrapSol: true
              });

              const result = await execute();

              // Update trade in database
              await backendApi.post(`/trades/${positionId}/close`, {
                closePrice: currentPrice,
                closeTime: new Date(),
                pnl: ((currentPrice / position.entryPrice) - 1) * 100,
                closeReason: currentPrice <= position.stopLoss ? 'stop_loss' : 'take_profit'
              });

              // Remove from active positions
              activePositions.delete(positionId);

              setLogs(prev => [...prev, { 
                type: 'info', 
                message: `Position ${positionId} closed: ${currentPrice <= position.stopLoss ? 'Stop-loss' : 'Take-profit'} triggered at ${currentPrice}`, 
                timestamp: Date.now() 
              }]);
            }
          } catch (priceError) {
            console.error(`Error monitoring position ${positionId}:`, priceError);
          }
        }
      } catch (monitorError) {
        console.error('Error in position monitoring:', monitorError);
      }
    }, 60000); // Check every minute

    // Return cleanup function
    return () => {
      clearInterval(tradeInterval);
      clearInterval(monitorInterval);
      setLogs(prev => [...prev, { 
        type: 'info', 
        message: `Copy trading stopped for trader ${traderPublicKey.slice(0, 8)}...`, 
        timestamp: Date.now() 
      }]);
    };
  } catch (error) {
    setLogs(prev => [...prev, { 
      type: 'error', 
      message: `Failed to initialize copy trading: ${error.message}`, 
      timestamp: Date.now() 
    }]);
    return () => {};
  }
};

/**
 * Fetch top performing traders on the platform
 * 
 * @param {Object} wallet - User's wallet
 * @param {String} timeframe - Timeframe for analytics (day, week, month, all)
 * @param {Number} limit - Number of traders to fetch
 * @returns {Array} List of top traders with their profiles and analytics
 */
export const getTopTraders = async (wallet, timeframe = 'all', limit = 10) => {
  try {
    const response = await axios.get('/api/traders/top', {
      params: { timeframe, limit }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching top traders:', error);
    return [];
  }
};

/**
 * Check if a user is following a specific trader
 * 
 * @param {Object} wallet - User's wallet
 * @param {String} traderPublicKey - Public key of the trader
 * @returns {Boolean} Whether the user is following the trader
 */
export const isFollowingTrader = async (wallet, traderPublicKey) => {
  if (!wallet || !wallet.publicKey) return false;
  
  try {
    const user = wallet.publicKey.toString();
    const message = `Sign to authenticate: ${user}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(messageBytes);
    const signatureBase58 = bs58.encode(signature);
    
    const backendApi = axios.create({
      baseURL: '/api',
      headers: {
        publicKey: user,
        signature: signatureBase58,
        message
      }
    });
    
    const response = await backendApi.get('/config');
    const followedTraders = response.data.followedTraders || [];
    
    return followedTraders.includes(traderPublicKey);
  } catch (error) {
    console.error('Error checking followed traders:', error);
    return false;
  }
};

export default {
  startCopyTrading,
  getTopTraders,
  isFollowingTrader
};