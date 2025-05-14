'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Divider, 
  Grid, 
  Paper, 
  Tab, 
  Tabs, 
  Typography,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Speed,
  Timeline,
  ShowChart,
  Refresh,
  AccountBalanceWallet
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import logger from '../lib/logger.js';
import HistoricalPerformanceAnalysis from './HistoricalPerformanceAnalysis.js';
import WalletConnectionManager from './WalletConnectionManager.js';

/**
 * Unified Dashboard Component
 * 
 * Provides a comprehensive view of token discovery metrics and trading workflow
 * performance in a single dashboard interface.
 */
const UnifiedDashboard = () => {
  const theme = useTheme();
  
  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('1w');
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const [showWalletManager, setShowWalletManager] = useState(false);
  
  // Portfolio metrics
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalValue: 0,
    solBalance: 0,
    tokensValue: 0,
    allocationDistribution: [],
    valueHistory: [],
    topHoldings: []
  });
  
  // Auto refresh dashboard
  useEffect(() => {
    // Initial data load
    fetchDashboardData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchDashboardData, refreshInterval);
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshInterval, timeRange]);
  
  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      const portfolioData = await fetchPortfolioMetrics();
      setPortfolioMetrics(portfolioData);
    } catch (error) {
      logger.error(`Error fetching dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch portfolio metrics
  const fetchPortfolioMetrics = async () => {
    try {
      // Mock data
      const mockData = {
        totalValue: 24.56,
        solBalance: 15.32,
        tokensValue: 9.24,
        allocationDistribution: [
          { name: 'SOL', value: 15.32, color: '#14F195' },
          { name: 'HAWK', value: 2.15, color: '#9945FF' },
          { name: 'GFI', value: 1.22, color: '#F43FE6' },
          { name: 'PIXEL', value: 1.84, color: '#00C2FF' },
          { name: 'Others', value: 4.03, color: '#787B8E' }
        ],
        valueHistory: [
          { date: '2025-04-20', value: 21.45 },
          { date: '2025-04-21', value: 22.12 },
          { date: '2025-04-22', value: 21.87 },
          { date: '2025-04-23', value: 22.55 },
          { date: '2025-04-24', value: 23.21 },
          { date: '2025-04-25', value: 23.98 },
          { date: '2025-04-26', value: 24.56 }
        ],
        topHoldings: [
          { tokenSymbol: 'SOL', tokenName: 'Solana', amount: 15.32, valueUSD: 1974.68, percentOfPortfolio: 62.38 },
          { tokenSymbol: 'HAWK', tokenName: 'Hawksight', amount: 8754.32, valueUSD: 2.15, percentOfPortfolio: 8.75 },
          { tokenSymbol: 'GFI', tokenName: 'Gari Finance', amount: 684.21, valueUSD: 1.22, percentOfPortfolio: 4.97 },
          { tokenSymbol: 'PIXEL', tokenName: 'Pixel Protocol', amount: 1226.15, valueUSD: 1.84, percentOfPortfolio: 7.49 }
        ]
      };
      
      return mockData;
    } catch (error) {
      logger.error(`Error fetching portfolio metrics: ${error.message}`);
      return {
        totalValue: 0,
        solBalance: 0,
        tokensValue: 0,
        allocationDistribution: [],
        valueHistory: [],
        topHoldings: []
      };
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    fetchDashboardData();
  };
  
  // Token discovery section
  const renderDiscoveryTab = () => {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const fetchTokens = async () => {
        try {
          setLoading(true);
          // Use MCP client to fetch tokens from DEXScreener MCP server
          const response = await fetch('/api/tradeforce/tokens');
          const data = await response.json();
          
          if (data && data.tokens && Array.isArray(data.tokens)) {
            setTokens(data.tokens);
          } else if (data && Array.isArray(data)) {
            setTokens(data);
          } else {
            logger.error('Invalid token data format received');
            setTokens([]);
          }
        } catch (error) {
          logger.error(`Error fetching tokens: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchTokens();
      const interval = setInterval(fetchTokens, 60000); // Refresh every minute
      
      return () => clearInterval(interval);
    }, []);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Token Discovery</Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
          </Box>
        ) : tokens.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255, 193, 7, 0.1)' }}>
            <Typography color="warning.main">
              Scanning for tokens matching your strategy criteria...
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => setLoading(true)}
            >
              Refresh Scan
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {tokens.map((token, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper sx={{ p: 2, height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 6 } }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box 
                      component="img" 
                      src={token.logoURI || '/token-placeholder.png'} 
                      alt={token.symbol}
                      sx={{ width: 32, height: 32, mr: 1, borderRadius: '50%' }}
                    />
                    <Typography variant="h6">{token.symbol}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {token.name}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Price:</Typography>
                    <Typography variant="body2" fontWeight="bold">${token.price.toFixed(6)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">24h Volume:</Typography>
                    <Typography variant="body2" fontWeight="bold">${token.volume24h.toLocaleString()}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">24h Change:</Typography>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold"
                      color={token.priceChangePercent?.h24 > 0 ? 'success.main' : 'error.main'}
                    >
                      {token.priceChangePercent?.h24 > 0 ? '+' : ''}{token.priceChangePercent?.h24.toFixed(2)}%
                    </Typography>
                  </Box>
                  {token.patterns && (
                    <Box mt={1}>
                      {token.patterns.cupAndHandle?.detected && (
                        <Typography variant="body2" color="success.main">
                          Cup and Handle Pattern ({(token.patterns.cupAndHandle.confidence * 100).toFixed(0)}%)
                        </Typography>
                      )}
                      {token.patterns.bullFlag?.detected && (
                        <Typography variant="body2" color="success.main">
                          Bull Flag Pattern ({(token.patterns.bullFlag.confidence * 100).toFixed(0)}%)
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };
  
  // Trading section
  const renderTradingTab = () => {
    const [botActive, setBotActive] = useState(false);
    const [tradingLogs, setTradingLogs] = useState([]);
    
    const startBot = async () => {
      try {
        setBotActive(true);
        // Call the RoundTable AI analysis endpoint
        const response = await fetch('/api/tradeforce/roundTable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ activate: true }),
        });
        
        const result = await response.json();
        
        // Add log entry
        setTradingLogs(prev => [
          {
            timestamp: new Date().toISOString(),
            message: `Bot started: ${result.message || 'RoundTable AI analysis activated'}`,
            type: 'info'
          },
          ...prev
        ]);
        
        // Start polling for bot status and logs
        pollBotStatus();
      } catch (error) {
        logger.error(`Error starting bot: ${error.message}`);
        setBotActive(false);
        
        // Add error log
        setTradingLogs(prev => [
          {
            timestamp: new Date().toISOString(),
            message: `Error: ${error.message}`,
            type: 'error'
          },
          ...prev
        ]);
      }
    };
    
    const stopBot = () => {
      setBotActive(false);
      
      // Add log entry
      setTradingLogs(prev => [
        {
          timestamp: new Date().toISOString(),
          message: 'Bot stopped by user',
          type: 'info'
        },
        ...prev
      ]);
    };
    
    const pollBotStatus = async () => {
      try {
        const response = await fetch('/api/tradeforce/bot');
        const data = await response.json();
        
        if (data.logs && Array.isArray(data.logs)) {
          // Update logs with new entries
          setTradingLogs(prev => {
            const newLogs = data.logs.filter(log => 
              !prev.some(existingLog => 
                existingLog.timestamp === log.timestamp && existingLog.message === log.message
              )
            );
            
            return [...newLogs, ...prev];
          });
        }
        
        // Continue polling if bot is active
        if (botActive) {
          setTimeout(pollBotStatus, 5000);
        }
      } catch (error) {
        logger.error(`Error polling bot status: ${error.message}`);
      }
    };
    
    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    };
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Trading Bot</Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" gutterBottom>RoundTable AI Trading</Typography>
              <Typography variant="body2" color="text.secondary">
                The RoundTable AI trading system uses multiple AI agents to analyze market conditions and execute trades.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              color={botActive ? "error" : "success"}
              size="large"
              onClick={botActive ? stopBot : startBot}
              startIcon={botActive ? <Speed /> : <TrendingUp />}
            >
              {botActive ? "Stop Bot" : "Start Bot"}
            </Button>
          </Box>
          
          {botActive && (
            <Box mt={2} p={1} bgcolor="rgba(76, 175, 80, 0.1)" borderRadius={1}>
              <Typography variant="body2" color="success.main">
                Bot is running - Analyzing market conditions and looking for trading opportunities
              </Typography>
            </Box>
          )}
        </Paper>
        
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Bot Logs</Typography>
          <Box 
            sx={{ 
              height: 300, 
              overflowY: 'auto', 
              bgcolor: 'background.paper', 
              p: 1,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {tradingLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No logs yet. Start the bot to begin trading.
              </Typography>
            ) : (
              tradingLogs.map((log, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    py: 0.5, 
                    borderBottom: index < tradingLogs.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    color: log.type === 'error' ? 'error.main' : 
                           log.type === 'success' ? 'success.main' : 'text.primary'
                  }}
                >
                  <Typography variant="body2" component="span" color="text.secondary">
                    [{formatTimestamp(log.timestamp)}]
                  </Typography>{' '}
                  <Typography variant="body2" component="span">
                    {log.message}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Box>
    );
  };
  
  // Portfolio overview section
  const renderPortfolioTab = () => {
    return (
      <Box>
        {/* Historical Performance Analysis */}
        <Box mb={3}>
          <HistoricalPerformanceAnalysis />
        </Box>
        
        <Grid container spacing={3}>
          {/* Portfolio Value Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Portfolio Value Trend</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioMetrics.valueHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="value" stroke="#9c27b0" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
          
          {/* Portfolio Allocation */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Portfolio Allocation</Typography>
              <Box height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioMetrics.allocationDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {portfolioMetrics.allocationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Market overview section
  const renderMarketTab = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Market Overview</Typography>
        
        <Grid container spacing={3}>
          {/* Market Trends */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>Market Trends</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { date: '2025-04-20', sol: 129.45, btc: 72450, eth: 3560 },
                    { date: '2025-04-21', sol: 131.12, btc: 73200, eth: 3590 },
                    { date: '2025-04-22', sol: 130.87, btc: 72800, eth: 3540 },
                    { date: '2025-04-23', sol: 132.55, btc: 74100, eth: 3620 },
                    { date: '2025-04-24', sol: 135.21, btc: 75300, eth: 3680 },
                    { date: '2025-04-25', sol: 137.98, btc: 76200, eth: 3710 },
                    { date: '2025-04-26', sol: 138.56, btc: 76800, eth: 3750 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="sol" orientation="left" />
                    <YAxis yAxisId="btc" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Line yAxisId="sol" type="monotone" dataKey="sol" name="SOL" stroke="#14F195" strokeWidth={2} />
                    <Line yAxisId="btc" type="monotone" dataKey="btc" name="BTC" stroke="#F7931A" strokeWidth={2} />
                    <Line yAxisId="sol" type="monotone" dataKey="eth" name="ETH" stroke="#627EEA" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
          
          {/* Live TradingView Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>SOL/USD Chart</Typography>
              <Box 
                component="iframe" 
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76555&symbol=SOLUSD&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&hideideas=1&theme=dark&style=1&timezone=exchange&withdateranges=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=&utm_medium=widget&utm_campaign=chart&utm_term=SOLUSD"
                sx={{ width: '100%', height: 300, border: 'none' }}
              />
            </Paper>
          </Grid>
          
          {/* Market News */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Market News</Typography>
              <Box>
                {[
                  { title: 'Solana DeFi TVL reaches new all-time high', date: '2025-04-26', source: 'CryptoNews' },
                  { title: 'New Solana token launch platform gains traction', date: '2025-04-25', source: 'BlockchainInsider' },
                  { title: 'Major upgrade to Solana network improves transaction speeds', date: '2025-04-24', source: 'CoinDesk' }
                ].map((news, index) => (
                  <Box key={index} sx={{ py: 1, borderBottom: index < 2 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="body1">{news.title}</Typography>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{news.source}</Typography>
                      <Typography variant="body2" color="text.secondary">{news.date}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">TradeForce Dashboard</Typography>
        <Box display="flex" alignItems="center">
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => fetchDashboardData()}
            startIcon={<Refresh />}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AccountBalanceWallet />}
            onClick={() => setShowWalletManager(!showWalletManager)}
          >
            Wallet
          </Button>
        </Box>
      </Box>
      
      {/* Wallet Manager Popup */}
      {showWalletManager && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: '70px', 
            right: '20px', 
            zIndex: 1000,
            width: '350px',
            maxWidth: '90vw'
          }}
        >
          <WalletConnectionManager />
        </Box>
      )}
      
      {/* Time Range Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant={timeRange === '1w' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('1w')}
          sx={{ mx: 0.5 }}
        >
          1W
        </Button>
        <Button 
          variant={timeRange === '1m' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('1m')}
          sx={{ mx: 0.5 }}
        >
          1M
        </Button>
        <Button 
          variant={timeRange === '3m' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('3m')}
          sx={{ mx: 0.5 }}
        >
          3M
        </Button>
        <Button 
          variant={timeRange === 'all' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('all')}
          sx={{ mx: 0.5 }}
        >
          All
        </Button>
      </Box>
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Discovery" />
          <Tab label="Trading" />
          <Tab label="Portfolio" />
          <Tab label="Market" />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 && renderDiscoveryTab()}
          {activeTab === 1 && renderTradingTab()}
          {activeTab === 2 && renderPortfolioTab()}
          {activeTab === 3 && renderMarketTab()}
        </>
      )}
    </Box>
  );
};

export default UnifiedDashboard;
