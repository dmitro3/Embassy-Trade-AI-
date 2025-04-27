/**
 * Token Sniper Service for Embassy Trade
 * 
 * This service monitors for new token pools on Solana using Shyft's WebSocket API,
 * applies advanced filtering (LP burn, mint authority, liquidity, volume), and
 * triggers trades based on user-defined criteria.
 */

import { Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import axios from 'axios';
import bs58 from 'bs58';
import WebSocket from 'ws';
import browserLogger from './browserLogger.js'; // Import our browser-compatible logger

class TokenSniperService {
  constructor() {
    this.connection = null;
    this.ws = null;
    this.isRunning = false;
    this.wallet = null;
    this.config = {
      minLiquidityThreshold: 1000,
      minVolumeThreshold: 500,
      requireLpBurned: true,
      requireMintRevoked: true,
      maxSnipesPerHour: 5
    };
    
    this.snipeCount = { count: 0, lastReset: Date.now() };
    this.tokenCache = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.apiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY || 'whv00T87G8Sd8TeK';
    this.network = 'devnet';
    
    // Event callbacks
    this.onNewTokenDetectedCallback = null;
    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
    this.onErrorCallback = null;
    
    // Rate limiting
    this.requestCounter = 0;
    this.requestCounterReset = Date.now();
    this.maxRequestsPerMinute = 60;

    // Performance metrics
    this.snipeAttemptTimestamps = new Map();
    this.metrics = {
      snipeSuccess: 0,
      snipeFail: 0,
      totalSnipeAttempts: 0,
      averageSnipeTime: 0,
      totalSnipeTime: 0,
      apiResponseTimes: [],
      averageApiResponseTime: 0
    };
    
    console.log('[INFO] Token Sniper Service initialized');
  }

  init(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.log('info', 'Token sniper service initialized with connection');
    return this;
  }

  // Helper method for logging
  async log(level, message, data = null) {
    const formattedMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.log(`[${level.toUpperCase()}] ${formattedMessage}`);
    
    // Use our browser-compatible logger
    try {
      logger[level](formattedMessage);
    } catch (error) {
      console.error(`Error logging to backend: ${error.message}`);
    }
  }

  // Record snipe metrics
  recordSnipe(success, timeToSnipe) {
    this.metrics.totalSnipeAttempts++;
    
    if (success) {
      this.metrics.snipeSuccess++;
    } else {
      this.metrics.snipeFail++;
    }
    
    this.metrics.totalSnipeTime += timeToSnipe;
    this.metrics.averageSnipeTime = this.metrics.totalSnipeTime / this.metrics.totalSnipeAttempts;
    
    return {
      success,
      timeToSnipe,
      snipeSuccessRate: (this.metrics.snipeSuccess / this.metrics.totalSnipeAttempts) * 100,
      averageSnipeTime: this.metrics.averageSnipeTime
    };
  }

  // Record API response time
  recordApiResponse(responseTime) {
    this.metrics.apiResponseTimes.push(responseTime);
    
    // Keep only the last 100 response times
    if (this.metrics.apiResponseTimes.length > 100) {
      this.metrics.apiResponseTimes.shift();
    }
    
    this.metrics.averageApiResponseTime = 
      this.metrics.apiResponseTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.apiResponseTimes.length;
    
    return this.metrics.averageApiResponseTime;
  }

  updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.log('info', 'Token sniper config updated', { config: this.config });
    return this;
  }

  onNewTokenDetected(callback) {
    this.onNewTokenDetectedCallback = callback;
    return this;
  }

  onConnected(callback) {
    this.onConnectedCallback = callback;
    return this;
  }

  onDisconnected(callback) {
    this.onDisconnectedCallback = callback;
    return this;
  }

  onError(callback) {
    this.onErrorCallback = callback;
    return this;
  }

  async start() {
    if (this.isRunning) {
      this.log('info', 'Token sniper already running');
      return true;
    }

    if (!this.connection) {
      this.handleError('Connection not initialized');
      return false;
    }

    try {
      this.connectWebSocket();
      this.isRunning = true;
      this.log('info', 'Token sniper started');
      return true;
    } catch (error) {
      this.handleError(`Failed to start token sniper: ${error.message}`);
      return false;
    }
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.log('info', 'Token sniper stopped');
  }

  connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = `wss://devnet-rpc.shyft.to?api_key=${this.apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.log('info', 'Connected to Shyft WebSocket');
      this.reconnectAttempts = 0;
      
      // Subscribe to transaction events
      this.ws.send(JSON.stringify({ 
        action: 'subscribe', 
        type: 'transaction', 
        network: this.network 
      }));
      
      // Register for program-based events (Raydium, Jupiter, etc.)
      const programs = [
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUeyov7', // Raydium
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',  // Jupiter
        'TokenkegQfeZyiNwAJbNbGkOmDzkLmwZ1Tp',          // Token program
      ];
      
      programs.forEach(programId => {
        this.ws.send(JSON.stringify({
          action: 'subscribe',
          type: 'program',
          program_id: programId,
          network: this.network
        }));
      });
      
      if (this.onConnectedCallback) {
        this.onConnectedCallback();
      }
    });

    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle ping messages
        if (message.type === 'ping') {
          this.ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        
        // Skip non-transaction messages
        if (message.type !== 'transaction' && message.type !== 'program') {
          return;
        }
        
        // Process transaction data
        if (message.transaction) {
          await this.processTransaction(message);
        }
        
      } catch (error) {
        this.handleError(`WebSocket message processing error: ${error.message}`);
      }
    });

    this.ws.on('error', (error) => {
      this.handleError(`WebSocket error: ${error.message}`);
      this.attemptReconnect();
    });

    this.ws.on('close', () => {
      this.log('info', 'WebSocket connection closed');
      if (this.onDisconnectedCallback) {
        this.onDisconnectedCallback();
      }
      
      if (this.isRunning) {
        this.attemptReconnect();
      }
    });
  }

  attemptReconnect() {
    if (!this.isRunning) return;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.handleError(`Maximum reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
      this.isRunning = false;
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    this.log('info', `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.isRunning) {
        this.connectWebSocket();
      }
    }, delay);
  }

  async processTransaction(message) {
    try {
      const transaction = Transaction.from(Buffer.from(message.transaction, 'base64'));
      const instructions = transaction.instructions;
      
      const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGkOmDzkLmwZ1Tp';
      const raydiumProgramIds = [
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUeyov7',
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSce'
      ];
      
      // Check for token creation and liquidity pool creation
      let newTokenMint = null;
      let sourceType = null;
      
      for (const ix of instructions) {
        const programId = ix.programId.toString();
        
        // Check for token program initialize mint instruction
        if (programId === tokenProgramId && ix.data[0] === 0) {
          newTokenMint = ix.keys[0].pubkey.toString();
          sourceType = 'Token Creation';
          break;
        }
        
        // Check for Raydium pool creation
        else if (raydiumProgramIds.includes(programId) && 
                (ix.data[0] === 1 || ix.data[0] === 2 || ix.data[0] === 3)) {
          // Different pool creation instruction codes for different Raydium versions
          for (let i = 0; i < ix.keys.length; i++) {
            // The token mint is typically the 3rd or 4th key in pool creation
            if (i >= 3 && i <= 6 && ix.keys[i] && !ix.keys[i].isSigner) {
              const potentialMint = ix.keys[i].pubkey.toString();
              // Verify this is actually a mint by checking if it's not a known system address
              if (potentialMint !== (SystemProgram.programId?.toString() || '') &&
                  potentialMint !== tokenProgramId) {
                newTokenMint = potentialMint;
                sourceType = 'Raydium Pool Creation';
                break;
              }
            }
          }
        }
      }
      
      if (!newTokenMint) {
        return;
      }
      
      // Prevent processing the same token multiple times
      if (this.tokenCache.has(newTokenMint)) {
        return;
      }
      
      this.log('info', `New potential token detected: ${newTokenMint}`, { sourceType });
      
      // Record start time for this snipe attempt
      const snipeAttemptStartTime = Date.now();
      this.snipeAttemptTimestamps.set(newTokenMint, snipeAttemptStartTime);
      
      this.tokenCache.set(newTokenMint, true);
      
      // Get token metadata and apply filters
      const tokenData = await this.fetchTokenMetadata(newTokenMint);
      if (!tokenData) {
        this.log('warn', `Unable to fetch metadata for token: ${newTokenMint}`);
        return;
      }
      
      // Apply filters
      const { symbol, name, liquidity, volume, price, isLpBurned, isMintAuthorityRevoked } = tokenData;
      
      let filterPassed = true;
      let filterReason = null;
      
      if (this.config.minLiquidityThreshold > 0 && liquidity < this.config.minLiquidityThreshold) {
        filterPassed = false;
        filterReason = `Liquidity (${liquidity}) below threshold (${this.config.minLiquidityThreshold})`;
      }
      
      if (filterPassed && this.config.minVolumeThreshold > 0 && volume < this.config.minVolumeThreshold) {
        filterPassed = false;
        filterReason = `Volume (${volume}) below threshold (${this.config.minVolumeThreshold})`;
      }
      
      if (filterPassed && this.config.requireLpBurned && !isLpBurned) {
        filterPassed = false;
        filterReason = 'LP not burned';
      }
      
      if (filterPassed && this.config.requireMintRevoked && !isMintAuthorityRevoked) {
        filterPassed = false;
        filterReason = 'Mint authority not revoked';
      }
      
      // Check snipe count per hour limit
      const now = Date.now();
      if (now - this.snipeCount.lastReset >= 3600000) {
        this.snipeCount.count = 0;
        this.snipeCount.lastReset = now;
      }
      
      if (filterPassed && this.snipeCount.count >= this.config.maxSnipesPerHour) {
        filterPassed = false;
        filterReason = `Max snipes per hour reached: ${this.config.maxSnipesPerHour}`;
      }
      
      // Calculate time-to-detect for performance monitoring
      const timeToDetect = now - snipeAttemptStartTime;
      
      // Process token if it passes all filters
      if (filterPassed) {
        this.log('info', `Token passed all filters: ${symbol || 'Unknown'} (${newTokenMint})`, {
          sourceType,
          timeToDetect,
          symbol,
          name,
          liquidity,
          volume
        });
        
        this.snipeCount.count++;
        
        // Record successful snipe in metrics
        this.recordSnipe(true, timeToDetect);
        
        if (this.onNewTokenDetectedCallback) {
          this.onNewTokenDetectedCallback({
            mintAddress: newTokenMint,
            sourceType,
            timeToDetect,
            metadata: {
              symbol,
              name,
              liquidity,
              volume,
              price,
              isLpBurned,
              isMintAuthorityRevoked
            }
          });
        }
      } else {
        this.log('info', `Token filtered out: ${filterReason} - ${symbol || 'Unknown'} (${newTokenMint})`);
        
        // Record failed snipe in metrics
        this.recordSnipe(false, timeToDetect);
      }
      
    } catch (error) {
      this.handleError(`Error processing transaction: ${error.message}`);
    }
  }

  async fetchTokenMetadata(mintAddress) {
    const startTime = Date.now();
    try {
      // Check rate limit
      const now = Date.now();
      if (now - this.requestCounterReset > 60000) {
        this.requestCounter = 0;
        this.requestCounterReset = now;
      }
      
      if (this.requestCounter >= this.maxRequestsPerMinute) {
        this.log('warn', 'API rate limit reached, waiting...', { mintAddress });
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchTokenMetadata(mintAddress);
      }
      
      this.requestCounter++;
      
      const apiUrl = `https://api.shyft.to/sol/v1/token/${mintAddress}?network=${this.network}&api_key=${this.apiKey}`;
      const response = await axios.get(apiUrl);
      
      // Record API response time for performance monitoring
      const responseTime = Date.now() - startTime;
      this.recordApiResponse(responseTime);
      
      if (!response.data?.result) {
        throw new Error('Invalid token data response');
      }
      
      const tokenData = response.data.result;
      
      // Verify LP burn and mint authority status
      const verificationData = await this.verifyTokenSafety(mintAddress);
      
      this.log('debug', 'Token metadata fetched successfully', {
        mintAddress,
        symbol: tokenData.symbol,
        responseTime
      });
      
      return {
        mintAddress: mintAddress,
        symbol: tokenData.symbol || 'UNKNOWN',
        name: tokenData.name || 'Unknown Token',
        decimals: tokenData.decimals || 0,
        liquidity: tokenData.liquidity || 0,
        volume: tokenData.volume || 0,
        price: tokenData.price || 0,
        isLpBurned: verificationData?.isLpBurned || false,
        isMintAuthorityRevoked: verificationData?.isMintAuthorityRevoked || false
      };
    } catch (error) {
      this.log('error', `Error fetching token metadata for ${mintAddress}: ${error.message}`, { responseTime: Date.now() - startTime });
      return null;
    }
  }

  async verifyTokenSafety(mintAddress) {
    const startTime = Date.now();
    try {
      // Check rate limit
      const now = Date.now();
      if (now - this.requestCounterReset > 60000) {
        this.requestCounter = 0;
        this.requestCounterReset = now;
      }
      
      if (this.requestCounter >= this.maxRequestsPerMinute) {
        this.log('warn', 'API rate limit reached, waiting...', { mintAddress });
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.verifyTokenSafety(mintAddress);
      }
      
      this.requestCounter++;
      
      const verificationUrl = `https://api.shyft.to/sol/v1/token/verify?network=${this.network}&api_key=${this.apiKey}&token_address=${mintAddress}`;
      const response = await axios.get(verificationUrl);
      
      // Record API response time
      const responseTime = Date.now() - startTime;
      this.recordApiResponse(responseTime);
      
      if (!response.data?.result) {
        throw new Error('Invalid verification data');
      }
      
      this.log('debug', 'Token safety verification completed', {
        mintAddress,
        isLpBurned: response.data.result.isLpBurned,
        isMintAuthorityRevoked: response.data.result.isMintAuthorityRevoked,
        responseTime
      });
      
      return {
        isLpBurned: response.data.result.isLpBurned || false,
        isMintAuthorityRevoked: response.data.result.isMintAuthorityRevoked || false
      };
    } catch (error) {
      this.log('error', `Error verifying token safety for ${mintAddress}: ${error.message}`, { 
        responseTime: Date.now() - startTime 
      });
      
      return {
        isLpBurned: false,
        isMintAuthorityRevoked: false
      };
    }
  }

  handleError(errorMessage) {
    this.log('error', `Token Sniper Error: ${errorMessage}`);
    if (this.onErrorCallback) {
      this.onErrorCallback(errorMessage);
    }
  }
  
  /**
   * Get real-time performance metrics
   */
  getPerformanceMetrics() {
    return {
      snipeSuccess: this.metrics.snipeSuccess,
      snipeFail: this.metrics.snipeFail,
      totalSnipeAttempts: this.metrics.totalSnipeAttempts,
      snipeSuccessRate: this.metrics.totalSnipeAttempts > 0 ? 
        (this.metrics.snipeSuccess / this.metrics.totalSnipeAttempts) * 100 : 0,
      averageSnipeTime: this.metrics.averageSnipeTime,
      averageApiResponseTime: this.metrics.averageApiResponseTime
    };
  }
}

// Export as singleton
const tokenSniperService = new TokenSniperService();
export default tokenSniperService;