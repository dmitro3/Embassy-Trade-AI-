'use client';

import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';
import logger from './logger.js';

/**
 * Grok 3 Trading Service for AI-powered trading
 * 
 * This service provides a JavaScript wrapper around the Grok 3 API,
 * allowing for seamless integration with the TradeForce AI Trading Agent.
 */
class Grok3TradingService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GROK_API_KEY || 'grok3_api_key_placeholder';
    this.baseUrl = 'https://api.x.ai/v1';
    this.models = {
      prediction: {
        id: 'grok-3-beta',
        systemPrompt: 'You are a specialized trading prediction system optimizing for a 65% win rate. You analyze market data and predict trade outcomes with confidence scores. Your responses should be structured as JSON with fields: prediction (buy/sell/hold), confidence (0-1), targetPrice, stopLoss, reasoning.'
      },
      execution: {
        id: 'grok-3-beta',
        systemPrompt: 'You are a trade execution optimizer. You determine the optimal parameters for executing trades based on market conditions, liquidity, and volatility. Your responses should be structured as JSON with fields: entryPrice, quantity, orderType (limit/market), slippageTolerance, priorityFee, reasoning.'
      },
      analysis: {
        id: 'grok-3-beta',
        systemPrompt: 'You are a market analysis expert. You identify patterns, trends, and anomalies in market data. Your responses should be structured as JSON with fields: marketCondition (trending/ranging/volatile), keyLevels (support/resistance), patterns (array of identified patterns), indicators (RSI, MACD, etc.), recommendation, reasoning.'
      },
      chat: {
        id: 'grok-3-beta',
        systemPrompt: 'You are a trading assistant that helps users understand market conditions and make informed trading decisions. Provide clear, concise explanations and actionable insights.'
      }
    };
    this.initialized = false;
    this.winRateTarget = 65; // Target win rate percentage
  }

  /**
   * Check available models from the Grok 3 API
   * @returns {Promise<Array>} - List of available models
   */
  async checkAvailableModels() {
    const transaction = startAppTransaction('grok3-check-models', 'api.models');
    
    try {
      const response = await this.makeRequest('/models', 'GET');
      
      if (response && response.data) {
        const availableModels = response.data.map(model => model.id);
        logger.info(`Available Grok models: ${availableModels.join(', ')}`);
        
        // Update models if better options are available
        if (availableModels.includes('grok-3-trading')) {
          this.models.prediction.id = 'grok-3-trading';
          this.models.execution.id = 'grok-3-trading';
          this.models.analysis.id = 'grok-3-trading';
          this.models.chat.id = 'grok-3-trading';
          logger.info('Updated to use specialized grok-3-trading model');
        }
        
        return availableModels;
      }
      
      return ['grok-3-beta']; // Default fallback
    } catch (error) {
      logger.error(`Failed to check available models: ${error.message}`);
      return ['grok-3-beta']; // Default fallback
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Initialize the Grok 3 service and verify API key
   */
  async initialize() {
    const transaction = startAppTransaction('grok3-initialize', 'api.init');
    
    try {
      // Check available models first
      await this.checkAvailableModels();
      
      // We don't have a direct auth/verify endpoint, so we'll make a simple request
      // to the models endpoint to verify the API key is working
      const response = await this.makeRequest('/models', 'GET');
      
      if (response && response.data) {
        logger.info('Grok 3 API initialized successfully');
        this.initialized = true;
        return true;
      } else {
        logger.error('Failed to initialize Grok 3 API');
        return false;
      }
    } catch (error) {
      logger.error(`Grok 3 initialization error: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Analyze market data to identify patterns and opportunities
   * 
   * @param {Object} marketData - Market data with price, volume, etc.
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeMarket(marketData, options = {}) {
    const transaction = startAppTransaction('grok3-analyze-market', 'api.analysis');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const defaultOptions = {
        timeframe: '1h',
        lookback: 100,
        indicators: ['rsi', 'macd', 'bollinger'],
        patternDetection: true,
        sentimentAnalysis: true
      };
      
      const analysisOptions = { ...defaultOptions, ...options };
      
      // Use chat completions API with specialized system prompt
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.analysis.id,
        messages: [
          {
            role: 'system',
            content: this.models.analysis.systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this market data: ${JSON.stringify(marketData)}\nOptions: ${JSON.stringify(analysisOptions)}`
          }
        ],
        temperature: 0.3
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info(`Grok 3 market analysis completed for ${marketData.symbol || 'unknown'}`);
        
        // Parse the response content as JSON if possible
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsedData = JSON.parse(jsonMatch[1]);
            return {
              success: true,
              analysis: parsedData
            };
          }
          
          // Fallback to returning the raw content
          return {
            success: true,
            analysis: {
              raw: content
            }
          };
        } catch (parseError) {
          logger.warn(`Failed to parse JSON from analysis response: ${parseError.message}`);
          return {
            success: true,
            analysis: {
              raw: response.choices[0].message.content
            }
          };
        }
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 market analysis failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 market analysis error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Predict trade outcome with confidence score
   * 
   * @param {Object} marketData - Market data with price, volume, etc.
   * @param {Object} strategy - Trading strategy parameters
   * @returns {Promise<Object>} - Trade prediction with confidence score
   */
  async predictTrade(marketData, strategy = {}) {
    const transaction = startAppTransaction('grok3-predict-trade', 'api.prediction');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const defaultStrategy = {
        type: 'combined', // arbitrage, momentum, statistical, combined
        timeframe: '1h',
        riskLevel: 'medium', // low, medium, high
        targetProfit: 3.0, // percentage
        stopLoss: 1.5, // percentage
        winRateTarget: this.winRateTarget
      };
      
      const tradingStrategy = { ...defaultStrategy, ...strategy };
      
      // Use chat completions API with specialized system prompt
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.prediction.id,
        messages: [
          {
            role: 'system',
            content: this.models.prediction.systemPrompt.replace('65%', `${this.winRateTarget}%`)
          },
          {
            role: 'user',
            content: `Predict trade outcome for: ${JSON.stringify(marketData)}\nStrategy: ${JSON.stringify(tradingStrategy)}`
          }
        ],
        temperature: 0.2
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info(`Grok 3 trade prediction completed for ${marketData.symbol || 'unknown'}`);
        
        // Parse the response content as JSON if possible
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsedData = JSON.parse(jsonMatch[1]);
            return {
              success: true,
              prediction: parsedData
            };
          }
          
          // Fallback to returning the raw content
          return {
            success: true,
            prediction: {
              raw: content
            }
          };
        } catch (parseError) {
          logger.warn(`Failed to parse JSON from prediction response: ${parseError.message}`);
          return {
            success: true,
            prediction: {
              raw: response.choices[0].message.content
            }
          };
        }
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 trade prediction failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 trade prediction error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Execute a trade with optimized parameters
   * 
   * @param {Object} tradeParameters - Trade parameters
   * @returns {Promise<Object>} - Trade execution result
   */
  async executeTrade(tradeParameters) {
    const transaction = startAppTransaction('grok3-execute-trade', 'api.trade');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate trade parameters
      if (!tradeParameters || !tradeParameters.symbol) {
        throw new Error('Invalid trade parameters');
      }
      
      // Use chat completions API with specialized system prompt
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.execution.id,
        messages: [
          {
            role: 'system',
            content: this.models.execution.systemPrompt
          },
          {
            role: 'user',
            content: `Optimize these trade parameters: ${JSON.stringify(tradeParameters)}`
          }
        ],
        temperature: 0.2
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info(`Grok 3 trade execution completed for ${tradeParameters.symbol}`);
        
        // Parse the response content as JSON if possible
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsedData = JSON.parse(jsonMatch[1]);
            return {
              success: true,
              execution: parsedData
            };
          }
          
          // Fallback to returning the raw content
          return {
            success: true,
            execution: {
              raw: content
            }
          };
        } catch (parseError) {
          logger.warn(`Failed to parse JSON from execution response: ${parseError.message}`);
          return {
            success: true,
            execution: {
              raw: response.choices[0].message.content
            }
          };
        }
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 trade execution failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 trade execution error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Generate optimal trade parameters based on market data and prediction
   * 
   * @param {Object} marketData - Market data
   * @param {Object} prediction - Trade prediction
   * @returns {Promise<Object>} - Optimized trade parameters
   */
  async generateTradeParameters(marketData, prediction) {
    const transaction = startAppTransaction('grok3-generate-parameters', 'api.parameters');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Use chat completions API with specialized system prompt
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.execution.id,
        messages: [
          {
            role: 'system',
            content: this.models.execution.systemPrompt
          },
          {
            role: 'user',
            content: `Generate optimal trade parameters based on this market data: ${JSON.stringify(marketData)}\nAnd this prediction: ${JSON.stringify(prediction)}`
          }
        ],
        temperature: 0.2
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info(`Grok 3 parameter generation completed for ${marketData.symbol || 'unknown'}`);
        
        // Parse the response content as JSON if possible
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsedData = JSON.parse(jsonMatch[1]);
            return {
              success: true,
              parameters: parsedData
            };
          }
          
          // Fallback to returning the raw content
          return {
            success: true,
            parameters: {
              raw: content
            }
          };
        } catch (parseError) {
          logger.warn(`Failed to parse JSON from parameter generation response: ${parseError.message}`);
          return {
            success: true,
            parameters: {
              raw: response.choices[0].message.content
            }
          };
        }
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 parameter generation failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 parameter generation error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Process natural language trading instructions
   * 
   * @param {string} instruction - Natural language instruction
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Processed instruction result
   */
  async processNaturalLanguageInstruction(instruction, context = {}) {
    const transaction = startAppTransaction('grok3-process-instruction', 'api.nlp');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.chat.id,
        messages: [
          {
            role: 'system',
            content: this.models.chat.systemPrompt
          },
          {
            role: 'user',
            content: instruction
          }
        ],
        temperature: 0.7
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info('Grok 3 natural language processing completed');
        
        // Try to extract actions from the response
        const content = response.choices[0].message.content;
        let actions = [];
        
        try {
          const actionsMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/ACTIONS:[\s\S]*?({[\s\S]*})/);
          if (actionsMatch && actionsMatch[1]) {
            const parsedActions = JSON.parse(actionsMatch[1]);
            if (Array.isArray(parsedActions)) {
              actions = parsedActions;
            } else if (parsedActions.actions && Array.isArray(parsedActions.actions)) {
              actions = parsedActions.actions;
            }
          }
        } catch (parseError) {
          logger.warn(`Failed to parse actions from NLP response: ${parseError.message}`);
        }
        
        return {
          success: true,
          message: content,
          actions: actions
        };
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 natural language processing failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 natural language processing error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Analyze historical performance to improve win rate
   * 
   * @param {Array} tradeHistory - Historical trade data
   * @returns {Promise<Object>} - Performance analysis and recommendations
   */
  async analyzePerformance(tradeHistory) {
    const transaction = startAppTransaction('grok3-analyze-performance', 'api.performance');
    
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Use chat completions API with specialized system prompt
      const response = await this.makeRequest('/chat/completions', 'POST', {
        model: this.models.analysis.id,
        messages: [
          {
            role: 'system',
            content: `You are a trading performance analyst. Analyze trade history to identify patterns, strengths, and weaknesses. Provide recommendations to improve win rate to at least ${this.winRateTarget}%. Your responses should be structured as JSON with fields: winRate, profitFactor, averageWin, averageLoss, patterns, strengths, weaknesses, recommendations.`
          },
          {
            role: 'user',
            content: `Analyze this trade history: ${JSON.stringify(tradeHistory)}\nTarget win rate: ${this.winRateTarget}%`
          }
        ],
        temperature: 0.3
      });
      
      if (response && response.choices && response.choices.length > 0) {
        logger.info('Grok 3 performance analysis completed');
        
        // Parse the response content as JSON if possible
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
          
          if (jsonMatch && jsonMatch[1]) {
            const parsedData = JSON.parse(jsonMatch[1]);
            return {
              success: true,
              analysis: parsedData
            };
          }
          
          // Fallback to returning the raw content
          return {
            success: true,
            analysis: {
              raw: content
            }
          };
        } catch (parseError) {
          logger.warn(`Failed to parse JSON from performance analysis response: ${parseError.message}`);
          return {
            success: true,
            analysis: {
              raw: response.choices[0].message.content
            }
          };
        }
      } else {
        const errorMessage = response?.error || 'Unknown error';
        logger.error(`Grok 3 performance analysis failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error(`Grok 3 performance analysis error: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Make a request to the Grok 3 API
   * 
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @returns {Promise<Object>} - API response
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 5;
        logger.warn(`Rate limited by Grok API. Retrying after ${retryAfter} seconds.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(endpoint, method, data); // Retry
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok 3 API error (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`Grok 3 API request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set the target win rate for trading
   * 
   * @param {number} percentage - Target win rate percentage
   */
  setWinRateTarget(percentage) {
    if (percentage >= 0 && percentage <= 100) {
      this.winRateTarget = percentage;
      logger.info(`Win rate target set to ${percentage}%`);
    } else {
      logger.error(`Invalid win rate target: ${percentage}`);
    }
  }

  /**
   * Get the current win rate target
   * 
   * @returns {number} - Target win rate percentage
   */
  getWinRateTarget() {
    return this.winRateTarget;
  }
}

// Create singleton instance
const grok3TradingService = new Grok3TradingService();

export default grok3TradingService;
