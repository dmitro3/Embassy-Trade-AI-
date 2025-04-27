// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\RoundTableConsensus.js
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * RoundTableConsensus Component
 * 
 * Displays the AI agents' consensus for trading decisions
 * Includes an animated lightbulb for high-confidence signals
 */
const RoundTableConsensus = ({ analysis, onAgentClick }) => {
  const [showLightbulb, setShowLightbulb] = useState(false);
  const [lightbulbSize, setLightbulbSize] = useState(1);
  
  // Show animated lightbulb for high confidence signals
  useEffect(() => {
    if (analysis && analysis.hasConsensus && analysis.consensusConfidence >= 0.7) {
      setShowLightbulb(true);
      
      // Animate lightbulb size
      const interval = setInterval(() => {
        setLightbulbSize(prev => {
          const newSize = prev + 0.05;
          return newSize > 1.3 ? 1 : newSize;
        });
      }, 100);
      
      // Hide after 8 seconds
      const timer = setTimeout(() => {
        setShowLightbulb(false);
        clearInterval(interval);
      }, 8000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setShowLightbulb(false);
    }
  }, [analysis]);
  
  if (!analysis || !analysis.agentSignals || analysis.agentSignals.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-4">
        <h2 className="text-xl font-semibold text-white mb-4">RoundTable AI Consensus</h2>
        <div className="text-gray-400 text-center py-6">
          No analysis data available. Select an asset and run analysis.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-4 relative">
      {/* Trading alert indicator (lightbulb) */}
      {showLightbulb && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: lightbulbSize, 
            rotate: [0, 5, -5, 0],
            transition: { duration: 0.5 }
          }}
          className="absolute -top-10 -right-4 z-50"
        >
          <div className="bg-yellow-400 p-3 rounded-full shadow-lg flex items-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0110 1.5V4h2.5a1 1 0 01.5 1.857l-7 4A1 1 0 015 9H2.5a1 1 0 01-.5-1.857l7-4a1 1 0 011.3.903zM3 13.12v-2a1 1 0 112 0v2a1 1 0 11-2 0zm14-2a1 1 0 10-2 0v2a1 1 0 102 0v-2zm-8 2a1 1 0 112 0 3 3 0 003 3h.172a2 2 0 001.414-.586l.828-.828a1 1 0 000-1.414l-.586-.586a1 1 0 111.414-1.414l.586.586a3 3 0 010 4.243l-.828.828A4 4 0 0112.172 18H12a5 5 0 01-5-5 1 1 0 112 0z" clipRule="evenodd" />
            </svg>
            <span className="ml-2 text-white font-bold">Signal!</span>
          </div>
        </motion.div>
      )}
      
      <h2 className="text-xl font-semibold text-white mb-4">RoundTable AI Consensus</h2>
      
      {/* Consensus summary */}
      <div className="mb-6 p-4 rounded-lg bg-gray-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300">Consensus:</span>
          <span className={`font-bold text-lg ${
            analysis.action === 'buy' ? 'text-green-400' :
            analysis.action === 'sell' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {analysis.action.toUpperCase()}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300">Confidence:</span>
          <div className="flex items-center">
            <div className="w-32 bg-gray-600 rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.action === 'buy' ? 'bg-green-400' :
                  analysis.action === 'sell' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}
                style={{ width: `${analysis.consensusConfidence * 100}%` }}
              ></div>
            </div>
            <span className="text-white font-medium">
              {Math.round(analysis.consensusConfidence * 100)}%
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Agreeing Agents:</span>
          <span className="text-white font-medium">{analysis.agreeingAgents}/{analysis.agentSignals.length}</span>
        </div>
      </div>
      
      {/* AI Agents */}
      <h3 className="text-lg font-medium text-white mb-3">AI Agents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {analysis.agentSignals.map((agent, index) => (
          <div 
            key={index}
            onClick={() => onAgentClick && onAgentClick(agent)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              agent.action === analysis.action
                ? 'bg-blue-900 hover:bg-blue-800'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="font-medium text-white">{agent.agent}</div>
              <div className={`px-2 py-1 text-xs rounded-full font-semibold ${
                agent.action === 'buy' ? 'bg-green-900 text-green-200' :
                agent.action === 'sell' ? 'bg-red-900 text-red-200' :
                'bg-gray-600 text-gray-300'
              }`}>
                {agent.action.toUpperCase()}
              </div>
            </div>
            
            <div className="text-xs text-gray-400 mt-1">
              {agent.specialty}
            </div>
            
            <div className="mt-2 flex items-center">
              <div className="text-xs text-gray-400 mr-2">Confidence:</div>
              <div className="w-full bg-gray-600 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    agent.action === 'buy' ? 'bg-green-400' :
                    agent.action === 'sell' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${agent.confidence * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Entry, Stop Loss and Take Profit */}
      {(analysis.stopLoss || analysis.takeProfit) && (
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">Trade Parameters</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-gray-600 rounded-lg text-center">
              <div className="text-xs text-gray-400 mb-1">Entry</div>
              <div className="text-white">${analysis.currentPrice?.toFixed(4) || 'N/A'}</div>
            </div>
            
            {analysis.stopLoss && (
              <div className="p-2 bg-gray-600 rounded-lg text-center">
                <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                <div className="text-red-400">${analysis.stopLoss.toFixed(4)}</div>
              </div>
            )}
            
            {analysis.takeProfit && (
              <div className="p-2 bg-gray-600 rounded-lg text-center">
                <div className="text-xs text-gray-400 mb-1">Take Profit</div>
                <div className="text-green-400">${analysis.takeProfit.toFixed(4)}</div>
              </div>
            )}
          </div>
          
          {analysis.riskReward && (
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-400">Risk/Reward:</span>
              <span className="ml-1 text-white">1:{analysis.riskReward.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoundTableConsensus;
