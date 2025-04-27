'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { FaTrophy, FaChartLine, FaExchangeAlt, FaPercentage, FaFilter, FaDownload } from 'react-icons/fa';

/**
 * Win-Rate Monitor Component
 * 
 * A comprehensive dashboard for tracking trading performance with a focus on win rate
 * and profitability metrics. Features interactive charts and detailed trade history.
 */
const WinRateMonitor = ({ platform = 'all' }) => {
  const [tradeHistory, setTradeHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    winRate: 0,
    totalPnL: 0,
    totalTrades: 0,
    avgReturn: 0,
    winningTrades: 0,
    losingTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    profitFactor: 0,
    sharpeRatio: 0
  });
  
  // Fetch trade history from storage or API
  const fetchTradeHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from an API or storage
      // For now, we'll use mock data
      const mockTradeHistory = generateMockTradeHistory();
      
      setTradeHistory(mockTradeHistory);
      
      // Apply timeframe filter
      const filtered = filterTradesByTimeframe(mockTradeHistory, timeframe);
      setFilteredHistory(filtered);
      
      // Calculate metrics
      calculateMetrics(filtered);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching trade history:', error);
      setError('Failed to load trade history. Please try again.');
      setIsLoading(false);
    }
  }, [timeframe]);
  
  // Generate mock trade history for demonstration
  const generateMockTradeHistory = () => {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'ADA/USD'];
    const platforms = ['robinhood', 'kraken', 'axiom'];
    const history = [];
    
    // Generate 100 mock trades over the past 30 days
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const entryPrice = 100 + Math.random() * 900;
      const exitPrice = entryPrice * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
      const amount = 0.1 + Math.random() * 0.9;
      const pnl = side === 'buy' 
        ? (exitPrice - entryPrice) * amount
        : (entryPrice - exitPrice) * amount;
      
      history.push({
        id: `trade_${i}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side,
        entryPrice,
        exitPrice,
        amount,
        pnl,
        pnlPercentage: (pnl / (entryPrice * amount)) * 100,
        timestamp: date.toISOString(),
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        status: 'closed'
      });
    }
    
    // Sort by timestamp, newest first
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };
  
  // Filter trades by timeframe
  const filterTradesByTimeframe = (trades, timeframe) => {
    if (timeframe === 'all') return trades;
    
    const now = new Date();
    let cutoff = new Date(now);
    
    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return trades;
    }
    
    // Filter trades by platform if specified
    let filtered = trades.filter(trade => new Date(trade.timestamp) >= cutoff);
    
    if (platform !== 'all') {
      filtered = filtered.filter(trade => trade.platform === platform);
    }
    
    return filtered;
  };
  
  // Calculate trading metrics
  const calculateMetrics = (trades) => {
    // Basic metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    
    // Advanced metrics
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
      : 0;
      
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length)
      : 0;
      
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(trade => trade.pnl))
      : 0;
      
    const largestLoss = losingTrades.length > 0 
      ? Math.abs(Math.min(...losingTrades.map(trade => trade.pnl)))
      : 0;
      
    const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // Calculate average return percentage
    const avgReturn = totalTrades > 0 
      ? trades.reduce((sum, trade) => sum + trade.pnlPercentage, 0) / totalTrades
      : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(trade => trade.pnlPercentage);
    const meanReturn = returns.length > 0 ? returns.reduce((sum, ret) => sum + ret, 0) / returns.length : 0;
    const stdDev = returns.length > 0 
      ? Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length)
      : 1;
    const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
    
    // Update metrics state
    setMetrics({
      winRate,
      totalPnL,
      totalTrades,
      avgReturn,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      sharpeRatio
    });
  };
  
  // Prepare data for win rate over time chart
  const prepareWinRateChartData = () => {
    if (filteredHistory.length === 0) return [];
    
    // Group trades by day
    const tradesByDay = {};
    
    filteredHistory.forEach(trade => {
      const date = new Date(trade.timestamp).toISOString().split('T')[0];
      
      if (!tradesByDay[date]) {
        tradesByDay[date] = {
          date,
          totalTrades: 0,
          winningTrades: 0,
          winRate: 0
        };
      }
      
      tradesByDay[date].totalTrades++;
      if (trade.pnl > 0) {
        tradesByDay[date].winningTrades++;
      }
    });
    
    // Calculate win rate for each day
    Object.values(tradesByDay).forEach(day => {
      day.winRate = (day.winningTrades / day.totalTrades) * 100;
    });
    
    // Convert to array and sort by date
    return Object.values(tradesByDay).sort((a, b) => a.date.localeCompare(b.date));
  };
  
  // Prepare data for cumulative PnL chart
  const prepareCumulativePnLChartData = () => {
    if (filteredHistory.length === 0) return [];
    
    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...filteredHistory].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Calculate cumulative PnL
    let cumulativePnL = 0;
    return sortedTrades.map(trade => {
      cumulativePnL += trade.pnl;
      return {
        timestamp: new Date(trade.timestamp).toISOString().split('T')[0],
        pnl: trade.pnl,
        cumulativePnL
      };
    });
  };
  
  // Prepare data for PnL distribution chart
  const preparePnLDistributionChartData = () => {
    if (filteredHistory.length === 0) return [];
    
    // Group PnL into buckets
    const buckets = {};
    const bucketSize = 50; // $50 buckets
    
    filteredHistory.forEach(trade => {
      const bucketIndex = Math.floor(trade.pnl / bucketSize);
      const bucketName = `${bucketIndex * bucketSize} to ${(bucketIndex + 1) * bucketSize}`;
      
      if (!buckets[bucketName]) {
        buckets[bucketName] = {
          range: bucketName,
          count: 0,
          totalPnL: 0
        };
      }
      
      buckets[bucketName].count++;
      buckets[bucketName].totalPnL += trade.pnl;
    });
    
    // Convert to array and sort by bucket range
    return Object.values(buckets).sort((a, b) => {
      const aMin = parseInt(a.range.split(' to ')[0]);
      const bMin = parseInt(b.range.split(' to ')[0]);
      return aMin - bMin;
    });
  };
  
  // Export trade history as CSV
  const exportTradeHistory = () => {
    // Create CSV content
    const headers = ['ID', 'Symbol', 'Side', 'Entry Price', 'Exit Price', 'Amount', 'PnL', 'PnL %', 'Timestamp', 'Platform', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredHistory.map(trade => [
        trade.id,
        trade.symbol,
        trade.side,
        trade.entryPrice.toFixed(2),
        trade.exitPrice.toFixed(2),
        trade.amount.toFixed(2),
        trade.pnl.toFixed(2),
        trade.pnlPercentage.toFixed(2),
        trade.timestamp,
        trade.platform,
        trade.status
      ].join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_history_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Fetch trade history on component mount and when timeframe changes
  useEffect(() => {
    fetchTradeHistory();
  }, [fetchTradeHistory, timeframe, platform]);
  
  // Metric Card component
  const MetricCard = ({ title, value, icon, color, tooltip }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg shadow-lg" title={tooltip}>
      <div className="flex items-center mb-2">
        <div className={`text-${color}-500 mr-2`}>
          {icon === 'trophy' && <FaTrophy />}
          {icon === 'chart-line' && <FaChartLine />}
          {icon === 'exchange' && <FaExchangeAlt />}
          {icon === 'percentage' && <FaPercentage />}
        </div>
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
  
  // Loading state
  if (isLoading) {
    return (
      <div className="win-rate-monitor bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg min-h-screen flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white mt-4">Loading trading performance data...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="win-rate-monitor bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg min-h-screen flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">Error: {error}</div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={fetchTradeHistory}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="win-rate-monitor bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Trading Performance</h2>
        
        <div className="flex space-x-2">
          {/* Timeframe selector */}
          <div className="relative">
            <select
              className="bg-gray-800 text-white px-4 py-2 rounded-lg appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white pointer-events-none">
              <FaFilter />
            </div>
          </div>
          
          {/* Export button */}
          <button
            className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-700"
            onClick={exportTradeHistory}
          >
            <FaDownload className="mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Key metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Win Rate" 
          value={`${metrics.winRate.toFixed(1)}%`} 
          icon="trophy" 
          color="green"
          tooltip="Percentage of trades that resulted in profit" 
        />
        <MetricCard 
          title="Total PnL" 
          value={`$${metrics.totalPnL.toFixed(2)}`} 
          icon="chart-line" 
          color={metrics.totalPnL >= 0 ? "green" : "red"}
          tooltip="Total profit and loss across all trades" 
        />
        <MetricCard 
          title="Total Trades" 
          value={metrics.totalTrades} 
          icon="exchange" 
          color="blue"
          tooltip="Number of trades executed" 
        />
        <MetricCard 
          title="Avg. Return" 
          value={`${metrics.avgReturn.toFixed(2)}%`} 
          icon="percentage" 
          color={metrics.avgReturn >= 0 ? "green" : "red"}
          tooltip="Average percentage return per trade" 
        />
      </div>
      
      {/* Win rate chart */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Win Rate Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={prepareWinRateChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                formatter={(value) => [`${value.toFixed(1)}%`, 'Win Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="winRate" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="totalTrades" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Cumulative PnL chart */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Cumulative PnL</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prepareCumulativePnLChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="timestamp" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
              />
              <defs>
                <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="cumulativePnL" 
                stroke="#10B981" 
                fill="url(#colorPnL)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* PnL distribution chart */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">PnL Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={preparePnLDistributionChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="range" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
                formatter={(value, name) => [
                  name === 'count' ? value : `$${value.toFixed(2)}`, 
                  name === 'count' ? 'Number of Trades' : 'Total PnL'
                ]}
              />
              <Bar dataKey="count" fill="#3B82F6" />
              <Bar dataKey="totalPnL" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Advanced metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Win/Loss Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Winning Trades:</span>
              <span className="text-green-500 font-semibold">{metrics.winningTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Losing Trades:</span>
              <span className="text-red-500 font-semibold">{metrics.losingTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Average Win:</span>
              <span className="text-green-500 font-semibold">${metrics.avgWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Average Loss:</span>
              <span className="text-red-500 font-semibold">${metrics.avgLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Risk Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Largest Win:</span>
              <span className="text-green-500 font-semibold">${metrics.largestWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Largest Loss:</span>
              <span className="text-red-500 font-semibold">${metrics.largestLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Profit Factor:</span>
              <span className={`font-semibold ${metrics.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Sharpe Ratio:</span>
              <span className={`font-semibold ${metrics.sharpeRatio >= 1 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.sharpeRatio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Platform Breakdown</h3>
          <div className="space-y-2">
            {['robinhood', 'kraken', 'axiom'].map(plat => {
              const platformTrades = filteredHistory.filter(trade => trade.platform === plat);
              const platformWins = platformTrades.filter(trade => trade.pnl > 0);
              const platformWinRate = platformTrades.length > 0 
                ? (platformWins.length / platformTrades.length) * 100 
                : 0;
              const platformPnL = platformTrades.reduce((sum, trade) => sum + trade.pnl, 0);
              
              return (
                <div key={plat} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-300 capitalize">{plat}:</span>
                    <span className="font-semibold">{platformTrades.length} trades</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className={`font-semibold ${platformWinRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                      {platformWinRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span className="text-gray-400">PnL:</span>
                    <span className={`font-semibold ${platformPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${platformPnL.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Trade history table */}
      <div className="bg-gray-800/50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-2">Trade History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase bg-gray-700 text-gray-300">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Side</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Entry Price</th>
                <th className="px-4 py-2">Exit Price</th>
                <th className="px-4 py-2">PnL</th>
                <th className="px-4 py-2">Platform</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.slice(0, 10).map((trade) => (
                <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-2">{new Date(trade.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{trade.symbol}</td>
                  <td className="px-4 py-2 capitalize">{trade.side}</td>
                  <td className="px-4 py-2">{trade.amount.toFixed(4)}</td>
                  <td className="px-4 py-2">${trade.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-2">${trade.exitPrice.toFixed(2)}</td>
                  <td className={`px-4 py-2 ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${trade.pnl.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 capitalize">{trade.platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredHistory.length > 10 && (
          <div className="mt-4 text-center text-gray-400">
            Showing 10 of {filteredHistory.length} trades. Export to see all.
          </div>
        )}
      </div>
    </div>
  );
};

export default WinRateMonitor;
