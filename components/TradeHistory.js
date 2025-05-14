'use client';

import React, { useState } from 'react';
import { useTradeHistory } from '../lib/tradeHistoryService';

/**
 * TradeHistory Component
 * 
 * Displays trade history and performance metrics
 */
const TradeHistory = () => {
  const { trades, metrics, clearHistory } = useTradeHistory();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'win', 'loss'
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format percentage for display
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0.00%';
    
    const formatted = Number(value).toFixed(2);
    return `${formatted}%`;
  };
  
  // Filter trades based on selected filter
  const filteredTrades = trades.filter(trade => {
    if (filter === 'win') return trade.pnl > 0;
    if (filter === 'loss') return trade.pnl < 0;
    return true; // 'all'
  });

  return (
    <div className="bg-gray-800 rounded-lg p-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Trade History</h2>
          <p className="text-gray-400 text-sm">Performance tracking and trade logs</p>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <div className="flex flex-col items-center bg-gray-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-gray-400">Win Rate</span>
            <span className={`text-lg font-bold ${metrics.winRate >= 65 ? 'text-green-400' : metrics.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {formatPercent(metrics.winRate)}
            </span>
          </div>
          
          <div className="flex flex-col items-center bg-gray-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-gray-400">Total Trades</span>
            <span className="text-lg font-bold text-white">{metrics.totalTrades}</span>
          </div>
          
          <div className="flex flex-col items-center bg-gray-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-gray-400">Avg. PnL</span>
            <span className={`text-lg font-bold ${metrics.averagePnl > 0 ? 'text-green-400' : metrics.averagePnl < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatPercent(metrics.averagePnl)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            All Trades
          </button>
          <button 
            onClick={() => setFilter('win')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'win' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Winning
          </button>
          <button 
            onClick={() => setFilter('loss')}
            className={`px-3 py-1 rounded-md text-sm ${filter === 'loss' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Losing
          </button>
        </div>
        
        <div>
          {showConfirmClear ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-yellow-400">Are you sure?</span>
              <button 
                onClick={() => {
                  clearHistory();
                  setShowConfirmClear(false);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Yes, Clear
              </button>
              <button 
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowConfirmClear(true)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600"
              disabled={trades.length === 0}
            >
              Clear History
            </button>
          )}
        </div>
      </div>
      
      {/* Trade list */}
      <div className="overflow-x-auto">
        {filteredTrades.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Token</th>
                <th className="px-4 py-2 text-left">Side</th>
                <th className="px-4 py-2 text-right">Entry</th>
                <th className="px-4 py-2 text-right">Exit</th>
                <th className="px-4 py-2 text-right">PnL</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-gray-700">
                  <td className="px-4 py-3 font-medium">
                    {trade.token || trade.tokenPair || 'Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.side === 'buy' ? 'bg-green-900/30 text-green-400' : 
                      trade.side === 'sell' ? 'bg-red-900/30 text-red-400' : 
                      'bg-gray-900/30 text-gray-400'
                    }`}>
                      {trade.side || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${Number(trade.entryPrice || 0).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${Number(trade.exitPrice || 0).toFixed(4)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    trade.pnl > 0 ? 'text-green-400' : 
                    trade.pnl < 0 ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {formatPercent(trade.pnl)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {formatDate(trade.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      trade.status === 'completed' ? 'bg-green-900/30 text-green-400' : 
                      trade.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' : 
                      trade.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-900/30 text-gray-400'
                    }`}>
                      {trade.status || 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {trades.length === 0 ? (
              <p>No trade history available</p>
            ) : (
              <p>No trades match the selected filter</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeHistory;
