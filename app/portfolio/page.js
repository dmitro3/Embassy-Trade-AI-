'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import EmbassyBanner from '../../components/EmbassyBanner';

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [embBalance, setEmbBalance] = useState(0);
  const [pnlStats, setPnlStats] = useState({ day: 0, week: 0, month: 0, all: 0 });
  const [projectedROI, setProjectedROI] = useState({ weekly: 0, monthly: 0, yearly: 0 });
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [hasEmb, setHasEmb] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [winRate, setWinRate] = useState({ daily: 0, weekly: 0, monthly: 0, yearly: 0, overall: 0 });
  const [tradeSummary, setTradeSummary] = useState({ daily: {}, weekly: {}, monthly: {}, yearly: {} });
  // Enhanced mock portfolio data with cost basis and profit/loss information
  const mockTokens = [
    { 
      name: 'Solana', 
      symbol: 'SOL', 
      balance: 5.23, 
      value: 647.38, 
      costBasis: 580.53, 
      pnl: 66.85, 
      pnlPercent: 11.5,
      change24h: 4.2, 
      logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
      purchaseDate: '2024-03-15',
      avgPrice: 111.00,
      currentPrice: 123.78
    },
    { 
      name: 'Jupiter', 
      symbol: 'JUP', 
      balance: 125.5, 
      value: 321.28,
      costBasis: 351.40, 
      pnl: -30.12, 
      pnlPercent: -8.6,
      change24h: -2.1, 
      logo: 'https://cryptologos.cc/logos/jupiter-jup-logo.png',
      purchaseDate: '2024-02-28',
      avgPrice: 2.80,
      currentPrice: 2.56
    },
    { 
      name: 'BONK', 
      symbol: 'BONK', 
      balance: 1250000, 
      value: 187.50,
      costBasis: 150.00, 
      pnl: 37.50, 
      pnlPercent: 25.0, 
      change24h: 12.4, 
      logo: 'https://cryptologos.cc/logos/bonk-bonk-logo.png',
      purchaseDate: '2024-01-10',
      avgPrice: 0.00012,
      currentPrice: 0.00015
    },
    { 
      name: 'Jito', 
      symbol: 'JTO', 
      balance: 42.8, 
      value: 134.82,
      costBasis: 128.40, 
      pnl: 6.42, 
      pnlPercent: 5.0, 
      change24h: 1.8, 
      logo: 'https://cryptologos.cc/logos/jito-jto-logo.png',
      purchaseDate: '2024-03-05',
      avgPrice: 3.00,
      currentPrice: 3.15
    },
    { 
      name: 'Embassy AI', 
      symbol: 'EMB', 
      balance: 150, 
      value: 75.00,
      costBasis: 60.00, 
      pnl: 15.00, 
      pnlPercent: 25.0, 
      change24h: 5.3, 
      logo: '/emb-logo.png',
      purchaseDate: '2024-01-20',
      avgPrice: 0.40,
      currentPrice: 0.50
    }
  ];

  // Mock trade history data with win/loss information
  const mockTradeHistory = [
    { id: 't1', date: '2024-04-22', pair: 'SOL/USD', type: 'BUY', amount: 1.2, price: 123.45, value: 148.14, result: 'win', pnl: 12.53, pnlPercent: 8.4 },
    { id: 't2', date: '2024-04-20', pair: 'JUP/USD', type: 'SELL', amount: 45.0, price: 2.61, value: 117.45, result: 'loss', pnl: -3.15, pnlPercent: -2.7 },
    { id: 't3', date: '2024-04-18', pair: 'BONK/USD', type: 'BUY', amount: 300000, price: 0.00014, value: 42.00, result: 'win', pnl: 3.00, pnlPercent: 7.1 },
    { id: 't4', date: '2024-04-15', pair: 'JTO/USD', type: 'BUY', amount: 10.5, price: 3.05, value: 32.03, result: 'win', pnl: 1.05, pnlPercent: 3.3 },
    { id: 't5', date: '2024-04-12', pair: 'SOL/USD', type: 'SELL', amount: 0.8, price: 118.72, value: 94.98, result: 'win', pnl: 5.44, pnlPercent: 5.7 },
    { id: 't6', date: '2024-04-10', pair: 'JUP/USD', type: 'BUY', amount: 20.0, price: 2.78, value: 55.60, result: 'loss', pnl: -4.40, pnlPercent: -7.9 },
    { id: 't7', date: '2024-04-05', pair: 'BONK/USD', type: 'SELL', amount: 500000, price: 0.00013, value: 65.00, result: 'loss', pnl: -3.50, pnlPercent: -5.4 },
    { id: 't8', date: '2024-04-01', pair: 'SOL/USD', type: 'BUY', amount: 1.5, price: 110.25, value: 165.38, result: 'win', pnl: 20.25, pnlPercent: 12.2 },
    { id: 't9', date: '2024-03-28', pair: 'EMB/USD', type: 'BUY', amount: 75.0, price: 0.40, value: 30.00, result: 'win', pnl: 7.50, pnlPercent: 25.0 },
    { id: 't10', date: '2024-03-25', pair: 'JTO/USD', type: 'SELL', amount: 8.2, price: 2.95, value: 24.19, result: 'loss', pnl: -1.64, pnlPercent: -6.8 }
  ];

  // Calculate mock trade summary data
  const calculateTradeSummary = (trades) => {
    const now = new Date();
    
    // Filter trades for different timeframes
    const dailyTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return (now - tradeDate) < (24 * 60 * 60 * 1000); // Last 24 hours
    });
    
    const weeklyTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return (now - tradeDate) < (7 * 24 * 60 * 60 * 1000); // Last 7 days
    });
    
    const monthlyTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return (now - tradeDate) < (30 * 24 * 60 * 60 * 1000); // Last 30 days
    });
    
    const yearlyTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return (now - tradeDate) < (365 * 24 * 60 * 60 * 1000); // Last 365 days
    });
    
    // Calculate summaries for each timeframe
    const getSummary = (trades) => {
      const totalTrades = trades.length;
      const wins = trades.filter(trade => trade.result === 'win').length;
      const losses = trades.filter(trade => trade.result === 'loss').length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
      const totalVolume = trades.reduce((sum, trade) => sum + trade.value, 0);
      
      return {
        totalTrades,
        wins,
        losses,
        winRate,
        totalPnl,
        totalVolume,
        avgTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
        avgPnlPerTrade: totalTrades > 0 ? totalPnl / totalTrades : 0
      };
    };
    
    return {
      daily: getSummary(dailyTrades),
      weekly: getSummary(weeklyTrades),
      monthly: getSummary(monthlyTrades),
      yearly: getSummary(yearlyTrades),
      overall: getSummary(trades)
    };
  };

  // Calculate projected ROI based on historical performance
  const calculateProjectedROI = (summary) => {
    const { monthly } = summary;
    
    // Calculate monthly ROI rate
    const monthlyROIRate = monthly.totalPnl / totalBalance;
    
    // Project for different timeframes
    return {
      weekly: monthlyROIRate / 4, // Approximate weekly ROI
      monthly: monthlyROIRate,
      yearly: monthlyROIRate * 12 // Annualized ROI
    };
  };

  // Check if user has EMB token from local storage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedHasEmb = localStorage.getItem('hasEmb') === 'true';
      setHasEmb(storedHasEmb);
      
      // Load EMB balance from local storage
      const storedBalance = parseFloat(localStorage.getItem('embBalance')) || 0;
      setEmbBalance(storedBalance);
      
      // Premium users have 100+ EMB
      setIsPremiumUser(storedBalance >= 100);
      
      // Set mock portfolio data
      setPortfolioData(mockTokens);
      
      // Calculate total balance
      const total = mockTokens.reduce((acc, token) => acc + token.value, 0);
      setTotalBalance(total);
      
      // Set mock trade history
      setTradeHistory(mockTradeHistory);
      
      // Calculate trade summary and win rates
      const summary = calculateTradeSummary(mockTradeHistory);
      setTradeSummary(summary);
      
      // Extract win rates
      setWinRate({
        daily: summary.daily.winRate,
        weekly: summary.weekly.winRate,
        monthly: summary.monthly.winRate,
        yearly: summary.yearly.winRate,
        overall: summary.overall.winRate
      });
      
      // Set projected ROI
      const roi = calculateProjectedROI(summary);
      setProjectedROI(roi);
      
      // Set mock PnL statistics
      setPnlStats({
        day: summary.daily.totalPnl,
        week: summary.weekly.totalPnl,
        month: summary.monthly.totalPnl,
        all: mockTokens.reduce((acc, token) => acc + token.pnl, 0)
      });
      
      setIsLoading(false);
    }
  }, []);

  const handleNavLinkClick = (e, path) => {
    if (path !== '/portfolio') {
      e.preventDefault();
      alert('Coming Soon! This feature is under development.');
    }
  };
  // Function to format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Function to format percentage
  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Function to change tab
  const changeTab = (tab) => {
    setSelectedTab(tab);
  };

  // Function to change timeframe
  const changeTimeframe = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  // Calculate the color for profit/loss values
  const getPnLColor = (value) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Beta Banner */}
      <div className="bg-amber-500 text-black p-2 text-center font-medium">
        Beta Mode: Proof of Concept for Solana Early Adopters
      </div>
      
      {/* $EMBAI Migration Banner */}
      <div className="bg-blue-600 text-white p-2 text-center font-medium">
        $EMB will soon migrate to $EMBAI, the official token with full tokenomics and a whitepaper. Stay tuned!
      </div>
      
      {/* Embassy Banner */}
      <EmbassyBanner hasEmb={hasEmb} embBalance={embBalance} isPremium={isPremiumUser} />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Portfolio Dashboard</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : !connected ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="mb-6">Please connect your wallet to view your portfolio details.</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full">
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Balance Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Portfolio Value</h3>
                <p className="text-2xl font-bold mt-2">{formatCurrency(totalBalance)}</p>
                <div className={`text-sm mt-2 ${getPnLColor(pnlStats.day)}`}>
                  {formatPercent(pnlStats.day / totalBalance * 100)} Today
                </div>
              </div>
              
              {/* PNL Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Profit/Loss</h3>
                <p className={`text-2xl font-bold mt-2 ${getPnLColor(pnlStats.all)}`}>{formatCurrency(pnlStats.all)}</p>
                <div className={`text-sm mt-2 ${getPnLColor(pnlStats.all / totalBalance * 100)}`}>
                  {formatPercent(pnlStats.all / totalBalance * 100)} Overall
                </div>
              </div>
              
              {/* Projected ROI Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Projected Annual ROI</h3>
                <p className={`text-2xl font-bold mt-2 ${getPnLColor(projectedROI.yearly * 100)}`}>
                  {formatPercent(projectedROI.yearly * 100)}
                </p>
                <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                  Based on your trading history
                </div>
              </div>
              
              {/* Win Rate Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Overall Win Rate</h3>
                <p className="text-2xl font-bold mt-2">{winRate.overall.toFixed(1)}%</p>
                <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                  {tradeSummary.overall.wins} wins / {tradeSummary.overall.losses} losses
                </div>
              </div>
            </div>
            
            {/* Portfolio Navigation Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="flex space-x-8">
                <button 
                  onClick={() => changeTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'overview' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => changeTab('pnl')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'pnl' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  PNL
                </button>
                <button 
                  onClick={() => changeTab('tokens')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'tokens' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  Tokens
                </button>
                <button 
                  onClick={() => changeTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'history' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  Trade History
                </button>
                <button 
                  onClick={() => changeTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'analytics' 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
                >
                  Analytics
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="mb-8">
              {/* Overview Tab */}
              {selectedTab === 'overview' && (
                <div>
                  {/* Time Period Selector */}
                  <div className="flex mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1">
                    <button 
                      onClick={() => changeTimeframe('day')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        selectedTimeframe === 'day' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Day
                    </button>
                    <button 
                      onClick={() => changeTimeframe('week')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        selectedTimeframe === 'week' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => changeTimeframe('month')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        selectedTimeframe === 'month' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Month
                    </button>
                    <button 
                      onClick={() => changeTimeframe('year')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        selectedTimeframe === 'year' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      Year
                    </button>
                    <button 
                      onClick={() => changeTimeframe('all')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        selectedTimeframe === 'all' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                  
                  {/* Dashboard Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Asset Allocation */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
                      <div className="space-y-4">
                        {portfolioData.map((token) => (
                          <div key={token.symbol} className="flex items-center">
                            <div 
                              className={`w-2 h-full rounded-full mr-2`}
                              style={{ 
                                backgroundColor: 
                                  token.symbol === 'SOL' ? '#00FFA3' : 
                                  token.symbol === 'JUP' ? '#9945FF' :
                                  token.symbol === 'BONK' ? '#F5B300' :
                                  token.symbol === 'JTO' ? '#3F77FF' :
                                  '#FF5A5A' 
                              }}
                            ></div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{token.symbol}</span>
                                <span>{((token.value / totalBalance) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    width: `${(token.value / totalBalance) * 100}%`,
                                    backgroundColor: 
                                      token.symbol === 'SOL' ? '#00FFA3' : 
                                      token.symbol === 'JUP' ? '#9945FF' :
                                      token.symbol === 'BONK' ? '#F5B300' :
                                      token.symbol === 'JTO' ? '#3F77FF' :
                                      '#FF5A5A'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Middle Column - Performance Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
                      <div className="space-y-6">
                        {/* Period PNL */}
                        <div>
                          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span>Period P&L</span>
                            <span>{selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Profit/Loss</span>
                            <span className={`font-medium ${getPnLColor(pnlStats[selectedTimeframe === 'year' ? 'month' : selectedTimeframe])}`}>
                              {formatCurrency(pnlStats[selectedTimeframe === 'year' ? 'month' : selectedTimeframe])}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">As Percentage</span>
                            <span className={`font-medium ${getPnLColor(pnlStats[selectedTimeframe === 'year' ? 'month' : selectedTimeframe] / totalBalance * 100)}`}>
                              {formatPercent(pnlStats[selectedTimeframe === 'year' ? 'month' : selectedTimeframe] / totalBalance * 100)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Win Rate */}
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Win Rate</div>
                          <div className="flex justify-between">
                            <span className="font-medium">Successful Trades</span>
                            <span className="font-medium">
                              {selectedTimeframe === 'day' ? tradeSummary.daily.wins : 
                               selectedTimeframe === 'week' ? tradeSummary.weekly.wins :
                               selectedTimeframe === 'month' ? tradeSummary.monthly.wins :
                               selectedTimeframe === 'year' ? tradeSummary.yearly.wins :
                               tradeSummary.overall.wins}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">Total Trades</span>
                            <span className="font-medium">
                              {selectedTimeframe === 'day' ? tradeSummary.daily.totalTrades : 
                               selectedTimeframe === 'week' ? tradeSummary.weekly.totalTrades :
                               selectedTimeframe === 'month' ? tradeSummary.monthly.totalTrades :
                               selectedTimeframe === 'year' ? tradeSummary.yearly.totalTrades :
                               tradeSummary.overall.totalTrades}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">Win Percentage</span>
                            <span className="font-medium">
                              {selectedTimeframe === 'day' ? winRate.daily.toFixed(1) : 
                               selectedTimeframe === 'week' ? winRate.weekly.toFixed(1) :
                               selectedTimeframe === 'month' ? winRate.monthly.toFixed(1) :
                               selectedTimeframe === 'year' ? winRate.yearly.toFixed(1) :
                               winRate.overall.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Projected ROI */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <h3 className="text-lg font-semibold mb-4">Projected Returns</h3>
                      <div className="space-y-6">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Based on your trading history</div>
                          <div className="flex justify-between">
                            <span className="font-medium">Weekly ROI</span>
                            <span className={`font-medium ${getPnLColor(projectedROI.weekly * 100)}`}>
                              {formatPercent(projectedROI.weekly * 100)}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">Monthly ROI</span>
                            <span className={`font-medium ${getPnLColor(projectedROI.monthly * 100)}`}>
                              {formatPercent(projectedROI.monthly * 100)}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">Yearly ROI</span>
                            <span className={`font-medium ${getPnLColor(projectedROI.yearly * 100)}`}>
                              {formatPercent(projectedROI.yearly * 100)}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Projected Growth</div>
                          <div className="flex justify-between">
                            <span className="font-medium">In 1 Month</span>
                            <span className="font-medium">
                              {formatCurrency(totalBalance * (1 + projectedROI.monthly))}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">In 6 Months</span>
                            <span className="font-medium">
                              {formatCurrency(totalBalance * (1 + projectedROI.monthly * 6))}
                            </span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="font-medium">In 1 Year</span>
                            <span className="font-medium">
                              {formatCurrency(totalBalance * (1 + projectedROI.yearly))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* PNL Tab */}
              {selectedTab === 'pnl' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-6">Profit & Loss Analysis</h3>
                  
                  {/* PNL time period selector */}
                  <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button 
                      onClick={() => changeTimeframe('day')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'day' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Daily
                    </button>
                    <button 
                      onClick={() => changeTimeframe('week')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'week' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Weekly
                    </button>
                    <button 
                      onClick={() => changeTimeframe('month')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'month' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Monthly
                    </button>
                    <button 
                      onClick={() => changeTimeframe('all')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                  
                  {/* PNL Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total P&L</h4>
                      <p className={`text-2xl font-bold mt-2 ${getPnLColor(pnlStats[selectedTimeframe === 'all' ? 'all' : selectedTimeframe])}`}>
                        {formatCurrency(pnlStats[selectedTimeframe === 'all' ? 'all' : selectedTimeframe])}
                      </p>
                      <p className={`text-sm mt-1 ${getPnLColor(pnlStats[selectedTimeframe === 'all' ? 'all' : selectedTimeframe] / totalBalance * 100)}`}>
                        {formatPercent(pnlStats[selectedTimeframe === 'all' ? 'all' : selectedTimeframe] / totalBalance * 100)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Average Trade P&L</h4>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(
                          selectedTimeframe === 'day' ? tradeSummary.daily.avgPnlPerTrade : 
                          selectedTimeframe === 'week' ? tradeSummary.weekly.avgPnlPerTrade :
                          selectedTimeframe === 'month' ? tradeSummary.monthly.avgPnlPerTrade :
                          tradeSummary.overall.avgPnlPerTrade
                        )}
                      </p>
                      <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                        Per trade average
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Best Performing Asset</h4>
                      <p className="text-2xl font-bold mt-2">
                        {portfolioData.sort((a, b) => b.pnlPercent - a.pnlPercent)[0].symbol}
                      </p>
                      <p className={`text-sm mt-1 ${getPnLColor(portfolioData.sort((a, b) => b.pnlPercent - a.pnlPercent)[0].pnlPercent)}`}>
                        {formatPercent(portfolioData.sort((a, b) => b.pnlPercent - a.pnlPercent)[0].pnlPercent)}
                      </p>
                    </div>
                  </div>
                  
                  {/* PNL by Token Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">PNL by Token</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Token</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cost Basis</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Value</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PNL</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PNL %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {portfolioData.map((token) => (
                            <tr key={token.symbol}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <img className="h-10 w-10 rounded-full" src={token.logo || 'https://via.placeholder.com/40'} alt={token.name} />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium">{token.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                {formatCurrency(token.costBasis)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                {formatCurrency(token.value)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getPnLColor(token.pnl)}`}>
                                {formatCurrency(token.pnl)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getPnLColor(token.pnlPercent)}`}>
                                {formatPercent(token.pnlPercent)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tokens Tab */}
              {selectedTab === 'tokens' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-6">Token Holdings</h3>
                  
                  {/* Token List */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Token</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">24h Change</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {portfolioData.map((token) => (
                          <tr key={token.symbol}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img className="h-10 w-10 rounded-full" src={token.logo || 'https://via.placeholder.com/40'} alt={token.name} />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium">{token.name}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {token.symbol === 'BONK' ? token.balance.toLocaleString() : token.balance.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {formatCurrency(token.currentPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {formatCurrency(token.value)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getPnLColor(token.change24h)}`}>
                              {formatPercent(token.change24h)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                Trade
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Trade History Tab */}
              {selectedTab === 'history' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-6">Trade History</h3>
                  
                  {/* Time Period Filter */}
                  <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button 
                      onClick={() => changeTimeframe('day')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'day' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => changeTimeframe('week')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'week' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      This Week
                    </button>
                    <button 
                      onClick={() => changeTimeframe('month')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'month' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      This Month
                    </button>
                    <button 
                      onClick={() => changeTimeframe('all')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md ${
                        selectedTimeframe === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                  
                  {/* Trade History Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pair</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Result</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">P&L</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {tradeHistory
                          .filter(trade => {
                            if (selectedTimeframe === 'all') return true;
                            const tradeDate = new Date(trade.date);
                            const now = new Date();
                            if (selectedTimeframe === 'day') {
                              return (now - tradeDate) < (24 * 60 * 60 * 1000);
                            } else if (selectedTimeframe === 'week') {
                              return (now - tradeDate) < (7 * 24 * 60 * 60 * 1000);
                            } else if (selectedTimeframe === 'month') {
                              return (now - tradeDate) < (30 * 24 * 60 * 60 * 1000);
                            }
                            return true;
                          })
                          .map((trade) => (
                          <tr key={trade.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {new Date(trade.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {trade.pair}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {trade.pair.includes('BONK') ? trade.amount.toLocaleString() : trade.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {formatCurrency(trade.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              {formatCurrency(trade.value)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                trade.result === 'win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.result.toUpperCase()}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getPnLColor(trade.pnl)}`}>
                              {formatCurrency(trade.pnl)} ({formatPercent(trade.pnlPercent)})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Analytics Tab */}
              {selectedTab === 'analytics' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-6">Trading Analytics</h3>
                  
                  {/* Win Rate Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Today's Win Rate</h4>
                      <p className="text-2xl font-bold mt-2">{winRate.daily.toFixed(1)}%</p>
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full ${winRate.daily >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                          style={{width: `${winRate.daily}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Weekly Win Rate</h4>
                      <p className="text-2xl font-bold mt-2">{winRate.weekly.toFixed(1)}%</p>
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full ${winRate.weekly >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                          style={{width: `${winRate.weekly}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Monthly Win Rate</h4>
                      <p className="text-2xl font-bold mt-2">{winRate.monthly.toFixed(1)}%</p>
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full ${winRate.monthly >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                          style={{width: `${winRate.monthly}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-sm text-gray-500 dark:text-gray-400 font-medium">Overall Win Rate</h4>
                      <p className="text-2xl font-bold mt-2">{winRate.overall.toFixed(1)}%</p>
                      <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                        <div 
                          className={`h-2 rounded-full ${winRate.overall >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{width: `${winRate.overall}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trading Stats Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                      <h4 className="font-semibold mb-4">Trading Performance Summary</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Total Trades</span>
                          <span>{tradeSummary.overall.totalTrades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Winning Trades</span>
                          <span>{tradeSummary.overall.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Losing Trades</span>
                          <span>{tradeSummary.overall.losses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Average Trade Size</span>
                          <span>{formatCurrency(tradeSummary.overall.avgTradeSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Average P&L per Trade</span>
                          <span className={getPnLColor(tradeSummary.overall.avgPnlPerTrade)}>
                            {formatCurrency(tradeSummary.overall.avgPnlPerTrade)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Total Trading Volume</span>
                          <span>{formatCurrency(tradeSummary.overall.totalVolume)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                      <h4 className="font-semibold mb-4">Trade Frequency Analysis</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Daily Average</span>
                            <span>{(tradeSummary.daily.totalTrades || 0).toFixed(1)} trades/day</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full" 
                              style={{width: `${Math.min(100, tradeSummary.daily.totalTrades * 10)}%`}}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Weekly Average</span>
                            <span>{(tradeSummary.weekly.totalTrades / 7 || 0).toFixed(1)} trades/day</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full" 
                              style={{width: `${Math.min(100, (tradeSummary.weekly.totalTrades / 7) * 10)}%`}}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">Monthly Average</span>
                            <span>{(tradeSummary.monthly.totalTrades / 30 || 0).toFixed(1)} trades/day</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full" 
                              style={{width: `${Math.min(100, (tradeSummary.monthly.totalTrades / 30) * 10)}%`}}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between">
                            <span className="font-medium">Best Winning Streak</span>
                            <span>5 trades</span>
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="font-medium">Worst Losing Streak</span>
                            <span>2 trades</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}