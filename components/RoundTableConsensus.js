'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import roundTableAI from '../lib/roundTableAI';
import tradeExecutionService from '../lib/tradeExecutionService';
import logger from '../lib/logger';

/**
 * RoundTableConsensus Component
 * 
 * Displays AI trading signals from multiple agents and allows
 * users to execute trades based on consensus
 */
const RoundTableConsensus = ({ asset, onTradeExecuted }) => {
  const { publicKey, connected, signTransaction } = useWallet();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [consensus, setConsensus] = useState(null);
  const [agentSignals, setAgentSignals] = useState([]);
  const [tradeAmount, setTradeAmount] = useState(10); // Default trade amount
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize AI on mount
  useEffect(() => {
    const initializeAI = async () => {
      try {
        if (!roundTableAI.isInitialized()) {
          await roundTableAI.initialize();
        }
      } catch (error) {
        logger.error('Failed to initialize RoundTable AI:', error);
        setError('Failed to initialize AI trading system');
      }
    };
    
    initializeAI();
  }, []);
  
  // Fetch consensus when asset changes
  useEffect(() => {
    if (!asset) {
      setIsLoading(false);
      return;
    }
    
    const fetchConsensus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Run RoundTable AI to get consensus
        const result = await roundTableAI.runRoundTable(asset);
        
        // Update state with results
        setConsensus({
          signal: result.consensusSignal,
          confidence: result.consensusConfidence,
          hasConsensus: result.hasConsensus,
          timestamp: result.timestamp
        });
        
        // Format agent signals for display
        const formattedAgents = Object.entries(result.agents).map(([id, data]) => ({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          signal: data.signal,
          confidence: data.confidence,
          weight: data.weight
        }));
        
        setAgentSignals(formattedAgents);
      } catch (error) {
        logger.error(`Error fetching consensus for ${asset}:`, error);
        setError(`Failed to get trading signals for ${asset}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConsensus();
    
    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(fetchConsensus, 30000);
    
    return () => clearInterval(intervalId);
  }, [asset]);
  
  // Execute trade based on consensus
  const executeTrade = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!consensus || !consensus.hasConsensus) {
      toast.error('No strong consensus for trading. Wait for a stronger signal.');
      return;
    }
    
    try {
      setIsExecuting(true);
      
      // Determine trade details based on consensus
      const inputToken = 'SOL';
      const outputToken = asset;
      const tradeType = consensus.signal;
      
      // Only execute if signal is buy or sell
      if (tradeType !== 'buy' && tradeType !== 'sell') {
        toast.info('Current signal is to hold. No trade executed.');
        setIsExecuting(false);
        return;
      }
      
      // Execute trade
      const result = await tradeExecutionService.executeTrade({
        inputToken: tradeType === 'buy' ? 'SOL' : asset,
        outputToken: tradeType === 'buy' ? asset : 'SOL',
        amount: tradeAmount,
        slippage: 1.0, // 1% slippage
        wallet: {
          publicKey,
          signTransaction
        }
      });
      
      // Handle result
      if (result.status === 'completed') {
        toast.success(`Trade executed successfully!`);
        
        // Notify parent component
        if (onTradeExecuted) {
          onTradeExecuted({
            status: 'completed',
            txHash: result.txHash,
            inputToken: result.inputToken,
            outputToken: result.outputToken,
            amount: result.amount,
            timestamp: result.timestamp
          });
        }
      } else {
        toast.error(`Trade failed: ${result.error}`);
      }
    } catch (error) {
      logger.error('Error executing trade:', error);
      toast.error(`Failed to execute trade: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Get signal color based on type
  const getSignalColor = (signal) => {
    switch (signal) {
      case 'buy':
        return 'text-green-400';
      case 'sell':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };
  
  // Get confidence color based on level
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-gray-400';
  };
  
  // Format confidence as percentage
  const formatConfidence = (confidence) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Analyzing market data...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="bg-red-900/30 p-4 rounded-lg text-center">
        <p className="text-red-400 mb-2">{error}</p>
        <button 
          className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white text-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Render no asset selected state
  if (!asset) {
    return (
      <div className="text-center py-10 text-gray-500">
        Select a token to see AI trading signals
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consensus Signal */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">AI Consensus</h3>
          <span className="text-xs text-gray-400">
            Updated: {formatTimestamp(consensus?.timestamp)}
          </span>
        </div>
        
        <div className="flex items-center justify-center space-x-4 py-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Signal</div>
            <div className={`text-2xl font-bold ${getSignalColor(consensus?.signal)}`}>
              {consensus?.signal.toUpperCase()}
            </div>
          </div>
          
          <div className="h-10 border-l border-gray-600"></div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Confidence</div>
            <div className={`text-2xl font-bold ${getConfidenceColor(consensus?.confidence)}`}>
              {formatConfidence(consensus?.confidence)}
            </div>
          </div>
          
          <div className="h-10 border-l border-gray-600"></div>
          
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Consensus</div>
            <div className={`text-2xl font-bold ${consensus?.hasConsensus ? 'text-green-400' : 'text-yellow-400'}`}>
              {consensus?.hasConsensus ? 'STRONG' : 'WEAK'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Agent Signals */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">AI Agents</h3>
        
        <div className="space-y-3">
          {agentSignals.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <div className="font-medium">{agent.name}</div>
                <div className="text-xs text-gray-400">Weight: {(agent.weight * 100).toFixed(0)}%</div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Signal</div>
                  <div className={`font-medium ${getSignalColor(agent.signal)}`}>
                    {agent.signal.toUpperCase()}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Confidence</div>
                  <div className={`font-medium ${getConfidenceColor(agent.confidence)}`}>
                    {formatConfidence(agent.confidence)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Trade Execution */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Execute Trade</h3>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Amount (SOL)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          <button
            onClick={executeTrade}
            disabled={isExecuting || !connected || !consensus?.hasConsensus}
            className={`px-6 py-2 rounded-lg text-white font-medium ${
              isExecuting ? 'bg-gray-600' : 
              !connected ? 'bg-gray-600' : 
              !consensus?.hasConsensus ? 'bg-gray-600' :
              consensus?.signal === 'buy' ? 'bg-green-600 hover:bg-green-500' :
              consensus?.signal === 'sell' ? 'bg-red-600 hover:bg-red-500' :
              'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isExecuting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Executing...
              </span>
            ) : !connected ? (
              'Connect Wallet'
            ) : !consensus?.hasConsensus ? (
              'No Strong Signal'
            ) : consensus?.signal === 'buy' ? (
              'Buy Now'
            ) : consensus?.signal === 'sell' ? (
              'Sell Now'
            ) : (
              'Hold'
            )}
          </button>
        </div>
        
        {!connected && (
          <p className="text-sm text-yellow-400">Please connect your wallet to execute trades.</p>
        )}
        
        {connected && !consensus?.hasConsensus && (
          <p className="text-sm text-yellow-400">Waiting for a stronger trading signal...</p>
        )}
      </div>
    </div>
  );
};

export default RoundTableConsensus;
