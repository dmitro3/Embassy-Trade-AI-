/**
 * BotTester.js - Automated testing framework for trading bots
 * 
 * This module provides comprehensive testing capabilities for trading bots,
 * including stress testing, AI evaluation, and performance metrics.
 * 
 * Features:
 * - Continuous stress testing with alternating AI models (Grok/ChatGPT)
 * - Real Devnet trades with minimal SOL (0.01 SOL per trade)
 * - Win rate tracking and performance analytics
 * - AI-powered feedback and recommendations
 */

import axios from 'axios';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { GROK_API_KEY, OPENAI_API_KEY, SOLANA_RPC_URL } from './apiKeys.js';
import SwapService from './SwapService.js';
import logger from './logger.js';

class BotTester {
  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL);
    this.swapService = new SwapService();
    this.testResults = {
      swaps: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      successRate: 0,
      avgLatency: 0,
      latencyDistribution: [],
      errorTypes: {},
      stabilityScore: 0,
      testTimestamp: null,
      marketConditions: null,
      networkState: null,
      aiModel: null,
      aiEvaluation: null,
    };
    this.listeners = [];
    this.isRunning = false;
    this.debugMode = false;
  }

  /**
   * Add a listener for real-time updates
   * @param {Function} callback - Function to call with updates
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove a listener
   * @param {Function} callback - Function to remove
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners of updates
   * @param {Object} update - Update data
   */
  notifyListeners(update) {
    this.listeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  }

  /**
   * Log a message to the console and notify listeners
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   */
  async logMessage(level, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    // Log to the backend
    try {
      await axios.post('http://localhost:5000/logs', logEntry);
    } catch (error) {
      console.error('Failed to log to backend:', error.message);
    }
    
    // Notify listeners
    this.notifyListeners({
      type: 'log',
      data: logEntry,
    });
    
    return logEntry;
  }

  /**
   * Reset test results
   */
  resetResults() {
    this.testResults = {
      swaps: 0,
      successes: 0,
      failures: 0,
      totalLatency: 0,
      successRate: 0,
      avgLatency: 0,
      latencyDistribution: [],
      errorTypes: {},
      stabilityScore: 0,
      testTimestamp: new Date().toISOString(),
      marketConditions: null,
      networkState: null,
      aiModel: null,
      aiEvaluation: null,
    };
    
    this.notifyListeners({
      type: 'resultsReset',
      data: this.testResults,
    });
  }

  /**
   * Toggle debug mode
   * @param {boolean} enabled - Whether debug mode should be enabled
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    this.logMessage('info', `Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Prepare a test environment with specific network conditions
   * @param {string} networkCondition - Network condition to simulate
   * @returns {Object} Test environment configuration
   */
  prepareTestEnvironment(networkCondition = 'normal') {
    let slippage, timeout, retries;
    
    switch (networkCondition.toLowerCase()) {
      case 'high latency':
        slippage = 50; // 0.5%
        timeout = 60000;
        retries = 3;
        break;
      case 'congested':
        slippage = 100; // 1%
        timeout = 30000;
        retries = 5;
        break;
      case 'normal':
      default:
        slippage = 25; // 0.25%
        timeout = 15000;
        retries = 2;
    }
    
    return { slippage, timeout, retries };
  }

  /**
   * Simulate a trade under specific conditions
   * @param {string} marketScenario - Market scenario to simulate
   * @param {Object} envConfig - Test environment configuration
   * @returns {Promise<Object>} Trade result
   */
  async simulateTrade(marketScenario, envConfig) {
    const startTime = Date.now();
    
    try {
      await this.logMessage('info', `Simulating trade under ${marketScenario} market conditions`);
      
      // Determine price movement based on market scenario
      let priceMovement, volatility;
      switch (marketScenario.toLowerCase()) {
        case 'bullish':
          priceMovement = 0.05; // 5% up
          volatility = 0.02; // 2% variance
          break;
        case 'bearish':
          priceMovement = -0.05; // 5% down
          volatility = 0.02; // 2% variance
          break;
        case 'volatile':
          priceMovement = 0; // neutral
          volatility = 0.1; // 10% variance
          break;
        case 'flash crash':
          priceMovement = -0.2; // 20% down
          volatility = 0.05; // 5% variance
          break;
        case 'pump and dump':
          priceMovement = Math.random() > 0.5 ? 0.15 : -0.15; // 15% up or down
          volatility = 0.08; // 8% variance
          break;
        default:
          priceMovement = 0.01; // 1% up
          volatility = 0.01; // 1% variance
      }
      
      // Introduce artificial delay based on the environment config
      const simulatedLatency = Math.random() * envConfig.timeout / 3;
      await new Promise(resolve => setTimeout(resolve, simulatedLatency));
      
      // Simulate trade success or failure
      const successRate = this.calculateSuccessRate(marketScenario, envConfig);
      const isSuccess = Math.random() < successRate;
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (isSuccess) {
        await this.logMessage('info', `Trade successful (${latency}ms)`);
        return {
          success: true,
          latency,
          priceImpact: (priceMovement + (Math.random() * volatility * 2 - volatility)).toFixed(4),
        };
      } else {
        const errorTypes = ['slippage', 'timeout', 'insufficient liquidity', 'RPC error'];
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        
        await this.logMessage('error', `Trade failed: ${errorType} (${latency}ms)`);
        return {
          success: false,
          latency,
          error: errorType,
        };
      }
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      await this.logMessage('error', `Simulation error: ${error.message}`);
      return {
        success: false,
        latency,
        error: error.message,
      };
    }
  }

  /**
   * Calculate expected success rate based on market conditions and environment
   * @param {string} marketScenario - Market scenario
   * @param {Object} envConfig - Environment configuration
   * @returns {number} Expected success rate (0-1)
   */
  calculateSuccessRate(marketScenario, envConfig) {
    // Base success rates by market scenario
    const baseRates = {
      'bullish': 0.85,
      'bearish': 0.75,
      'volatile': 0.65,
      'flash crash': 0.55,
      'pump and dump': 0.60,
      'default': 0.80,
    };
    
    // Environmental modifiers
    const envModifiers = {
      'high latency': -0.10,
      'congested': -0.15,
      'normal': 0,
    };
    
    const baseRate = baseRates[marketScenario.toLowerCase()] || baseRates.default;
    const envModifier = envModifiers[envConfig.networkCondition] || 0;
    
    // Calculate final success rate, ensuring it's between 0.5 and 0.95
    return Math.max(0.5, Math.min(0.95, baseRate + envModifier));
  }

  /**
   * Execute a real trade on Devnet with a small amount of SOL
   * @param {Object} envConfig - Environment configuration
   * @returns {Promise<Object>} Trade result
   */
  async executeRealTrade(envConfig) {
    const startTime = Date.now();
    
    try {
      await this.logMessage('info', 'Executing real trade on Devnet (0.01 SOL)');
      
      // Here you would integrate with your actual trading logic
      // Using a minimal amount of SOL (0.01) for testing purposes
      
      // Simulate success for now (replace with actual trading logic)
      const tradingResult = await this.swapService.executeTradeWithAmount(0.01);
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (tradingResult.success) {
        await this.logMessage('info', `Real trade successful: ${tradingResult.txId} (${latency}ms)`);
        return {
          success: true,
          txId: tradingResult.txId,
          latency,
        };
      } else {
        await this.logMessage('error', `Real trade failed: ${tradingResult.error} (${latency}ms)`);
        return {
          success: false,
          error: tradingResult.error,
          latency,
        };
      }
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      await this.logMessage('error', `Real trade error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        latency,
      };
    }
  }

  /**
   * Run a series of stability tests under specific conditions
   * @param {number} numTrades - Number of trades to simulate
   * @param {string} networkCondition - Network condition to simulate
   * @param {string} marketScenario - Market scenario to simulate
   * @param {boolean} useRealTrades - Whether to execute real trades on Devnet
   * @returns {Promise<Object>} Test results
   */
  async runStabilityTests(numTrades, networkCondition = 'normal', marketScenario = 'bullish', useRealTrades = false) {
    if (this.isRunning) {
      await this.logMessage('warn', 'Tests already running');
      return;
    }
    
    this.isRunning = true;
    
    try {
      await this.logMessage('info', `Starting ${useRealTrades ? 'real' : 'simulated'} stability tests: ${numTrades} trades, ${networkCondition} network, ${marketScenario} market`);
      
      const envConfig = this.prepareTestEnvironment(networkCondition);
      envConfig.networkCondition = networkCondition;
      
      this.testResults.marketConditions = marketScenario;
      this.testResults.networkState = networkCondition;
      
      for (let i = 0; i < numTrades && this.isRunning; i++) {
        await this.logMessage('info', `Executing trade ${i + 1}/${numTrades}`);
        
        const result = useRealTrades 
          ? await this.executeRealTrade(envConfig)
          : await this.simulateTrade(marketScenario, envConfig);
        
        // Update test results
        this.testResults.swaps++;
        
        if (result.success) {
          this.testResults.successes++;
        } else {
          this.testResults.failures++;
          
          // Track error types
          const errorType = result.error || 'unknown';
          this.testResults.errorTypes[errorType] = (this.testResults.errorTypes[errorType] || 0) + 1;
        }
        
        this.testResults.totalLatency += result.latency;
        this.testResults.latencyDistribution.push(result.latency);
        
        // Calculate current success rate and average latency
        this.testResults.successRate = (this.testResults.successes / this.testResults.swaps * 100).toFixed(2);
        this.testResults.avgLatency = (this.testResults.totalLatency / this.testResults.swaps).toFixed(2);
        
        // Calculate stability score (0-100)
        // Formula: 70% weight on success rate, 30% weight on normalized latency
        const normalizedLatency = Math.min(100, Math.max(0, 100 - (this.testResults.avgLatency / 100)));
        this.testResults.stabilityScore = Math.round((parseFloat(this.testResults.successRate) * 0.7) + (normalizedLatency * 0.3));
        
        // Notify listeners of progress
        this.notifyListeners({
          type: 'testProgress',
          data: {
            current: i + 1,
            total: numTrades,
            result,
            testResults: { ...this.testResults },
          },
        });
        
        // Add a small delay between trades to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await this.logMessage('info', `Testing complete. Success rate: ${this.testResults.successRate}%, Avg latency: ${this.testResults.avgLatency}ms`);
      
      this.notifyListeners({
        type: 'testComplete',
        data: { ...this.testResults },
      });
      
      return { ...this.testResults };
    } catch (error) {
      await this.logMessage('error', `Test suite error: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop ongoing tests
   */
  stopTests() {
    if (this.isRunning) {
      this.isRunning = false;
      this.logMessage('info', 'Stopping tests...');
      
      this.notifyListeners({
        type: 'testStopped',
        data: { ...this.testResults },
      });
    }
  }

  /**
   * Evaluate test results using AI (ChatGPT or Grok)
   * @param {Object} metrics - Test metrics to evaluate
   * @param {string} aiModel - AI model to use (gpt-4, gpt-3.5-turbo, or Grok)
   * @param {number} retries - Number of retry attempts (default: 3)
   * @param {number} backoff - Initial backoff time in ms (default: 1000)
   * @returns {Promise<Object>} AI evaluation results
   */
  async evaluateWithAI(metrics, aiModel = 'gpt-4', retries = 3, backoff = 1000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.logMessage('info', `Evaluating test results with ${aiModel} (attempt ${attempt}/${retries})`);
        
        const response = await axios.post('http://localhost:5000/ai-test', {
          metrics,
          model: aiModel
        });
        
        this.testResults.aiModel = aiModel;
        this.testResults.aiEvaluation = response.data.feedback;
        
        await this.logMessage('info', `AI evaluation received from ${aiModel}`);
        
        if (this.debugMode) {
          await this.logMessage('debug', `Raw AI response: ${JSON.stringify(response.data.rawResponse)}`);
        }
        
        this.notifyListeners({
          type: 'aiEvaluation',
          data: {
            model: aiModel,
            evaluation: response.data.feedback,
            rawResponse: response.data.rawResponse
          },
        });
        
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response ? error.response.status : null;
        
        // For rate limit errors (429) or server errors (5xx), retry with backoff
        const shouldRetry = (status === 429 || (status >= 500 && status < 600)) && attempt < retries;
        
        if (shouldRetry) {
          const waitTime = backoff * Math.pow(2, attempt - 1);
          await this.logMessage('warn', `AI evaluation request failed (status ${status}), retrying in ${waitTime}ms (attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt < retries) {
          const waitTime = backoff * Math.pow(2, attempt - 1);
          await this.logMessage('warn', `AI evaluation request failed: ${error.message}, retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          await this.logMessage('error', `AI evaluation failed after ${retries} attempts: ${error.message}`);
          
          if (error.response && error.response.data) {
            await this.logMessage('error', `Response details: ${JSON.stringify(error.response.data)}`);
          }
          
          throw error;
        }
      }
    }
    
    // If we've exhausted all retries and still have an error
    throw lastError;
  }

  /**
   * Run a full suite of tests and evaluate results
   * @param {number} numTrades - Number of trades to simulate
   * @param {string} marketScenario - Market scenario to simulate
   * @param {string} networkCondition - Network condition to simulate
   * @param {string} aiModel - AI model to use for evaluation
   * @returns {Promise<Object>} Test results with AI evaluation
   */
  async runAllTests(numTrades = 10, marketScenario = 'bullish', networkCondition = 'normal', aiModel = 'gpt-4') {
    await this.logMessage('info', `Starting AI tests: ${numTrades} trades, ${marketScenario} market, ${networkCondition} network, using ${aiModel}`);
    
    try {
      this.resetResults();
      
      await this.runStabilityTests(numTrades, networkCondition, marketScenario, false);
      
      const successRate = this.testResults.successRate;
      const avgLatency = this.testResults.avgLatency;
      
      const result = await this.evaluateWithAI({
        successRate,
        avgLatency,
        marketScenario,
        networkCondition,
        errorTypes: this.testResults.errorTypes,
        stabilityScore: this.testResults.stabilityScore,
      }, aiModel);
      
      return result;
    } catch (error) {
      await this.logMessage('error', `AI testing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run continuous stress testing with alternating AI models
   * @param {number} numTradesPerCycle - Number of trades per test cycle
   * @param {number} cycles - Number of test cycles to run
   * @param {string} networkCondition - Network condition to simulate
   * @param {string} marketScenario - Market scenario to simulate
   * @param {boolean} useRealTrades - Whether to execute real trades on Devnet
   * @returns {Promise<Object>} Combined test results
   */
  async runContinuousTests(numTradesPerCycle = 10, cycles = 5, networkCondition = 'normal', marketScenario = 'bullish', useRealTrades = false) {
    await this.logMessage('info', `Starting continuous stress testing: ${cycles} cycles, ${numTradesPerCycle} trades per cycle, ${useRealTrades ? 'real trades' : 'simulated'}`);
    
    if (this.isRunning) {
      await this.logMessage('warn', 'Tests already running');
      return;
    }
    
    this.isRunning = true;
    this.continuousTestResults = [];
    
    try {
      // Alternate between models for each cycle
      let currentModel = 'Grok';
      
      for (let cycle = 0; cycle < cycles && this.isRunning; cycle++) {
        await this.logMessage('info', `Cycle ${cycle + 1}/${cycles} with ${currentModel}`);
        
        this.resetResults();
        
        // Run a batch of trades
        await this.runStabilityTests(numTradesPerCycle, networkCondition, marketScenario, useRealTrades);
        
        // Evaluate with the current AI model
        const result = await this.evaluateWithAI({
          successRate: this.testResults.successRate,
          avgLatency: this.testResults.avgLatency,
          marketScenario,
          networkCondition,
          cycle: cycle + 1,
          totalCycles: cycles,
          errorTypes: this.testResults.errorTypes,
          stabilityScore: this.testResults.stabilityScore,
        }, currentModel);
        
        // Store results for this cycle
        this.continuousTestResults.push({
          cycle: cycle + 1,
          aiModel: currentModel,
          testResults: { ...this.testResults },
          aiEvaluation: result.feedback,
        });
        
        // Notify listeners about cycle completion
        this.notifyListeners({
          type: 'testCycleComplete',
          data: {
            cycle: cycle + 1,
            totalCycles: cycles,
            aiModel: currentModel,
            testResults: { ...this.testResults },
            aiEvaluation: result.feedback,
          },
        });
        
        await this.logMessage('info', `Cycle ${cycle + 1} completed: Win Rate: ${this.testResults.successRate}%`);
        
        // Switch AI model for next cycle
        currentModel = currentModel === 'Grok' ? 'gpt-4' : 'Grok';
        
        // Delay between cycles (1 minute)
        if (cycle < cycles - 1 && this.isRunning) {
          await this.logMessage('info', 'Waiting 1 minute before next cycle...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
      
      await this.logMessage('info', 'Continuous stress testing completed');
      
      // Compute aggregated results
      const aggregatedResults = this.computeAggregatedResults();
      
      this.notifyListeners({
        type: 'continuousTestingComplete',
        data: {
          cycles: this.continuousTestResults,
          aggregated: aggregatedResults,
        },
      });
      
      return {
        cycles: this.continuousTestResults,
        aggregated: aggregatedResults,
      };
    } catch (error) {
      await this.logMessage('error', `Continuous testing error: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Compute aggregated results from continuous testing cycles
   * @returns {Object} Aggregated results
   */
  computeAggregatedResults() {
    if (!this.continuousTestResults || this.continuousTestResults.length === 0) {
      return null;
    }
    
    const grokResults = this.continuousTestResults.filter(result => result.aiModel === 'Grok');
    const gptResults = this.continuousTestResults.filter(result => result.aiModel === 'gpt-4');
    
    const calculateAvg = (results, field) => {
      if (!results.length) return 0;
      const sum = results.reduce((acc, result) => acc + parseFloat(result.testResults[field]), 0);
      return (sum / results.length).toFixed(2);
    };
    
    return {
      totalCycles: this.continuousTestResults.length,
      grokCycles: grokResults.length,
      gptCycles: gptResults.length,
      overallSuccessRate: calculateAvg(this.continuousTestResults, 'successRate'),
      overallLatency: calculateAvg(this.continuousTestResults, 'avgLatency'),
      overallStability: calculateAvg(this.continuousTestResults, 'stabilityScore'),
      grokSuccessRate: calculateAvg(grokResults, 'successRate'),
      gptSuccessRate: calculateAvg(gptResults, 'successRate'),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate a detailed report of test results
   * @returns {Object} Detailed test report
   */
  generateTestReport() {
    const report = {
      title: 'Trading Bot Performance Report',
      timestamp: new Date().toISOString(),
      summary: {
        successRate: this.testResults.successRate,
        avgLatency: this.testResults.avgLatency,
        stabilityScore: this.testResults.stabilityScore,
        totalSwaps: this.testResults.swaps,
        successfulSwaps: this.testResults.successes,
        failedSwaps: this.testResults.failures,
      },
      conditions: {
        marketScenario: this.testResults.marketConditions,
        networkState: this.testResults.networkState,
      },
      aiAnalysis: {
        model: this.testResults.aiModel,
        feedback: this.testResults.aiEvaluation,
      },
      errorAnalysis: {
        types: this.testResults.errorTypes,
      },
      latencyAnalysis: {
        distribution: this.testResults.latencyDistribution,
        min: Math.min(...this.testResults.latencyDistribution || [0]),
        max: Math.max(...this.testResults.latencyDistribution || [0]),
        median: this.calculateMedian(this.testResults.latencyDistribution || [0]),
      },
      continuousTesting: this.continuousTestResults 
        ? this.computeAggregatedResults() 
        : null,
    };
    
    return report;
  }

  /**
   * Calculate the median of an array of numbers
   * @param {Array<number>} values - Array of values
   * @returns {number} Median value
   */
  calculateMedian(values) {
    if (!values.length) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Export test results to JSON format
   * @returns {string} JSON string of test results
   */
  exportTestResults() {
    const report = this.generateTestReport();
    return JSON.stringify(report, null, 2);
  }
}

export default BotTester;