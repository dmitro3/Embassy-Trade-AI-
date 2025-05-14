'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

/**
 * Component for paper trading execution and trade history tracking
 * Simulates trades on devnet/testnet and maintains a log
 */
const PaperTradingExecutor = ({ tradeSignal, autoTradeEnabled = false, className = '' }) => {
  const { publicKey, connected } = useWallet();
  const [tradeHistory, setTradeHistory] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeStats, setTradeStats] = useState({
    winCount: 0,
    lossCount: 0,
    totalPnL: 0,
    largestWin: 0,
    largestLoss: 0
  });
  
  // Generate a unique key for each trade
  const generateTradeKey = useCallback((trade) => {
    return `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);
  
  // Execute a paper trade on devnet/testnet
  const executeTrade = useCallback(async (trade) => {
    if (!connected || !publicKey || !trade) return null;
    
    try {
      setIsExecuting(true);
      
      // Simulate network latency and trade execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real system, this would execute a trade on a DEX or CEX
      // For paper trading, we're simulating this with a mock execution
      
      // Calculate simulated trade result
      const isWin = Math.random() < 0.65; // 65% win rate for simulation
      const priceChange = isWin 
        ? parseFloat(trade.profitPotential) 
        : -parseFloat(trade.profitPotential) * (Math.random() * 0.5 + 0.5);
      
      const entryPrice = trade.price;
      const exitPrice = entryPrice * (1 + (priceChange / 100));
      const pnl = priceChange;
      
      // Create the executed trade record
      const executedTrade = {
        ...trade,
        key: generateTradeKey(trade),
        executionTimestamp: Date.now(),
        executionPrice: entryPrice,
        exitPrice: exitPrice,
        pnl: pnl,
        status: 'executed',
        isWin: isWin,
        network: WalletAdapterNetwork.Devnet, // Assuming devnet for paper trading
        txHash: `sim-${Date.now().toString(36)}`
      };
      
      // Update trade history
      setTradeHistory(prev => [executedTrade, ...prev]);
      
      // Update trade statistics
      setTradeStats(prev => {
        const newWinCount = prev.winCount + (isWin ? 1 : 0);
        const newLossCount = prev.lossCount + (isWin ? 0 : 1);
        const newTotalPnL = prev.totalPnL + pnl;
        const newLargestWin = isWin ? Math.max(prev.largestWin, pnl) : prev.largestWin;
        const newLargestLoss = !isWin ? Math.min(prev.largestLoss, pnl) : prev.largestLoss;
        
        return {
          winCount: newWinCount,
          lossCount: newLossCount,
          totalPnL: newTotalPnL,
          largestWin: newLargestWin,
          largestLoss: newLargestLoss
        };
      });
      
      // Show notification
      toast.success(`${trade.action.toUpperCase()} trade executed: ${isWin ? 'Profit' : 'Loss'} of ${Math.abs(pnl).toFixed(2)}%`);
      
      return executedTrade;
    } catch (error) {
      console.error('Trade execution error:', error);
      toast.error('Failed to execute paper trade');
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [connected, generateTradeKey, publicKey]);
  
  // Handle trade signal when auto-trade is enabled
  useEffect(() => {
    if (autoTradeEnabled && tradeSignal && !isExecuting) {
      executeTrade(tradeSignal);
    }
  }, [autoTradeEnabled, executeTrade, isExecuting, tradeSignal]);
  
  // Handle manual trade execution
  const handleManualExecution = (trade) => {
    if (isExecuting) return;
    executeTrade(trade);
  };
  
  // Calculate win rate percentage
  const calculateWinRate = () => {
    const totalTrades = tradeStats.winCount + tradeStats.lossCount;
    if (totalTrades === 0) return 0;
    return (tradeStats.winCount / totalTrades) * 100;
  };
  
  // Format trade time
  const formatTradeTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <div className={`paper-trading-executor ${className}`}>
      {/* Trade Execution Status */}
      {isExecuting && (
        <div className="bg-blue-500/10 p-3 mb-4 rounded-lg">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div>
              <p className="text-blue-400 font-medium">Executing Paper Trade</p>
              <p className="text-xs text-gray-400">Simulating trade execution on testnet...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Trading Stats */}
      {(tradeStats.winCount > 0 || tradeStats.lossCount > 0) && (
        <div className="bg-gray-800 p-4 mb-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Trading Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <p className="text-xs text-gray-400">Win Rate</p>
              <p className={`font-medium ${calculateWinRate() > 50 ? 'text-green-500' : 'text-red-500'}`}>
                {calculateWinRate().toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <p className="text-xs text-gray-400">Total Trades</p>
              <p className="font-medium">{tradeStats.winCount + tradeStats.lossCount}</p>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <p className="text-xs text-gray-400">Total P&L</p>
              <p className={`font-medium ${tradeStats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tradeStats.totalPnL.toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <p className="text-xs text-gray-400">Largest Win</p>
              <p className="font-medium text-green-500">{tradeStats.largestWin.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-700/50 rounded p-2 text-center">
              <p className="text-xs text-gray-400">Largest Loss</p>
              <p className="font-medium text-red-500">{tradeStats.largestLoss.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Trade Signal */}
      {tradeSignal && !autoTradeEnabled && (
        <div className="bg-gray-800 p-4 mb-4 rounded-lg border border-blue-500/30">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">New Trading Signal</h3>
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
              {formatTradeTime(tradeSignal.timestamp)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-xs text-gray-400">Pair</p>
              <p className="font-medium">{tradeSignal.tradePair}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Action</p>
              <p className={`font-medium ${tradeSignal.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                {tradeSignal.action.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Price</p>
              <p className="font-medium">${tradeSignal.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Potential</p>
              <p className="font-medium text-green-500">{tradeSignal.profitPotential}</p>
            </div>
          </div>
          
          <button
            onClick={() => handleManualExecution(tradeSignal)}
            disabled={isExecuting}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? 'Executing...' : 'Execute Paper Trade'}
          </button>
        </div>
      )}
      
      {/* Trade History Log */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Paper Trade History</h3>
        
        {tradeHistory.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr className="border-b border-gray-700">
                  <th className="pb-2 text-left">Time</th>
                  <th className="pb-2 text-left">Pair</th>
                  <th className="pb-2 text-left">Action</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.map((trade) => (
                  <tr key={trade.key} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2 text-gray-300">{formatTradeTime(trade.executionTimestamp)}</td>
                    <td className="py-2">{trade.tradePair}</td>
                    <td className={`py-2 ${trade.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.action.toUpperCase()}
                    </td>
                    <td className="py-2 text-right">${trade.executionPrice.toFixed(2)}</td>
                    <td className={`py-2 text-right font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No paper trades executed yet</p>
            <p className="text-sm mt-1">Trades will appear here once executed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTradingExecutor;
