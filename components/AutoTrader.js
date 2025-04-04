import React, { useState, useEffect } from 'react';
import useElectron from '../lib/useElectron';
import AutoTradeModal from './AutoTradeModal';
import useTradeWebSocket from '../lib/useTradeWebSocket';

/**
 * AutoTrader component that provides AI-driven trading capabilities
 * Desktop app exclusive feature for advanced trading automation
 */
const AutoTrader = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStrategies, setActiveStrategies] = useState([]);
  const [tradeStats, setTradeStats] = useState({
    totalTrades: 0,
    successRate: 0,
    profitLoss: 0,
    lastUpdated: null
  });
  const { isDesktopApp, autoTrader, showNotification } = useElectron();
  const { autoAccept, toggleAutoAccept } = useTradeWebSocket();
  
  // Initialize trader on mount
  useEffect(() => {
    // If in desktop app, fetch any active strategies and stats
    if (isDesktopApp && autoTrader) {
      const fetchTraderData = async () => {
        try {
          const strategies = await autoTrader.getActiveStrategies();
          const stats = await autoTrader.getTradeStats();
          
          if (strategies) {
            setActiveStrategies(strategies);
          }
          
          if (stats) {
            setTradeStats(stats);
          }
        } catch (error) {
          console.error('Failed to fetch auto trader data:', error);
        }
      };
      
      fetchTraderData();
      
      // Set up listener for trade notifications
      if (autoTrader.onTradeExecuted) {
        autoTrader.onTradeExecuted((trade) => {
          showNotification(
            'Auto Trade Executed',
            `${trade.action} ${trade.symbol} at ${trade.price} (${trade.profitLoss})`
          );
          
          // Update stats
          setTradeStats(prev => ({
            ...prev,
            totalTrades: prev.totalTrades + 1,
            profitLoss: prev.profitLoss + trade.profitLossValue,
            lastUpdated: new Date().toISOString()
          }));
        });
      }
    }
  }, [isDesktopApp, autoTrader, showNotification]);
  
  // Open auto trade modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  // Close auto trade modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  // Toggle a strategy on/off
  const handleToggleStrategy = async (strategyId) => {
    try {
      if (!isDesktopApp || !autoTrader) {
        showNotification('Limited Feature', 'Full AutoTrader features only available in desktop app');
        return;
      }
      
      // Find strategy
      const strategy = activeStrategies.find(s => s.id === strategyId);
      if (!strategy) return;
      
      const newState = !strategy.isActive;
      const result = await autoTrader.toggleStrategy(strategyId, newState);
      
      if (result.success) {
        // Update local state
        setActiveStrategies(prev => 
          prev.map(s => s.id === strategyId ? { ...s, isActive: newState } : s)
        );
        
        showNotification(
          'Strategy Updated',
          `Strategy "${strategy.name}" ${newState ? 'activated' : 'deactivated'} successfully`
        );
      }
    } catch (error) {
      console.error('Failed to toggle strategy:', error);
      showNotification('Error', 'Failed to update trading strategy');
    }
  };
  
  // Format profit/loss with proper color and + symbol
  const formatProfitLoss = (value) => {
    const isPositive = value > 0;
    const colorClass = isPositive 
      ? 'text-green-500' 
      : value < 0 
        ? 'text-red-500' 
        : 'text-gray-500';
    
    return (
      <span className={colorClass}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-600 flex justify-between items-center">
        <h2 className="text-white text-lg font-bold">AI Auto-Trader</h2>
        <button
          onClick={handleOpenModal}
          className="bg-white text-indigo-700 hover:bg-indigo-100 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        >
          Find Trades
        </button>
      </div>
      
      {/* Auto Accept Toggle */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 dark:bg-gray-700/30 dark:border-gray-700 flex items-center justify-between">
        <label htmlFor="autoAcceptToggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Auto-accept future trades (24/7 trading)
        </label>
        <div className="relative inline-block w-12 align-middle select-none">
          <input 
            type="checkbox" 
            name="autoAcceptToggle" 
            id="autoAcceptToggle" 
            className="sr-only"
            checked={autoAccept}
            onChange={() => toggleAutoAccept(!autoAccept)} 
          />
          <div className={`block w-12 h-6 rounded-full ${autoAccept ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} transition-colors`}></div>
          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoAccept ? 'transform translate-x-6' : ''}`}></div>
        </div>
      </div>
      
      {/* Desktop App Only Notice */}
      {!isDesktopApp && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-700/30">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Desktop exclusive feature:</strong> For full AI trading capabilities and real-time automated trading, please download our desktop app.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Trading Stats */}
      <div className="grid grid-cols-3 gap-4 p-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total Trades</div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{tradeStats.totalTrades}</div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Success Rate</div>
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{tradeStats.successRate}%</div>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Profit/Loss</div>
          <div className="text-xl font-bold">
            {formatProfitLoss(tradeStats.profitLoss)}
          </div>
        </div>
      </div>
      
      {/* Active Strategies */}
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Trading Strategies</h3>
          {isDesktopApp && (
            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              Configure
            </button>
          )}
        </div>
        
        {activeStrategies.length > 0 ? (
          <div className="space-y-3">
            {activeStrategies.map(strategy => (
              <div 
                key={strategy.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{strategy.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{strategy.description}</div>
                </div>
                
                <div className="flex items-center">
                  {strategy.performance && (
                    <span className="text-xs mr-3">
                      {formatProfitLoss(strategy.performance)}
                    </span>
                  )}
                  
                  <button
                    onClick={() => handleToggleStrategy(strategy.id)}
                    disabled={!isDesktopApp}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${
                      strategy.isActive
                        ? 'bg-indigo-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    } ${!isDesktopApp ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={strategy.isActive}
                  >
                    <span 
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        strategy.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isDesktopApp 
                ? 'No active trading strategies. Click "Find Trades" to get started.'
                : 'Trading strategies are available in the desktop app.'}
            </p>
            <button 
              onClick={handleOpenModal}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Find Opportunities
            </button>
          </div>
        )}
      </div>
      
      {/* Latest Trades */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Latest Trades</h3>
          {isDesktopApp && tradeStats.totalTrades > 0 && (
            <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              View All
            </button>
          )}
        </div>
        
        {tradeStats.totalTrades > 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {tradeStats.lastUpdated && (
              <div className="text-right">
                Last updated: {new Date(tradeStats.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No trades have been executed yet.
            </p>
          </div>
        )}
      </div>
      
      {/* Auto Trade Modal */}
      {isModalOpen && (
        <AutoTradeModal onClose={handleCloseModal} />
      )}
    </div>
  );
};

// Default mock strategy data for development and web mode
AutoTrader.defaultProps = {
  defaultStrategies: [
    {
      id: 'strategy-1',
      name: 'Momentum Trader',
      description: 'Identifies and rides strong price trends',
      isActive: true,
      performance: 12.4
    },
    {
      id: 'strategy-2',
      name: 'Pattern Breakout',
      description: 'Targets technical pattern breakouts',
      isActive: false,
      performance: 8.7
    },
    {
      id: 'strategy-3', 
      name: 'Range Oscillator',
      description: 'Trades between support and resistance',
      isActive: true,
      performance: -2.3
    }
  ]
};

export default AutoTrader;