'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { format } from 'date-fns';
import logger from '../lib/logger';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * PnLTracking Component
 * 
 * Implements PnL (Profit and Loss) tracking and visualization:
 * - Logs and stores trade execution results
 * - Calculates realized and unrealized PnL
 * - Provides visual representation of trading performance
 * - Supports portfolio performance tracking
 */
const PnLTracking = ({ wallet, trades = [] }) => {
  // State for PnL data
  const [pnlData, setPnlData] = useState([]);
  const [timeframe, setTimeframe] = useState('daily');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [stats, setStats] = useState({
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    bestTrade: 0,
    worstTrade: 0,
    netDeposits: 0
  });
  
  // Initialize with sample data for demonstration
  // In a real implementation, this would load from persistent storage
  useEffect(() => {
    const sampleData = generateSampleData();
    setPnlData(sampleData);
    calculateStats(sampleData);
  }, []);
  
  // Calculate statistics based on PnL data
  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        netDeposits: 0
      });
      return;
    }
    
    const realizedTrades = data.filter(item => item.realized);
    const unrealizedTrades = data.filter(item => !item.realized);
    
    const realizedPnl = realizedTrades.reduce((sum, item) => sum + item.pnl, 0);
    const unrealizedPnl = unrealizedTrades.reduce((sum, item) => sum + item.pnl, 0);
    
    const winningTrades = realizedTrades.filter(item => item.pnl > 0);
    const losingTrades = realizedTrades.filter(item => item.pnl < 0);
    
    const winRate = realizedTrades.length > 0 
      ? (winningTrades.length / realizedTrades.length) * 100
      : 0;
      
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, item) => sum + item.pnl, 0) / winningTrades.length
      : 0;
      
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, item) => sum + item.pnl, 0) / losingTrades.length
      : 0;
      
    const bestTrade = realizedTrades.length > 0
      ? Math.max(...realizedTrades.map(item => item.pnl))
      : 0;
      
    const worstTrade = realizedTrades.length > 0
      ? Math.min(...realizedTrades.map(item => item.pnl))
      : 0;
      
    const deposits = data
      .filter(item => item.type === 'deposit')
      .reduce((sum, item) => sum + item.amount, 0);
      
    const withdrawals = data
      .filter(item => item.type === 'withdrawal')
      .reduce((sum, item) => sum + item.amount, 0);
    
    setStats({
      realizedPnl,
      unrealizedPnl,
      totalPnl: realizedPnl + unrealizedPnl,
      winRate,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      netDeposits: deposits - withdrawals
    });
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Generate sample data for demonstration
  const generateSampleData = () => {
    // Create 30 days of sample data
    const today = new Date();
    const data = [];
    let cumulative = 0;
    
    for (let i = 30; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Realized trades (completed)
      const dailyTradeCount = 1 + Math.floor(Math.random() * 4); // 1-4 trades per day
      
      for (let j = 0; j < dailyTradeCount; j++) {
        const pnl = (Math.random() * 2 - 0.8) * 50; // Random PnL between -40 and +100
        cumulative += pnl;
        
        data.push({
          id: `trade-${i}-${j}`,
          date: date.toISOString(),
          token: ['SOL', 'RAY', 'JUP', 'BONK'][Math.floor(Math.random() * 4)],
          type: 'trade',
          side: pnl > 0 ? 'buy' : 'sell',
          amount: Math.random() * 10 + 1,
          price: Math.random() * 100 + 10,
          pnl,
          realized: true,
          cumulativePnl: cumulative
        });
      }
      
      // Add occasional deposits/withdrawals
      if (i % 7 === 0) {
        const amount = (Math.random() * 200 + 100) * (Math.random() > 0.7 ? -1 : 1);
        const isDeposit = amount > 0;
        
        data.push({
          id: `capital-${i}`,
          date: date.toISOString(),
          type: isDeposit ? 'deposit' : 'withdrawal',
          amount: Math.abs(amount),
          pnl: 0,
          realized: true
        });
      }
    }
    
    // Add a few unrealized (open) positions
    const openPositions = ['SOL', 'JUP'];
    openPositions.forEach((token, idx) => {
      const pnl = (Math.random() * 2 - 0.5) * 30; // Random unrealized PnL
      
      data.push({
        id: `open-${idx}`,
        date: new Date().toISOString(),
        token,
        type: 'trade',
        side: 'buy',
        amount: Math.random() * 5 + 1,
        price: Math.random() * 100 + 10,
        pnl,
        realized: false
      });
    });
    
    return data;
  };
  
  // Add a new trade to PnL tracking
  const addTrade = (trade) => {
    // Validate trade data
    if (!trade || !trade.token || !trade.amount) {
      logger.error('Invalid trade data for PnL tracking');
      return;
    }
    
    const newTrade = {
      id: `trade-${Date.now()}`,
      date: new Date().toISOString(),
      token: trade.token,
      type: 'trade',
      side: trade.side || 'buy',
      amount: trade.amount,
      price: trade.price,
      pnl: trade.pnl || 0,
      realized: trade.realized || false
    };
    
    setPnlData(prev => {
      const updated = [...prev, newTrade];
      calculateStats(updated);
      return updated;
    });
    
    logger.info(`Added trade to PnL tracking: ${trade.token} ${trade.amount}`);
  };
  
  // Update unrealized PnL based on current prices
  const updateUnrealizedPnl = (currentPrices) => {
    if (!currentPrices) return;
    
    setPnlData(prev => {
      const updated = prev.map(item => {
        if (item.realized || item.type !== 'trade') return item;
        
        // Update unrealized PnL based on current price
        const currentPrice = currentPrices[item.token];
        if (!currentPrice) return item;
        
        const entryValue = item.amount * item.price;
        const currentValue = item.amount * currentPrice;
        const updatedPnl = item.side === 'buy' 
          ? currentValue - entryValue 
          : entryValue - currentValue;
        
        return {
          ...item,
          pnl: updatedPnl
        };
      });
      
      calculateStats(updated);
      return updated;
    });
  };
  
  // Sort PnL data
  const sortedPnlData = useMemo(() => {
    if (!pnlData.length) return [];
    
    return [...pnlData].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return sortDirection === 'asc' 
            ? new Date(a.date) - new Date(b.date) 
            : new Date(b.date) - new Date(a.date);
        case 'token':
          return sortDirection === 'asc'
            ? a.token?.localeCompare(b.token)
            : b.token?.localeCompare(a.token);
        case 'pnl':
          return sortDirection === 'asc'
            ? a.pnl - b.pnl
            : b.pnl - a.pnl;
        default:
          return sortDirection === 'asc'
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date);
      }
    });
  }, [pnlData, sortBy, sortDirection]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!pnlData.length) return null;
    
    // Filter only trades with realized PnL
    const trades = pnlData.filter(item => item.type === 'trade' && item.realized);
    if (!trades.length) return null;
    
    // Group by timeframe
    const groupByDate = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.date);
      let key;
      
      switch (timeframe) {
        case 'hourly':
          key = format(date, 'yyyy-MM-dd HH:00');
          break;
        case 'daily':
          key = format(date, 'yyyy-MM-dd');
          break;
        case 'weekly':
          key = format(date, 'yyyy-[W]II');
          break;
        case 'monthly':
          key = format(date, 'yyyy-MM');
          break;
        default:
          key = format(date, 'yyyy-MM-dd');
      }
      
      groupByDate[key] = groupByDate[key] || { pnl: 0, cumulativePnl: 0 };
      groupByDate[key].pnl += trade.pnl;
      groupByDate[key].date = date;
    });
    
    // Sort by date
    const sortedDates = Object.keys(groupByDate).sort();
    
    // Calculate cumulative PnL
    let cumulative = 0;
    sortedDates.forEach(key => {
      cumulative += groupByDate[key].pnl;
      groupByDate[key].cumulativePnl = cumulative;
    });
    
    return {
      labels: sortedDates.map(key => {
        switch (timeframe) {
          case 'hourly':
            return format(groupByDate[key].date, 'HH:00');
          case 'daily':
            return format(groupByDate[key].date, 'MMM dd');
          case 'weekly':
            return `Week ${format(groupByDate[key].date, 'w')}`;
          case 'monthly':
            return format(groupByDate[key].date, 'MMM yyyy');
          default:
            return format(groupByDate[key].date, 'MMM dd');
        }
      }),
      datasets: [
        {
          label: 'Period PnL',
          data: sortedDates.map(key => groupByDate[key].pnl),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgba(53, 162, 235, 1)',
        },
        {
          label: 'Cumulative PnL',
          data: sortedDates.map(key => groupByDate[key].cumulativePnl),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderDash: [5, 5],
        }
      ]
    };
  }, [pnlData, timeframe]);
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Trading Performance',
      },
    },
  };
  
  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc'); // Default to descending
    }
  };
  
  return (
    <div className="grid grid-cols-1 gap-6 w-full max-w-6xl mx-auto">
      {/* Performance Summary */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-5">
        <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Realized PnL</h3>
            <p className={`text-lg font-semibold ${stats.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.realizedPnl)}
            </p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Unrealized PnL</h3>
            <p className={`text-lg font-semibold ${stats.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.unrealizedPnl)}
            </p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Total PnL</h3>
            <p className={`text-lg font-semibold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.totalPnl)}
            </p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Win Rate</h3>
            <p className="text-lg font-semibold">{stats.winRate.toFixed(1)}%</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Avg Win</h3>
            <p className="text-lg font-semibold text-green-400">{formatCurrency(stats.avgWin)}</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Avg Loss</h3>
            <p className="text-lg font-semibold text-red-400">{formatCurrency(stats.avgLoss)}</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Best Trade</h3>
            <p className="text-lg font-semibold text-green-400">{formatCurrency(stats.bestTrade)}</p>
          </div>
          
          <div className="bg-gray-700 p-3 rounded-lg">
            <h3 className="text-sm text-gray-400">Worst Trade</h3>
            <p className="text-lg font-semibold text-red-400">{formatCurrency(stats.worstTrade)}</p>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">PnL Chart</h2>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setTimeframe('hourly')} 
              className={`px-3 py-1 rounded text-sm ${timeframe === 'hourly' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Hourly
            </button>
            <button 
              onClick={() => setTimeframe('daily')} 
              className={`px-3 py-1 rounded text-sm ${timeframe === 'daily' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Daily
            </button>
            <button 
              onClick={() => setTimeframe('weekly')} 
              className={`px-3 py-1 rounded text-sm ${timeframe === 'weekly' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setTimeframe('monthly')} 
              className={`px-3 py-1 rounded text-sm ${timeframe === 'monthly' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Monthly
            </button>
          </div>
        </div>
        
        <div className="h-72">
          {chartData ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No PnL data available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Trade History */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-5 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">Trade History</h2>
        
        {sortedPnlData.length > 0 ? (
          <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-600">
              <tr>
                <th 
                  className="px-4 py-3 text-left cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    <span>Date</span>
                    {sortBy === 'date' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer"
                  onClick={() => handleSort('token')}
                >
                  <div className="flex items-center">
                    <span>Token</span>
                    {sortBy === 'token' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Side</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th 
                  className="px-4 py-3 text-right cursor-pointer"
                  onClick={() => handleSort('pnl')}
                >
                  <div className="flex items-center justify-end">
                    <span>PnL</span>
                    {sortBy === 'pnl' && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedPnlData.map((item) => (
                <tr key={item.id} className="border-t border-gray-600 hover:bg-gray-650">
                  <td className="px-4 py-3">
                    {format(new Date(item.date), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 uppercase">
                    {item.type === 'trade' ? item.token : '-'}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {item.type}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {item.side || (item.type === 'deposit' ? 'in' : item.type === 'withdrawal' ? 'out' : '-')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.amount ? item.amount.toFixed(4) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.price ? formatCurrency(item.price) : '-'}
                  </td>
                  <td className={`px-4 py-3 text-right ${item.pnl > 0 ? 'text-green-400' : item.pnl < 0 ? 'text-red-400' : ''}`}>
                    {item.type === 'trade' ? formatCurrency(item.pnl) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.type === 'trade' ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${item.realized ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                        {item.realized ? 'Closed' : 'Open'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-900 text-blue-300">
                        {item.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="bg-gray-700 rounded p-4 text-center">
            <p>No trade history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PnLTracking;
