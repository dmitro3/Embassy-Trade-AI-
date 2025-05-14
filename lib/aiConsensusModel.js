'use client';

/**
 * AI Consensus Model for TradeForce AI
 * 
 * This module implements a "roundtable" consensus model where multiple LLMs
 * analyze market data and come to a consensus about potential trades.
 * 
 * Each AI model specializes in a different aspect of trading:
 * - TechnicalTrader: Focuses on technical analysis patterns and indicators
 * - TokenDiscovery: Identifies promising new token launches
 * - MacroAnalyst: Analyzes macro trends and market sentiment
 * 
 * The consensus mechanism weighs each model's confidence and expertise
 * to reach a final trading decision.
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import logger from './logger';
import { getApiKey } from './apiKeys';

/**
 * AI Agent class representing a single AI model in the consensus
 */
class AIAgent {
  constructor(name, specialty, confidenceThreshold = 0.65) {
    this.name = name;
    this.specialty = specialty;
    this.confidenceThreshold = confidenceThreshold;
    this.apiKey = null;
    this.apiEndpoint = null;
    this.isInitialized = false;
    this.lastAnalysis = null;
    this.analysisHistory = [];
    this.successRate = 0;
    this.callCount = 0;
    this.pendingCalls = 0;
  }
  
  /**
   * Initialize the AI agent with required API keys
   */
  async initialize(serviceKey) {
    try {
      // Get API key from secure storage
      this.apiKey = await getApiKey(serviceKey, 'api_key');
      
      if (!this.apiKey) {
        logger.warn(`API key for ${this.name} not available`);
        return false;
      }
      
      this.isInitialized = true;
      logger.info(`${this.name} AI agent initialized`);
      return true;
    } catch (error) {
      logger.error(`Failed to initialize ${this.name} AI agent: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Analyze market data and generate trading signal
   */
  async analyze(data) {
    try {
      if (!this.isInitialized) {
        logger.warn(`Cannot analyze with uninitialized ${this.name} agent`);
        return null;
      }
      
      this.pendingCalls++;
      this.callCount++;
      
      // Implementation depends on the specific AI model
      // This is a placeholder that would be overridden in specialized agents
      const result = await this._performAnalysis(data);
      
      this.pendingCalls--;
      
      // Store analysis result
      this.lastAnalysis = {
        timestamp: Date.now(),
        result
      };
      
      // Keep a history of recent analyses
      this.analysisHistory.unshift(this.lastAnalysis);
      if (this.analysisHistory.length > 10) {
        this.analysisHistory.pop();
      }
      
      return result;
    } catch (error) {
      this.pendingCalls--;
      logger.error(`${this.name} analysis failed: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Internal method to perform analysis (to be implemented by specific agents)
   */
  async _performAnalysis(data) {
    // This is a placeholder that would be overridden in specialized agents
    throw new Error('_performAnalysis must be implemented by specialized agents');
  }
  
  /**
   * Calculate confidence adjustment based on historical success
   */
  getConfidenceAdjustment() {
    // Adjust confidence based on historical success rate
    // New agents start with neutral adjustment
    if (this.callCount < 10) return 0;
    
    // Calculate adjustment between -0.2 and +0.2
    return (this.successRate - 0.5) * 0.4;
  }
  
  /**
   * Update success rate after a trade is completed
   */
  updateSuccessRate(wasSuccessful) {
    // Simple moving average of success rate
    this.successRate = (this.successRate * this.callCount + (wasSuccessful ? 1 : 0)) / (this.callCount + 1);
    this.callCount++;
  }
  
  /**
   * Get status information for this agent
   */
  getStatus() {
    return {
      name: this.name,
      specialty: this.specialty,
      initialized: this.isInitialized,
      successRate: this.successRate,
      callCount: this.callCount,
      pendingCalls: this.pendingCalls,
      lastAnalysisTime: this.lastAnalysis ? this.lastAnalysis.timestamp : null
    };
  }
}

/**
 * TechnicalTrader AI agent that specializes in technical analysis
 */
class TechnicalTraderAgent extends AIAgent {
  constructor() {
    super('TechnicalTrader', 'technical_analysis', 0.7);
  }
  
  async initialize() {
    return super.initialize('openai');
  }
  
  async _performAnalysis(data) {
    // Extract relevant data for technical analysis
    const { priceData, technicalIndicators, tokenInfo } = data;
    
    // Determine which tokens to analyze
    const tokenAddresses = Object.keys(technicalIndicators || {});
    if (!tokenAddresses.length) {
      return null;
    }
    
    // Analyze each token with sufficient data
    const analysisResults = tokenAddresses.map(address => {
      try {
        const indicators = technicalIndicators[address];
        const price = priceData[address]?.price;
        const symbol = tokenInfo[address]?.symbol || address.substr(0, 6);
        
        if (!indicators || !price) {
          return null;
        }
        
        // Technical analysis logic
        let bullishSignals = 0;
        let bearishSignals = 0;
        
        // Check SMA trend
        if (price > indicators.sma20) bullishSignals++;
        else bearishSignals++;
        
        // Check EMA trend
        if (price > indicators.ema9) bullishSignals++;
        else bearishSignals++;
        
        // Check RSI
        if (indicators.rsi14 > 70) bearishSignals += 2; // Overbought
        else if (indicators.rsi14 < 30) bullishSignals += 2; // Oversold
        else if (indicators.rsi14 > 60) bullishSignals++;
        else if (indicators.rsi14 < 40) bearishSignals++;
        
        // Check MACD
        if (indicators.macd.histogram > 0 && indicators.macd.line > indicators.macd.signal) bullishSignals += 2;
        else if (indicators.macd.histogram < 0 && indicators.macd.line < indicators.macd.signal) bearishSignals += 2;
        
        // Calculate overall sentiment and confidence
        const totalSignals = bullishSignals + bearishSignals;
        const bullishPercentage = bullishSignals / totalSignals;
        const bearishPercentage = bearishSignals / totalSignals;
        
        const sentiment = bullishPercentage > bearishPercentage ? 'bullish' : 'bearish';
        const confidence = Math.max(bullishPercentage, bearishPercentage);
        
        return {
          token: address,
          symbol,
          action: sentiment === 'bullish' ? 'buy' : 'sell',
          confidence,
          indicators: {
            sma20: indicators.sma20,
            ema9: indicators.ema9,
            rsi14: indicators.rsi14,
            macd: indicators.macd
          },
          reason: `${sentiment.toUpperCase()} SIGNAL: ${bullishSignals}/${totalSignals} bullish indicators with ${(confidence * 100).toFixed(1)}% confidence`
        };
      } catch (error) {
        logger.error(`Error analyzing token ${address}: ${error.message}`);
        return null;
      }
    }).filter(result => result !== null);
    
    // Filter results by confidence threshold
    const filteredResults = analysisResults.filter(
      result => result.confidence >= this.confidenceThreshold
    );
    
    return {
      signals: filteredResults,
      timestamp: Date.now(),
      analyzed: analysisResults.length
    };
  }
}

/**
 * TokenDiscovery AI agent that specializes in finding promising new tokens
 */
class TokenDiscoveryAgent extends AIAgent {
  constructor() {
    super('TokenDiscovery', 'new_tokens', 0.6);
  }
  
  async initialize() {
    return super.initialize('deepseek');
  }
  
  async _performAnalysis(data) {
    // Extract relevant data for new token discovery
    const { newTokens, volumeData, priceData } = data;
    
    if (!newTokens || !newTokens.length) {
      return null;
    }
    
    // Analyze new tokens
    const analysisResults = newTokens.map(token => {
      try {
        const address = token.address;
        const volume = volumeData[address]?.transactions || 0;
        const price = priceData[address]?.price;
        const symbol = token.symbol || address.substr(0, 6);
        
        // Calculate a score based on available signals
        let score = 0;
        let reasons = [];
        
        // Volume analysis
        if (volume > 50) {
          score += 0.3;
          reasons.push(`High transaction volume (${volume})`);
        } else if (volume > 20) {
          score += 0.2;
          reasons.push(`Medium transaction volume (${volume})`);
        } else if (volume > 5) {
          score += 0.1;
          reasons.push(`Some transaction activity (${volume})`);
        }
        
        // Assess token metadata
        if (token.name && token.symbol) {
          score += 0.1;
          reasons.push('Has proper name and symbol');
        }
        
        // Check social info if available
        if (token.telegram || token.twitter || token.website) {
          score += 0.2;
          reasons.push('Has social/community presence');
        }
        
        // Recent launch is interesting
        const tokenAge = Date.now() - new Date(token.createdAt).getTime();
        if (tokenAge < 6 * 60 * 60 * 1000) { // 6 hours
          score += 0.2;
          reasons.push('Recently launched (<6 hours)');
        } else if (tokenAge < 24 * 60 * 60 * 1000) { // 24 hours
          score += 0.1;
          reasons.push('Launched within 24 hours');
        }
        
        return {
          token: address,
          symbol,
          action: score >= 0.6 ? 'buy' : 'monitor',
          confidence: score,
          metadata: {
            name: token.name,
            symbol: token.symbol,
            age: tokenAge
          },
          reason: reasons.join(', ')
        };
      } catch (error) {
        logger.error(`Error analyzing new token ${token.address}: ${error.message}`);
        return null;
      }
    }).filter(result => result !== null);
    
    // Filter results by confidence threshold and only return 'buy' actions
    const filteredResults = analysisResults
      .filter(result => result.confidence >= this.confidenceThreshold && result.action === 'buy');
    
    return {
      signals: filteredResults,
      timestamp: Date.now(),
      analyzed: analysisResults.length
    };
  }
}

/**
 * MacroAnalyst AI agent that specializes in market sentiment and macro trends
 */
class MacroAnalystAgent extends AIAgent {
  constructor() {
    super('MacroAnalyst', 'market_sentiment', 0.65);
  }
  
  async initialize() {
    return super.initialize('grok');
  }
  
  async _performAnalysis(data) {
    // For a real implementation, this would analyze market-wide data
    // including social sentiment, news, and overall market movements
    
    // This is a placeholder implementation
    const marketData = {
      sentiment: Math.random() > 0.5 ? 'bullish' : 'bearish',
      marketCondition: Math.random() > 0.7 ? 'volatile' : 'stable',
      recommendedAssets: ['SOL', 'BTC', 'ETH']
    };
    
    // Calculate a confidence based on simulated analysis
    const confidence = 0.6 + (Math.random() * 0.3);
    
    return {
      marketSentiment: marketData.sentiment,
      marketCondition: marketData.marketCondition,
      confidence,
      recommendedAssets: marketData.recommendedAssets,
      timestamp: Date.now()
    };
  }
}

/**
 * AI Consensus Model that combines insights from multiple AI agents
 */
class AIConsensusModel {
  constructor() {
    // Create AI agents
    this.agents = {
      technicalTrader: new TechnicalTraderAgent(),
      tokenDiscovery: new TokenDiscoveryAgent(),
      macroAnalyst: new MacroAnalystAgent()
    };
    
    this.isInitialized = false;
    this.consensusResults = [];
    this.lastConsensusTime = null;
    this.weightings = {
      technicalTrader: 0.5,
      tokenDiscovery: 0.3,
      macroAnalyst: 0.2
    };
  }
  
  /**
   * Initialize all AI agents
   */
  async initialize() {
    try {
      logger.info('Initializing AI Consensus Model');
      
      // Initialize all agents
      const initPromises = Object.values(this.agents).map(agent => agent.initialize());
      const results = await Promise.allSettled(initPromises);
      
      // Check if at least one agent initialized successfully
      const success = results.some(result => result.status === 'fulfilled' && result.value === true);
      
      if (success) {
        this.isInitialized = true;
        logger.info('AI Consensus Model initialized successfully');
      } else {
        logger.error('Failed to initialize any AI agents');
      }
      
      return success;
    } catch (error) {
      logger.error(`Failed to initialize AI Consensus Model: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get consensus from all AI agents
   */
  async getConsensus(marketData) {
    try {
      if (!this.isInitialized) {
        logger.warn('Cannot get consensus from uninitialized AI model');
        return null;
      }
      
      // Collect analyses from all available agents
      const analyses = {};
      
      for (const [agentName, agent] of Object.entries(this.agents)) {
        if (agent.isInitialized) {
          analyses[agentName] = await agent.analyze(marketData);
        }
      }
      
      // If no analyses were produced, return null
      const hasAnalyses = Object.values(analyses).some(analysis => analysis !== null);
      if (!hasAnalyses) {
        logger.warn('No AI agent produced an analysis');
        return null;
      }
      
      // Process technical trader signals
      const technicalSignals = analyses.technicalTrader?.signals || [];
      
      // Process token discovery signals
      const discoverySignals = analyses.tokenDiscovery?.signals || [];
      
      // Process macro analyst sentiment
      const macroSentiment = analyses.macroAnalyst?.marketSentiment || 'neutral';
      const macroConfidence = analyses.macroAnalyst?.confidence || 0.5;
      
      // Combined token signals from both technical and discovery
      const allTokenSignals = [...technicalSignals, ...discoverySignals];
      
      // Adjust confidence based on macro sentiment
      const adjustedSignals = allTokenSignals.map(signal => {
        // If macro sentiment aligns with signal action, boost confidence
        const macroAligned = 
          (macroSentiment === 'bullish' && signal.action === 'buy') || 
          (macroSentiment === 'bearish' && signal.action === 'sell');
        
        const macroAdjustment = macroAligned ? 
          macroConfidence * this.weightings.macroAnalyst : 
          -macroConfidence * this.weightings.macroAnalyst;
        
        // Adjust confidence (but cap at 0.95)
        const adjustedConfidence = Math.min(0.95, signal.confidence + macroAdjustment);
        
        return {
          ...signal,
          originalConfidence: signal.confidence,
          confidence: adjustedConfidence,
          adjustments: {
            macro: macroAdjustment
          }
        };
      });
      
      // Sort by adjusted confidence
      const sortedSignals = adjustedSignals.sort((a, b) => b.confidence - a.confidence);
      
      // Filter by consensus threshold of 0.7
      const consensusSignals = sortedSignals.filter(signal => signal.confidence >= 0.7);
      
      // Create consensus result
      const consensusResult = {
        signals: consensusSignals,
        marketSentiment: macroSentiment,
        marketCondition: analyses.macroAnalyst?.marketCondition || 'unknown',
        timestamp: Date.now(),
        agentsConsulted: Object.keys(analyses).filter(key => analyses[key] !== null)
      };
      
      // Store consensus
      this.consensusResults.unshift(consensusResult);
      if (this.consensusResults.length > 10) {
        this.consensusResults.pop();
      }
      
      this.lastConsensusTime = Date.now();
      
      return consensusResult;
    } catch (error) {
      logger.error(`Failed to get AI consensus: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get status of all AI agents
   */
  getAgentStatus() {
    const status = {};
    
    for (const [name, agent] of Object.entries(this.agents)) {
      status[name] = agent.getStatus();
    }
    
    return status;
  }
  
  /**
   * Update agent success rates after trade results
   */
  updateAgentSuccessRates(tradeResult) {
    const { agentsConsulted, wasSuccessful } = tradeResult;
    
    if (agentsConsulted && Array.isArray(agentsConsulted)) {
      agentsConsulted.forEach(agentName => {
        if (this.agents[agentName]) {
          this.agents[agentName].updateSuccessRate(wasSuccessful);
        }
      });
    }
  }
}

// Create a singleton instance
const aiConsensusModel = new AIConsensusModel();

/**
 * Hook to use the AI Consensus model in React components
 */
export function useAIConsensus() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastConsensus, setLastConsensus] = useState(null);
  const [agentStatus, setAgentStatus] = useState({});
  
  useEffect(() => {
    const initializeAIConsensus = async () => {
      const success = await aiConsensusModel.initialize();
      setIsInitialized(success);
      
      // Get initial agent status
      setAgentStatus(aiConsensusModel.getAgentStatus());
    };
    
    initializeAIConsensus();
  }, []);
  
  /**
   * Get consensus for market data
   */
  const getConsensus = async (marketData) => {
    setIsAnalyzing(true);
    
    try {
      const consensus = await aiConsensusModel.getConsensus(marketData);
      setLastConsensus(consensus);
      setAgentStatus(aiConsensusModel.getAgentStatus());
      
      return consensus;
    } catch (error) {
      toast.error(`AI analysis failed: ${error.message}`);
      logger.error(`AI consensus error: ${error.message}`);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Update success rates after a trade completes
   */
  const updateTradeResult = (tradeResult) => {
    try {
      aiConsensusModel.updateAgentSuccessRates(tradeResult);
      setAgentStatus(aiConsensusModel.getAgentStatus());
    } catch (error) {
      logger.error(`Failed to update trade result: ${error.message}`);
    }
  };
  
  return {
    isInitialized,
    isAnalyzing,
    lastConsensus,
    agentStatus,
    getConsensus,
    updateTradeResult,
    rawModel: aiConsensusModel
  };
}

export default aiConsensusModel;
