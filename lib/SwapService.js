import axios from 'axios';
import { Transaction, ComputeBudgetProgram, PublicKey } from '@solana/web3.js';
import logger from './logger';

// Constants
const DEX_TIMEOUT_MS = 30000;
const LAMPORTS_PER_SOL = 1000000000;

class SwapService {
  constructor(wallet = null, connection = null, isLive = false) {
    this.wallet = wallet;
    this.connection = connection;
    this.isLive = isLive;
    this.blacklistedTokens = new Set();
    this.dailyLoss = 0;
    this.lastLossResetDay = new Date().getDate();
    this.options = {
      maxDailyLoss: 1 * LAMPORTS_PER_SOL, // 1 SOL max daily loss
      defaultSlippageBps: 50, // 0.5% default slippage
    };
    this.endpoints = {
      raydium: 'https://api.raydium.io/v2',
      birdeye: 'https://public-api.birdeye.so',
      jupiter: 'https://quote-api.jup.ag/v6',
    };
  }

  /**
   * Execute a token swap using Raydium with enhanced error handling
   * @param {Object} tradeDetails - Enhanced trade details
   * @returns {string|null} Transaction ID or null if failed
   */
  async executeSwapWithRaydium(tradeDetails) {
    const { inputMint, outputMint, amount, slippageBps, priorityFeeMultiplier } = tradeDetails;
    
    try {
      // Check for daily loss limit
      if (this.dailyLoss >= this.options.maxDailyLoss) {
        await logger.warn(`Daily loss limit reached: ${this.dailyLoss / LAMPORTS_PER_SOL} SOL, aborting swap`);
        return null;
      }
      
      // Reset daily loss if we're on a new day
      const currentDay = new Date().getDate();
      if (currentDay !== this.lastLossResetDay) {
        await logger.info(`Resetting daily loss counter (new day: ${currentDay})`);
        this.dailyLoss = 0;
        this.lastLossResetDay = currentDay;
      }
      
      // Blacklist check
      if (this.blacklistedTokens.has(outputMint)) {
        await logger.warn(`Token ${outputMint} is blacklisted, skipping swap`);
        return null;
      }
      
      await logger.info(`Attempting Raydium swap: ${inputMint.substring(0,8)}... → ${outputMint.substring(0,8)}..., Amount: ${amount / LAMPORTS_PER_SOL} SOL, Slippage: ${slippageBps} bps`);
      
      // If not in live mode, return a mock transaction ID
      if (!this.isLive) {
        const mockTxId = `mock-raydium-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        await logger.info(`Mock Raydium swap executed: ${mockTxId}`);
        await logger.info(`Mock swap details: ${inputMint.substring(0,8)}... → ${outputMint.substring(0,8)}..., amount: ${amount / 1e9} SOL`);
        
        if (priorityFeeMultiplier) {
          await logger.info(`Mock priority fee applied: ${priorityFeeMultiplier}x (${priorityFeeMultiplier * 100000} microlamports per CU)`);
        }
        
        return mockTxId;
      }
      
      // Validate token pool with Birdeye for additional safeguards
      const poolData = await this.validatePoolWithBirdeye(outputMint);
      if (!poolData || !poolData.valid) {
        await logger.error(`No valid pool found for ${outputMint.substring(0,8)}...`);
        return null;
      }
      
      // Get volatility for dynamic slippage adjustment
      const volatility = await this.getMarketVolatility(outputMint);
      const dynamicSlippage = slippageBps * (1 + volatility);
      await logger.info(`Slippage adjusted for volatility (${volatility.toFixed(2)}): ${dynamicSlippage} bps`);
      
      // Abort if slippage is too high
      if (dynamicSlippage > 200 && !tradeDetails.recoveryMode) {
        await logger.warn(`High slippage detected: ${dynamicSlippage} bps, aborting swap`);
        return null;
      }
      
      // In live mode, execute a real swap on Raydium with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEX_TIMEOUT_MS);
      
      try {
        const walletPublicKey = this.wallet.publicKey.toString();
        
        // Calculate minimum amount out based on slippage
        const slippageMultiplier = 1 - (dynamicSlippage / 10000);
        const minAmountOut = poolData.price * amount * slippageMultiplier;
        await logger.info(`Expected price: ${poolData.price}, Minimum out: ${minAmountOut / LAMPORTS_PER_SOL} SOL equivalent`);
        
        // Implement stop-loss 
        const stopLoss = amount * 0.95; // 5% stop-loss
        if (poolData.price * amount < stopLoss) {
          await logger.warn(`Swap aborted: Potential loss exceeds stop-loss threshold`);
          this.dailyLoss += (amount - poolData.price * amount);
          return null;
        }
        
        // Fetch quote from Raydium API with proper error handling
        const quoteUrl = `${this.endpoints.raydium}/quote`;
        const quoteResponse = await axios.post(quoteUrl, {
          inputMint,
          outputMint,
          amount: amount.toString(),
          slippageBps: dynamicSlippage,
          onlyDirectRoutes: false, // Allow indirect routes for better pricing
          maxPriceImpactPct: dynamicSlippage / 100 * 1.2 // Allow slightly higher impact than slippage
        }, {
          signal: controller.signal,
          timeout: DEX_TIMEOUT_MS
        });
        
        if (!quoteResponse.data || !quoteResponse.data.swapTransaction) {
          throw new Error('Failed to get quote from Raydium: Invalid response');
        }
        
        // Log expected slippage vs actual slippage
        if (quoteResponse.data.priceImpactPct) {
          const actualPriceImpact = parseFloat(quoteResponse.data.priceImpactPct);
          await logger.info(`Quote received - Price impact: ${actualPriceImpact.toFixed(2)}%, Allowed slippage: ${(dynamicSlippage / 100).toFixed(2)}%`);
          
          // Abort if actual price impact significantly exceeds expected slippage
          if (actualPriceImpact > dynamicSlippage / 100 * 1.5 && !tradeDetails.recoveryMode) {
            await logger.warn(`Excessive price impact detected: ${actualPriceImpact.toFixed(2)}% vs expected ${(dynamicSlippage / 100).toFixed(2)}%, aborting swap`);
            return null;
          }
        }
        
        // Deserialize and sign the transaction
        const txData = quoteResponse.data.swapTransaction;
        const transaction = Transaction.from(Buffer.from(txData, 'base64'));
        
        // Add priority fee if specified using ComputeBudgetProgram
        if (priorityFeeMultiplier && priorityFeeMultiplier > 1) {
          // Calculate microlamports based on priority multiplier
          // Base value of 100000 microlamports (0.0001 SOL) * multiplier
          const microLamports = Math.round(100000 * priorityFeeMultiplier);
          
          // Create priority fee instruction
          const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports
          });
          
          // Add to transaction at the beginning
          transaction.instructions.unshift(priorityFeeIx);
          
          await logger.info(`Added priority fee: ${microLamports} microlamports per compute unit`);
        }
        
        // Sign the transaction
        const signedTx = await this.wallet.signTransaction(transaction);
        
        // Send and confirm the transaction with retries for reliability
        const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: tradeDetails.recoveryMode, // Skip preflight in recovery mode
          maxRetries: 3
        });
        
        // Track transaction submission time for latency measurement
        const submissionTime = Date.now();
        
        // Use a reasonable commitment level for confirmation
        await this.connection.confirmTransaction(signature, 'confirmed');
        
        // Measure confirmation latency
        const confirmationLatency = Date.now() - submissionTime;
        await logger.info(`Transaction confirmed in ${confirmationLatency}ms`);
        
        // Check if the transaction succeeded or failed
        const txInfo = await this.connection.getTransaction(signature, {
          commitment: 'confirmed',
        });
        
        if (!txInfo || txInfo.meta.err) {
          await logger.error(`Transaction failed: ${txInfo?.meta?.err || 'Unknown error'}`);
          // Update daily loss tracking
          this.dailyLoss += amount * 0.01; // Assume 1% loss on failed transaction (gas fees)
          throw new Error(`Transaction failed: ${txInfo?.meta?.err || 'Unknown error'}`);
        }
        
        await logger.info(`Raydium swap executed: ${signature}`);
        return signature;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        await logger.error('Raydium swap timed out after ' + DEX_TIMEOUT_MS + 'ms');
        throw new Error('Swap timed out');
      } else {
        await logger.error(`Raydium swap failed: ${error.message}`);
        throw error; // Re-throw for retry handling
      }
    }
  }
  
  /**
   * Get market volatility for a token to adjust slippage dynamically
   * @param {string} tokenMint - Token mint address
   * @returns {number} Volatility factor (0-1)
   */
  async getMarketVolatility(tokenMint) {
    try {
      // For native SOL, assume low volatility
      if (tokenMint === 'So11111111111111111111111111111111111111112') {
        return 0.1; // 10% volatility
      }
      
      // For mock trading, return moderate volatility
      if (!this.isLive) {
        return 0.2; // 20% volatility
      }
      
      // Get 1-hour historical data
      const priceData = await this.fetchHistoricalPriceData(tokenMint, '1h');
      
      if (!priceData || priceData.length < 2) {
        return 0.2; // Default to moderate volatility
      }
      
      // Calculate price volatility
      let sumSquaredReturns = 0;
      let previousPrice = null;
      let validReturns = 0;
      
      for (const item of priceData) {
        if (previousPrice && previousPrice > 0) {
          const priceReturn = (item.value - previousPrice) / previousPrice;
          sumSquaredReturns += priceReturn * priceReturn;
          validReturns++;
        }
        previousPrice = item.value;
      }
      
      // Calculate volatility
      if (validReturns > 0) {
        // Standard deviation of returns
        const stdDev = Math.sqrt(sumSquaredReturns / validReturns);
        
        // Annualize volatility
        const annualizedVolatility = stdDev * Math.sqrt(8760); // 8760 hours in a year
        
        // Normalize to 0-1 range for slippage adjustment
        const normalizedVolatility = Math.min(1, annualizedVolatility);
        
        return normalizedVolatility;
      }
      
      return 0.2; // Default to moderate volatility
    } catch (error) {
      await logger.warn(`Failed to calculate volatility: ${error.message}`);
      return 0.2; // Default to moderate volatility
    }
  }

  /**
   * Validate token pool with Birdeye API
   * @param {string} tokenMint - Token mint address
   * @returns {Object} Pool data including validity
   */
  async validatePoolWithBirdeye(tokenMint) {
    if (!this.isLive) {
      // Mock pool data for testing
      return {
        valid: true,
        liquidity: 1000000,
        price: 0.5,
      };
    }

    try {
      const response = await axios.get(
        `${this.endpoints.birdeye}/token_list/token?address=${tokenMint}`,
        {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY }
        }
      );

      if (!response.data || !response.data.data) {
        return { valid: false };
      }

      const tokenData = response.data.data;
      
      // Check for sufficient liquidity and valid price
      const hasValidLiquidity = tokenData.liquidity && tokenData.liquidity > 10000;
      const hasValidPrice = tokenData.price && tokenData.price > 0;
      
      return {
        valid: hasValidLiquidity && hasValidPrice,
        liquidity: tokenData.liquidity || 0,
        price: tokenData.price || 0,
      };
    } catch (error) {
      await logger.error(`Failed to validate token pool: ${error.message}`);
      return { valid: false };
    }
  }

  /**
   * Fetch historical price data for a token
   * @param {string} tokenMint - Token mint address
   * @param {string} interval - Time interval (e.g. '1h', '1d')
   * @returns {Array} Price data
   */
  async fetchHistoricalPriceData(tokenMint, interval = '1h') {
    if (!this.isLive) {
      // Mock price data for testing
      return [
        { timestamp: Date.now() - 3600000, value: 0.9 },
        { timestamp: Date.now() - 2400000, value: 1.0 },
        { timestamp: Date.now() - 1200000, value: 1.1 },
        { timestamp: Date.now(), value: 1.0 }
      ];
    }
    
    try {
      const response = await axios.get(
        `${this.endpoints.birdeye}/defi/price_history?address=${tokenMint}&type=${interval}&time_from=${Math.floor((Date.now() - 86400000) / 1000)}`,
        {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_BIRDEYE_API_KEY }
        }
      );
      
      if (!response.data || !response.data.data || !response.data.data.items) {
        return [];
      }
      
      return response.data.data.items;
    } catch (error) {
      await logger.warn(`Failed to fetch historical price data: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute a trade with a specific amount in SOL
   * @param {number} amount - Amount in SOL
   * @returns {Object} Trade result
   */
  async executeTradeWithAmount(amount) {
    try {
      // Convert amount to lamports
      const lamports = amount * LAMPORTS_PER_SOL;
      
      // Use SOL as input and USDC as output
      const tradeDetails = {
        inputMint: 'So11111111111111111111111111111111111111112', // Native SOL
        outputMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
        amount: lamports,
        slippageBps: 50, // 0.5% slippage
        priorityFeeMultiplier: 1.5 // Moderate priority fee
      };
      
      // Execute the swap
      const txId = await this.executeSwapWithRaydium(tradeDetails);
      
      if (txId) {
        return {
          success: true,
          txId,
          inputAmount: amount,
          inputToken: 'SOL',
          outputToken: 'USDC'
        };
      } else {
        return {
          success: false,
          error: 'Swap execution failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default SwapService;