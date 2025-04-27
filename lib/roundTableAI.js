// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\roundTableAI.js
'use client';

import logger from './logger.js';
import marketDataAggregator from './marketDataAggregator.js';
import { technicalIndicators } from './indicators.js';
import { formatTimestamp } from './utils.js';

/**
 * RoundTable AI agent for collaborative trading decisions
 * 
 * Each agent specializes in a specific technical indicator or trading strategy
 */
class AIAgent {
  constructor(name, strategy, weight = 1.0) {
    this.name = name;
    this.strategy = strategy;
    this.weight = weight;
    this.lastSignal = null;
    this.confidence = 0;
    this.notes = [];
  }

  /**
   * Analyze market data and generate a trading signal
   * 
   * @param {Array} marketData - Historical market data
   * @param {Object} params - Additional parameters
   * @returns {Object} - Trading signal
   */
  async analyze(marketData, params = {}) {
    try {
      let result = { action: 'hold', confidence: 0.5 };
      
      // Run the appropriate strategy for this agent
      switch (this.strategy) {
        case 'movingAverageCrossover':
          result = await technicalIndicators.movingAverageCrossover(marketData, params);
          break;
        case 'rsiOscillator':
          result = await technicalIndicators.rsiIndicator(marketData, params);
          break;
        case 'macdStrategy':
          result = await technicalIndicators.macdIndicator(marketData, params);
          break;
        case 'bollingerBandReversion':
          result = await technicalIndicators.bollingerBands(marketData, params);
          break;
        default:
          logger.warn(`Unknown strategy: ${this.strategy}`);
          break;
      }
      
      this.lastSignal = result.action;
      this.confidence = result.confidence;
      this.notes = result.notes || [];
      
      return {
        agent: this.name,
        strategy: this.strategy,
        action: result.action,
        confidence: result.confidence,
        weight: this.weight,
        notes: this.notes,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Agent ${this.name} analysis error: ${error.message}`);
      return {
        agent: this.name,
        strategy: this.strategy,
        action: 'hold',
        confidence: 0,
        weight: this.weight,
        notes: [`Error: ${error.message}`],
        timestamp: new Date().toISOString()
      };
    }
  }
}

/**
 * RoundTable for collaborative AI trading decisions
 * 
 * Combines signals from multiple AI agents to reach a consensus
 */
class RoundTable {
  constructor() {
    // Create trading strategy agents
    this.agents = [
      new AIAgent('MovingAverage Agent', 'movingAverageCrossover', 1.0),
      new AIAgent('RSI Agent', 'rsiOscillator', 1.0),
      new AIAgent('MACD Agent', 'macdStrategy', 1.0),
      new AIAgent('Bollinger Agent', 'bollingerBandReversion', 1.0)
    ];
    
    this.consensusThreshold = 0.7;
    this.lastAnalysis = null;
  }

  /**
   * Set the consensus threshold
   * 
   * @param {number} threshold - The consensus threshold (0.0 - 1.0)
   */
  setConsensusThreshold(threshold) {
    this.consensusThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Analyze an asset with all AI agents
   * 
   * @param {string} asset - The asset symbol or address
   * @param {Object} params - Analysis parameters
   * @returns {Promise<Object>} - Consensus analysis result
   */
  async analyzeAsset(asset, params = {}) {
    try {
      logger.info(`RoundTable analyzing asset: ${asset}`);
      
      // Get market data for the asset
      const marketData = await marketDataAggregator.getHistoricalData(asset, {
        timeframe: params.timeframe || '1d',
        limit: params.limit || 100
      });
      
      if (!marketData || marketData.length < 20) {
        throw new Error('Insufficient market data for analysis');
      }
      
      // Get current price
      const priceData = await marketDataAggregator.getCurrentPrice(asset);
      const currentPrice = priceData.price;
      
      // Prepare analysis parameters
      const analysisParams = {
        ...params,
        riskLevel: params.riskLevel || 'medium'
      };
      
      // Run analysis with each agent
      const agentSignals = [];
      for (const agent of this.agents) {
        const result = await agent.analyze(marketData, analysisParams);
        agentSignals.push(result);
      }
      
      // Calculate consensus
      const buySignals = agentSignals.filter(s => s.action === 'buy');
      const sellSignals = agentSignals.filter(s => s.action === 'sell');
      const holdSignals = agentSignals.filter(s => s.action === 'hold');
      
      let totalWeight = this.agents.reduce((sum, agent) => sum + agent.weight, 0);
      let buyConfidence = buySignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      let sellConfidence = sellSignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      let holdConfidence = holdSignals.reduce((sum, s) => sum + (s.confidence * s.weight), 0) / totalWeight;
      
      // Determine consensus action
      let action = 'hold';
      let confidence = holdConfidence;
      
      if (buyConfidence > sellConfidence && buyConfidence > holdConfidence) {
        action = 'buy';
        confidence = buyConfidence;
      } else if (sellConfidence > buyConfidence && sellConfidence > holdConfidence) {
        action = 'sell';
        confidence = sellConfidence;
      }
      
      // Calculate stop loss and take profit based on risk level
      let stopLossPercentage = 0.02; // 2% default
      let takeProfitPercentage = 0.05; // 5% default
      
      switch (params.riskLevel) {
        case 'low':
          stopLossPercentage = 0.01; // 1%
          takeProfitPercentage = 0.03; // 3%
          break;
        case 'high':
          stopLossPercentage = 0.03; // 3%
          takeProfitPercentage = 0.08; // 8%
          break;
      }
      
      const stopLoss = action === 'buy' 
        ? currentPrice * (1 - stopLossPercentage)
        : action === 'sell' 
          ? currentPrice * (1 + stopLossPercentage)
          : null;
          
      const takeProfit = action === 'buy'
        ? currentPrice * (1 + takeProfitPercentage)
        : action === 'sell'
          ? currentPrice * (1 - takeProfitPercentage)
          : null;
      
      // Determine quantity based on available balance and risk level
      // This would normally come from the portfolio, using placeholder for now
      const availableBalance = params.availableBalance || 1000;
      const riskMultiplier = params.riskLevel === 'low' ? 0.05 : params.riskLevel === 'medium' ? 0.1 : 0.2;
      const quantity = availableBalance * riskMultiplier / currentPrice;
      
      // Prepare result
      const result = {
        asset,
        currentPrice,
        signal: action,
        confidence,
        hasConsensus: confidence >= this.consensusThreshold,
        agentSignals,
        stopLoss,
        takeProfit,
        riskReward: takeProfitPercentage / stopLossPercentage,
        quantity,
        timestamp: new Date().toISOString()
      };
      
      this.lastAnalysis = result;
      logger.info(`RoundTable analysis complete: ${action} ${asset} with ${(confidence*100).toFixed(2)}% confidence`);
      
      return result;
    } catch (error) {
      logger.error(`RoundTable analysis error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the last analysis result
   * 
   * @returns {Object} - Last analysis result or null
   */
  getLastAnalysis() {
    return this.lastAnalysis;
  }
}

// Create and export singleton instance
const roundTable = new RoundTable();
export default roundTable;
