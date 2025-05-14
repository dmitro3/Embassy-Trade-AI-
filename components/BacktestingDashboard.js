'use client';

/**
 * TradeForce AI Backtesting UI Component
 * 
 * This component provides a user interface for the TradeForce AI backtesting system,
 * allowing users to:
 * - Configure and run backtests
 * - View backtest results
 * - Optimize strategy parameters
 * - Visualize performance metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaPlayCircle, FaCog, FaChartBar, FaSyncAlt, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useBacktesting } from '../lib/backtestingSystem';
import logger from '../lib/logger';
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import tradeDecisionEngine from '../lib/tradeDecisionEngine';

const BacktestingDashboard = () => {
  // Use the backtesting hook
  const {
    isInitialized,
    isRunningBacktest,
    backtestResults,
    optimizationResults,
    error,
    runBacktest,
    optimizeStrategy
  } = useBacktesting();
  
  // State for backtest configuration
  const [backtestConfig, setBacktestConfig] = useState({
    symbols: ['BTC/USD'],
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    endDate: new Date().toISOString().split('T')[0], // Today
    timeframe: '1d',
    initialCapital: 10000,
    tradeSize: 0.1,
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    maxOpenTrades: 5,
    feePercentage: 0.1,
    strategy: 'ai_consensus',
    allowShorts: false
  });
  
  // State for optimization parameters
  const [optimizationConfig, setOptimizationConfig] = useState({
    enabled: false,
    ranges: {
      tradeSize: [0.05, 0.1, 0.15, 0.2],
      stopLossPercentage: [3, 5, 7, 10],
      takeProfitPercentage: [10, 15, 20, 25]
    }
  });
  
  // State for watchlist and symbols
  const [watchlist, setWatchlist] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  
  // State for UI navigation
  const [activeTab, setActiveTab] = useState('configuration');
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Refs for chart and performance sections
  const resultsSectionRef = useRef(null);
  
  // Load watchlist on component mount
  useEffect(() => {
    if (tradeDecisionEngine.isInitialized()) {
      const watchlistItems = tradeDecisionEngine.getWatchlist();
      setWatchlist(watchlistItems);
      
      if (watchlistItems.length > 0) {
        setBacktestConfig(prev => ({ ...prev, symbols: [watchlistItems[0]] }));
      }
    } else {
      // Initialize trade decision engine if needed
      const initDecisionEngine = async () => {
        try {
          await tradeDecisionEngine.init();
          const watchlistItems = tradeDecisionEngine.getWatchlist();
          setWatchlist(watchlistItems);
          
          if (watchlistItems.length > 0) {
            setBacktestConfig(prev => ({ ...prev, symbols: [watchlistItems[0]] }));
          }
        } catch (error) {
          logger.error(`Error initializing trade decision engine: ${error.message}`);
        }
      };
      
      initDecisionEngine();
    }
  }, []);
  
  // Handle adding symbol to backtest
  const handleAddSymbol = () => {
    if (!newSymbol) return;
    
    // Check if symbol is already in the list
    if (backtestConfig.symbols.includes(newSymbol)) {
      toast.error('Symbol is already in the list');
      return;
    }
    
    setBacktestConfig(prev => ({
      ...prev,
      symbols: [...prev.symbols, newSymbol]
    }));
    
    setNewSymbol('');
  };
  
  // Handle removing symbol from backtest
  const handleRemoveSymbol = (symbol) => {
    setBacktestConfig(prev => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== symbol)
    }));
  };
  
  // Handle form changes
  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBacktestConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle running a backtest
  const handleRunBacktest = async () => {
    if (backtestConfig.symbols.length === 0) {
      toast.error('Please add at least one symbol to backtest');
      return;
    }
    
    try {
      // Convert string values to numbers where appropriate
      const configForBacktest = {
        ...backtestConfig,
        initialCapital: Number(backtestConfig.initialCapital),
        tradeSize: Number(backtestConfig.tradeSize),
        stopLossPercentage: Number(backtestConfig.stopLossPercentage),
        takeProfitPercentage: Number(backtestConfig.takeProfitPercentage),
        maxOpenTrades: Number(backtestConfig.maxOpenTrades),
        feePercentage: Number(backtestConfig.feePercentage)
      };
      
      // Run normal backtest
      if (!optimizationConfig.enabled) {
        toast.loading('Running backtest...');
        const results = await runBacktest(configForBacktest);
        
        if (results.error) {
          toast.error(`Backtest failed: ${results.error}`);
        } else {
          toast.success('Backtest completed successfully');
          setSelectedResult(results);
          setActiveTab('results');
          
          // Scroll to results section
          if (resultsSectionRef.current) {
            resultsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
      // Run optimization
      else {
        toast.loading('Running parameter optimization...');
        const results = await optimizeStrategy(configForBacktest, optimizationConfig.ranges);
        
        if (results.error) {
          toast.error(`Optimization failed: ${results.error}`);
        } else {
          toast.success('Optimization completed successfully');
          setSelectedResult(results);
          setActiveTab('optimization');
          
          // Scroll to results section
          if (resultsSectionRef.current) {
            resultsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };
  
  // Toggle optimization
  const handleToggleOptimization = () => {
    setOptimizationConfig(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };
  
  // Handle updating optimization ranges
  const handleOptimizationRangeChange = (param, values) => {
    setOptimizationConfig(prev => ({
      ...prev,
      ranges: {
        ...prev.ranges,
        [param]: values
      }
    }));
  };
  
  // Handle exporting results to CSV
  const handleExportResults = () => {
    if (!selectedResult) return;
    
    try {
      // Create CSV content for trades
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Symbol,Direction,Price,Quantity,Value,Fee,PnL,Timestamp,Reason\n";
      
      selectedResult.trades?.forEach(trade => {
        csvContent += `${trade.symbol},${trade.direction},${trade.price},${trade.quantity},${trade.value},${trade.fee},${trade.pnl || ''},${new Date(trade.timestamp).toISOString()},${trade.reason}\n`;
      });
      
      // Create and trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `backtest_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Results exported to CSV');
    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    }
  };
  
  // Prepare chart data for equity curve
  const prepareEquityCurveData = () => {
    if (!selectedResult || !selectedResult.equity) {
      return { labels: [], datasets: [] };
    }
    
    const labels = selectedResult.equity.map(point => 
      new Date(point.timestamp).toLocaleDateString()
    );
    
    const data = selectedResult.equity.map(point => point.value);
    
    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    };
  };
  
  // Prepare chart data for trade analysis
  const prepareTradeAnalysisData = () => {
    if (!selectedResult || !selectedResult.trades) {
      return { labels: [], datasets: [] };
    }
    
    // Calculate profit/loss by symbol
    const symbolPnL = {};
    selectedResult.trades.forEach(trade => {
      if (!trade.pnl) return;
      
      if (!symbolPnL[trade.symbol]) {
        symbolPnL[trade.symbol] = 0;
      }
      
      symbolPnL[trade.symbol] += trade.pnl;
    });
    
    const labels = Object.keys(symbolPnL);
    const data = Object.values(symbolPnL);
    
    return {
      labels,
      datasets: [
        {
          label: 'Profit/Loss by Symbol',
          data,
          backgroundColor: data.map(value => value >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)')
        }
      ]
    };
  };
  
  // Render loading state
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Initializing backtesting system...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">TradeForce AI Backtesting System</h1>
      
      {/* Tabs Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'configuration' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('configuration')}
        >
          <FaCog className="inline mr-2" />
          Configuration
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'results' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('results')}
          disabled={!selectedResult}
        >
          <FaChartLine className="inline mr-2" />
          Results
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'optimization' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('optimization')}
          disabled={!optimizationResults}
        >
          <FaChartBar className="inline mr-2" />
          Optimization
        </button>
      </div>
      
      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Backtest Parameters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Backtest Configuration</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Trading Symbols</label>
              <div className="flex mb-2">
                <input
                  type="text"
                  className="flex-grow px-3 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Symbol (e.g., BTC/USD or token address)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                />
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-lg"
                  onClick={handleAddSymbol}
                >
                  Add
                </button>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto">
                {backtestConfig.symbols.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-2">No symbols added</p>
                ) : (
                  <ul className="space-y-1">
                    {backtestConfig.symbols.map((symbol) => (
                      <li key={symbol} className="flex justify-between items-center bg-white dark:bg-gray-600 rounded px-2 py-1">
                        <span>{symbol}</span>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveSymbol(symbol)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Add symbols to backtest. For Solana tokens, use the token address.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={backtestConfig.startDate}
                  onChange={handleConfigChange}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={backtestConfig.endDate}
                  onChange={handleConfigChange}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Timeframe</label>
              <select
                name="timeframe"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.timeframe}
                onChange={handleConfigChange}
              >
                <option value="15m">15 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Initial Capital (USD)</label>
              <input
                type="number"
                name="initialCapital"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.initialCapital}
                onChange={handleConfigChange}
                min="100"
                step="100"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Trading Strategy</label>
              <select
                name="strategy"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.strategy}
                onChange={handleConfigChange}
              >
                <option value="ai_consensus">AI Consensus</option>
                <option value="sma_crossover">SMA Crossover</option>
                <option value="rsi_overbought_oversold">RSI Overbought/Oversold</option>
              </select>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                name="allowShorts"
                id="allowShorts"
                className="mr-2"
                checked={backtestConfig.allowShorts}
                onChange={handleConfigChange}
              />
              <label htmlFor="allowShorts">Allow Short Positions</label>
            </div>
          </div>
          
          {/* Right Column - Advanced Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Trade Size (% of portfolio per trade)</label>
              <input
                type="number"
                name="tradeSize"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.tradeSize}
                onChange={handleConfigChange}
                min="0.01"
                max="1"
                step="0.01"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Example: 0.1 = 10% of portfolio per trade
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Stop Loss (%)</label>
              <input
                type="number"
                name="stopLossPercentage"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.stopLossPercentage}
                onChange={handleConfigChange}
                min="1"
                max="50"
                step="0.5"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Take Profit (%)</label>
              <input
                type="number"
                name="takeProfitPercentage"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.takeProfitPercentage}
                onChange={handleConfigChange}
                min="1"
                max="100"
                step="0.5"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Max Open Trades</label>
              <input
                type="number"
                name="maxOpenTrades"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.maxOpenTrades}
                onChange={handleConfigChange}
                min="1"
                max="20"
                step="1"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Trading Fee (%)</label>
              <input
                type="number"
                name="feePercentage"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={backtestConfig.feePercentage}
                onChange={handleConfigChange}
                min="0"
                max="5"
                step="0.01"
              />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="enableOptimization"
                  className="mr-2"
                  checked={optimizationConfig.enabled}
                  onChange={handleToggleOptimization}
                />
                <label htmlFor="enableOptimization" className="font-semibold">Parameter Optimization</label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Enable to test multiple parameter combinations and find the optimal settings.
              </p>
              
              {optimizationConfig.enabled && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm font-medium">Parameters to optimize:</p>
                  
                  <div className="pl-2 border-l-2 border-blue-300 dark:border-blue-700">
                    <p className="text-xs mb-1">Trade Size (% of portfolio)</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {optimizationConfig.ranges.tradeSize.map(value => (
                        <span key={value} className="bg-blue-100 dark:bg-blue-800 text-xs px-2 py-1 rounded">
                          {value * 100}%
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pl-2 border-l-2 border-blue-300 dark:border-blue-700">
                    <p className="text-xs mb-1">Stop Loss (%)</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {optimizationConfig.ranges.stopLossPercentage.map(value => (
                        <span key={value} className="bg-blue-100 dark:bg-blue-800 text-xs px-2 py-1 rounded">
                          {value}%
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pl-2 border-l-2 border-blue-300 dark:border-blue-700">
                    <p className="text-xs mb-1">Take Profit (%)</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {optimizationConfig.ranges.takeProfitPercentage.map(value => (
                        <span key={value} className="bg-blue-100 dark:bg-blue-800 text-xs px-2 py-1 rounded">
                          {value}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center"
                onClick={handleRunBacktest}
                disabled={isRunningBacktest}
              >
                {isRunningBacktest ? (
                  <>
                    <FaSyncAlt className="inline mr-2 animate-spin" />
                    {optimizationConfig.enabled ? 'Running Optimization...' : 'Running Backtest...'}
                  </>
                ) : (
                  <>
                    <FaPlayCircle className="inline mr-2" />
                    {optimizationConfig.enabled ? 'Run Parameter Optimization' : 'Run Backtest'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Tab */}
      {activeTab === 'results' && selectedResult && (
        <div ref={resultsSectionRef} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Backtest Results</h2>
              <button
                className="flex items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1 px-3 rounded"
                onClick={handleExportResults}
              >
                <FaDownload className="mr-2" /> Export CSV
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Return</p>
                <p className={`text-2xl font-bold ${selectedResult.metrics?.percentReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedResult.metrics?.percentReturn >= 0 ? '+' : ''}{selectedResult.metrics?.percentReturn?.toFixed(2)}%
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold">{selectedResult.metrics?.winRate?.toFixed(2)}%</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Maximum Drawdown</p>
                <p className="text-2xl font-bold text-red-600">-{selectedResult.metrics?.maxDrawdown?.toFixed(2)}%</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Profit Factor</p>
                <p className="text-2xl font-bold">{selectedResult.metrics?.profitFactor?.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
                <p className="text-xl font-semibold">{selectedResult.metrics?.totalTrades}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Sharpe Ratio</p>
                <p className="text-xl font-semibold">{selectedResult.metrics?.sharpeRatio?.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Equity Curve</h2>
            <div className="h-80">
              <Line data={prepareEquityCurveData()} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Trade Analysis</h2>
            <div className="h-80">
              <Bar data={prepareTradeAnalysisData()} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Trade History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PnL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedResult.trades?.map((trade, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{trade.symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.direction === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.direction === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">${trade.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{trade.quantity.toFixed(4)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">${trade.value.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {trade.pnl ? (
                          <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(trade.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Optimization Tab */}
      {activeTab === 'optimization' && optimizationResults && (
        <div ref={resultsSectionRef} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Optimization Results</h2>
            
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              Below are the top parameter combinations ranked by performance.
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trade Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stop Loss</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Take Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Return</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Win Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Drawdown</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {optimizationResults.results?.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">#{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{(result.params.tradeSize * 100).toFixed(0)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.params.stopLossPercentage}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.params.takeProfitPercentage}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={result.metrics.percentReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {result.metrics.percentReturn >= 0 ? '+' : ''}{result.metrics.percentReturn.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{result.metrics.winRate.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">-{result.metrics.maxDrawdown.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  // Apply the best parameters
                  if (optimizationResults.results && optimizationResults.results.length > 0) {
                    const bestParams = optimizationResults.results[0].params;
                    setBacktestConfig(prev => ({
                      ...prev,
                      tradeSize: bestParams.tradeSize,
                      stopLossPercentage: bestParams.stopLossPercentage,
                      takeProfitPercentage: bestParams.takeProfitPercentage
                    }));
                    setOptimizationConfig(prev => ({
                      ...prev,
                      enabled: false
                    }));
                    setActiveTab('configuration');
                    toast.success('Applied optimal parameters to configuration');
                  }
                }}
              >
                Apply Best Parameters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestingDashboard;
