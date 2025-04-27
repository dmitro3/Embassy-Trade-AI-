'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Divider, 
  Grid, 
  Paper, 
  Tab, 
  Tabs, 
  Typography,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  MoreVert,
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney,
  Speed,
  BarChart,
  Timeline,
  ShowChart,
  Analytics,
  Tune,
  Visibility,
  Check,
  Warning,
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import tokenDiscoveryMCP from '../mcp/token-discovery-mcp/integration.js';
import logger from '../lib/logger.js';

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
  
  // Token discovery metrics
  const [discoveryMetrics, setDiscoveryMetrics] = useState({
    totalTokensDiscovered: 0,
    highOpportunityTokens: 0,
    lowRiskTokens: 0,
    recentDiscoveries: [],
    opportunityDistribution: [],
    riskDistribution: [],
    sourceDistribution: [],
    discoveryTrend: []
  });
  
  // Trading metrics
  const [tradingMetrics, setTradingMetrics] = useState({
    activeStrategies: 0,
    activePositions: 0,
    totalPnL: 0,
    dailyPnL: 0,
    winRate: 0,
    averageReturn: 0,
    recentTrades: [],
    pnlTrend: [],
    strategyPerformance: [],
    positionSummary: []
  });
  
  // Portfolio metrics
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    totalValue: 0,
    solBalance: 0,
    tokensValue: 0,
    allocationDistribution: [],
    valueHistory: [],
    topHoldings: []
  });
  
  // Market metrics
  const [marketMetrics, setMarketMetrics] = useState({
    totalMarketCap: 0,
    solPrice: 0,
    marketSentiment: 'neutral',
    trendingTokens: [],
    marketTrends: [],
    globalRiskScore: 5
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
      // Fetch data in parallel for better performance
      const [discoveryData, tradingData, portfolioData, marketData] = await Promise.all([
        fetchDiscoveryMetrics(),
        fetchTradingMetrics(),
        fetchPortfolioMetrics(),
        fetchMarketMetrics()
      ]);
      
      setDiscoveryMetrics(discoveryData);
      setTradingMetrics(tradingData);
      setPortfolioMetrics(portfolioData);
      setMarketMetrics(marketData);
    } catch (error) {
      logger.error(`Error fetching dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch token discovery metrics
  const fetchDiscoveryMetrics = async () => {
    try {
      // In a production environment, these would be fetched from your MCP server
      // For now, we'll use mock data that reflects what your API would return
      
      // Simulate API call
      // const response = await tokenDiscoveryMCP.getDashboardMetrics(timeRange);
      
      // Mock data
      const mockData = {
        totalTokensDiscovered: 347,
        highOpportunityTokens: 28,
        lowRiskTokens: 42,
        recentDiscoveries: [
          { timestamp: '2025-04-26T08:30:00Z', tokenSymbol: 'HAWK', tokenName: 'Hawksight', opportunityScore: 87, riskScore: 3, source: 'birdeye' },
          { timestamp: '2025-04-26T07:15:00Z', tokenSymbol: 'PIXEL', tokenName: 'Pixel Protocol', opportunityScore: 79, riskScore: 4, source: 'dexscreener' },
          { timestamp: '2025-04-26T05:45:00Z', tokenSymbol: 'REALM', tokenName: 'Realm Games', opportunityScore: 81, riskScore: 5, source: 'birdeye' },
          { timestamp: '2025-04-26T02:20:00Z', tokenSymbol: 'SHDW', tokenName: 'Shadow Finance', opportunityScore: 75, riskScore: 3, source: 'pumpfun' },
          { timestamp: '2025-04-25T22:10:00Z', tokenSymbol: 'WARP', tokenName: 'Warp Protocol', opportunityScore: 82, riskScore: 4, source: 'birdeye' }
        ],
        opportunityDistribution: [
          { range: '0-20', count: 42 },
          { range: '21-40', count: 78 },
          { range: '41-60', count: 124 },
          { range: '61-80', count: 87 },
          { range: '81-100', count: 16 }
        ],
        riskDistribution: [
          { level: 'Very Low (1-2)', count: 24, color: '#4caf50' },
          { level: 'Low (3-4)', count: 65, color: '#8bc34a' },
          { level: 'Moderate (5-6)', count: 123, color: '#ffc107' },
          { level: 'High (7-8)', count: 86, color: '#ff9800' },
          { level: 'Very High (9-10)', count: 49, color: '#f44336' }
        ],
        sourceDistribution: [
          { name: 'BirdEye', value: 156, color: '#2196f3' },
          { name: 'DexScreener', value: 112, color: '#9c27b0' },
          { name: 'PumpFun', value: 79, color: '#ff9800' }
        ],
        discoveryTrend: [
          { date: '2025-04-20', count: 28 },
          { date: '2025-04-21', count: 35 },
          { date: '2025-04-22', count: 42 },
          { date: '2025-04-23', count: 31 },
          { date: '2025-04-24', count: 45 },
          { date: '2025-04-25', count: 58 },
          { date: '2025-04-26', count: 34 }
        ]
      };
      
      return mockData;
    } catch (error) {
      logger.error(`Error fetching discovery metrics: ${error.message}`);
      return {
        totalTokensDiscovered: 0,
        highOpportunityTokens: 0,
        lowRiskTokens: 0,
        recentDiscoveries: [],
        opportunityDistribution: [],
        riskDistribution: [],
        sourceDistribution: [],
        discoveryTrend: []
      };
    }
  };
  
  // Fetch trading metrics
  const fetchTradingMetrics = async () => {
    try {
      // Mock data - would be fetched from your trading MCP service
      const mockData = {
        activeStrategies: 4,
        activePositions: 7,
        totalPnL: 12.34,
        dailyPnL: 0.87,
        winRate: 64.2,
        averageReturn: 8.7,
        recentTrades: [
          { timestamp: '2025-04-26T09:15:00Z', tokenSymbol: 'HAWK', type: 'buy', amount: 0.5, price: 0.000245, status: 'completed' },
          { timestamp: '2025-04-26T08:32:00Z', tokenSymbol: 'GFI', type: 'sell', amount: 0.3, price: 0.00178, status: 'completed', profit: 0.12 },
          { timestamp: '2025-04-25T22:45:00Z', tokenSymbol: 'PIXEL', type: 'buy', amount: 0.4, price: 0.0015, status: 'completed' },
          { timestamp: '2025-04-25T18:20:00Z', tokenSymbol: 'REALM', type: 'sell', amount: 0.6, price: 0.0022, status: 'completed', profit: -0.08 },
          { timestamp: '2025-04-25T15:10:00Z', tokenSymbol: 'SHDW', type: 'buy', amount: 0.25, price: 0.00075, status: 'completed' }
        ],
        pnlTrend: [
          { date: '2025-04-20', pnl: 1.2 },
          { date: '2025-04-21', pnl: -0.4 },
          { date: '2025-04-22', pnl: 0.8 },
          { date: '2025-04-23', pnl: 1.5 },
          { date: '2025-04-24', pnl: 2.3 },
          { date: '2025-04-25', pnl: -0.7 },
          { date: '2025-04-26', pnl: 0.87 }
        ],
        strategyPerformance: [
          { name: 'High Opportunity Score', winRate: 72, pnl: 4.8, trades: 18, roi: 12.4 },
          { name: 'New Token Sniper', winRate: 58, pnl: 5.2, trades: 12, roi: 18.2 },
          { name: 'Momentum Chaser', winRate: 61, pnl: 2.1, trades: 9, roi: 7.5 },
          { name: 'Whale Tracker', winRate: 45, pnl: 0.24, trades: 6, roi: 2.1 }
        ],
        positionSummary: [
          { tokenSymbol: 'HAWK', entryPrice: 0.000245, currentPrice: 0.000278, pnlPercent: 13.47, pnlValue: 0.17 },
          { tokenSymbol: 'GFI', entryPrice: 0.00187, currentPrice: 0.00163, pnlPercent: -12.83, pnlValue: -0.08 },
          { tokenSymbol: 'PIXEL', entryPrice: 0.0015, currentPrice: 0.00162, pnlPercent: 8.0, pnlValue: 0.05 },
          { tokenSymbol: 'REALM', entryPrice: 0.00215, currentPrice: 0.0024, pnlPercent: 11.63, pnlValue: 0.12 },
          { tokenSymbol: 'SHDW', entryPrice: 0.00075, currentPrice: 0.00077, pnlPercent: 2.67, pnlValue: 0.01 }
        ]
      };
      
      return mockData;
    } catch (error) {
      logger.error(`Error fetching trading metrics: ${error.message}`);
      return {
        activeStrategies: 0,
        activePositions: 0,
        totalPnL: 0,
        dailyPnL: 0,
        winRate: 0,
        averageReturn: 0,
        recentTrades: [],
        pnlTrend: [],
        strategyPerformance: [],
        positionSummary: []
      };
    }
  };
  
  // Fetch portfolio metrics
  const fetchPortfolioMetrics = async () => {
    try {
      // Mock data - would be fetched from your portfolio service
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
  
  // Fetch market metrics
  const fetchMarketMetrics = async () => {
    try {
      // Mock data - would be fetched from your market data service
      const mockData = {
        totalMarketCap: 4.2, // trillion
        solPrice: 128.9,
        marketSentiment: 'bullish',
        trendingTokens: [
          { tokenSymbol: 'HAWK', tokenName: 'Hawksight', priceChangePercent: 12.4 },
          { tokenSymbol: 'BONK', tokenName: 'Bonk', priceChangePercent: 8.2 },
          { tokenSymbol: 'JTO', tokenName: 'Jito', priceChangePercent: 6.8 },
          { tokenSymbol: 'PYTH', tokenName: 'Pyth Network', priceChangePercent: 5.3 },
          { tokenSymbol: 'MEAN', tokenName: 'Mean DAO', priceChangePercent: 4.9 }
        ],
        marketTrends: [
          { date: '2025-04-20', solPrice: 121.4, marketCap: 4.05 },
          { date: '2025-04-21', solPrice: 122.8, marketCap: 4.08 },
          { date: '2025-04-22', solPrice: 124.5, marketCap: 4.11 },
          { date: '2025-04-23', solPrice: 123.7, marketCap: 4.09 },
          { date: '2025-04-24', solPrice: 125.6, marketCap: 4.14 },
          { date: '2025-04-25', solPrice: 127.2, marketCap: 4.17 },
          { date: '2025-04-26', solPrice: 128.9, marketCap: 4.2 }
        ],
        globalRiskScore: 4.2
      };
      
      return mockData;
    } catch (error) {
      logger.error(`Error fetching market metrics: ${error.message}`);
      return {
        totalMarketCap: 0,
        solPrice: 0,
        marketSentiment: 'neutral',
        trendingTokens: [],
        marketTrends: [],
        globalRiskScore: 5
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
  
  // Format number with K/M/B suffix
  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Get color based on value (positive/negative)
  const getValueColor = (value) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };
  
  // Get risk color based on score (0-10)
  const getRiskColor = (score) => {
    if (score <= 3) return '#4caf50';
    if (score <= 6) return '#ff9800';
    return '#f44336';
  };
  
  // Dashboard header with key metrics
  const renderDashboardHeader = () => {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Portfolio Value */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">Portfolio Value</Typography>
              <AttachMoney color="primary" />
            </Box>
            <Box mt={1}>
              <Typography variant="h4">{portfolioMetrics.totalValue.toFixed(2)} SOL</Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: portfolioMetrics.valueHistory.length >= 2 
                    ? getValueColor(portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 1].value - 
                                  portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 2].value)
                    : 'text.secondary'
                }}
              >
                {portfolioMetrics.valueHistory.length >= 2 && (
                  portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 1].value > 
                  portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 2].value
                    ? <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                    : <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                )}
                {portfolioMetrics.valueHistory.length >= 2
                  ? ((portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 1].value - 
                     portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 2].value) /
                     portfolioMetrics.valueHistory[portfolioMetrics.valueHistory.length - 2].value * 100).toFixed(2) + '% today'
                  : '0% change'
                }
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Total P&L */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">Total P&L</Typography>
              <ShowChart color="primary" />
            </Box>
            <Box mt={1}>
              <Typography 
                variant="h4" 
                color={getValueColor(tradingMetrics.totalPnL)}
              >
                {tradingMetrics.totalPnL >= 0 ? '+' : ''}{tradingMetrics.totalPnL.toFixed(2)} SOL
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: getValueColor(tradingMetrics.dailyPnL)
                }}
              >
                {tradingMetrics.dailyPnL >= 0 
                  ? <TrendingUp fontSize="small" sx={{ mr: 0.5 }} /> 
                  : <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                }
                {tradingMetrics.dailyPnL >= 0 ? '+' : ''}{tradingMetrics.dailyPnL.toFixed(2)} SOL today
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Win Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">Win Rate</Typography>
              <Timeline color="primary" />
            </Box>
            <Box mt={1}>
              <Typography variant="h4">{tradingMetrics.winRate.toFixed(1)}%</Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                {tradingMetrics.activePositions} active positions
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Market Sentiment */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">Market Sentiment</Typography>
              <Speed color="primary" />
            </Box>
            <Box mt={1}>
              <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
                {marketMetrics.marketSentiment}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: marketMetrics.solPrice >= 120 ? 'success.main' : 'text.secondary'
                }}
              >
                SOL: ${marketMetrics.solPrice.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  // Token discovery overview section
  const renderDiscoveryOverview = () => {
    return (
      <Grid container spacing={3}>
        {/* Discovery Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Discovery Overview</Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4">{discoveryMetrics.totalTokensDiscovered}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Tokens</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">{discoveryMetrics.highOpportunityTokens}</Typography>
                  <Typography variant="body2" color="text.secondary">High Opp.</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">{discoveryMetrics.lowRiskTokens}</Typography>
                  <Typography variant="body2" color="text.secondary">Low Risk</Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>Recent Discoveries</Typography>
            {discoveryMetrics.recentDiscoveries.slice(0, 4).map((token, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 1,
                  py: 0.5,
                  borderBottom: index < 3 ? `1px solid ${theme.palette.divider}` : 'none'
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {token.tokenSymbol}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {token.tokenName}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Chip 
                    label={`Opp: ${token.opportunityScore}`} 
                    size="small"
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    label={`Risk: ${token.riskScore}`}
                    size="small"
                    sx={{ 
                      bgcolor: getRiskColor(token.riskScore),
                      color: 'white'
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
        
        {/* Discovery Trend Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Discovery Trend</Typography>
            <Box height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={discoveryMetrics.discoveryTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="count" stroke="#2196f3" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>Source Distribution</Typography>
            <Box height={150}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={discoveryMetrics.sourceDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {discoveryMetrics.sourceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Risk Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Risk Assessment</Typography>
            <Box height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discoveryMetrics.riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count">
                    {discoveryMetrics.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>Opportunity Distribution</Typography>
            <Box height={150}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={discoveryMetrics.opportunityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#2196f3" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  // Trading performance section
  const renderTradingPerformance = () => {
    return (
      <Grid container spacing={3} mt={2}>
        {/* PnL Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>P&L Performance</Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tradingMetrics.pnlTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#4caf50"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Strategy Performance */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Strategy Performance</Typography>
            <Box sx={{ overflowY: 'auto', maxHeight: 300 }}>
              {tradingMetrics.strategyPerformance.map((strategy, index) => (
                <Card 
                  key={index} 
                  variant="outlined" 
                  sx={{ 
                    mb: 1.5, 
                    boxShadow: 'none', 
                    borderLeft: '4px solid', 
                    borderLeftColor: strategy.pnl >= 0 ? '#4caf50' : '#f44336' 
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2">{strategy.name}</Typography>
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Win Rate</Typography>
                        <Typography variant="body2">{strategy.winRate}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">PnL</Typography>
                        <Typography 
                          variant="body2" 
                          color={strategy.pnl >= 0 ? 'success.main' : 'error.main'}
                        >
                          {strategy.pnl >= 0 ? '+' : ''}{strategy.pnl.toFixed(2)} SOL
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Trades</Typography>
                        <Typography variant="body2">{strategy.trades}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">ROI</Typography>
                        <Typography 
                          variant="body2"
                          color={strategy.roi >= 0 ? 'success.main' : 'error.main'}
                        >
                          {strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(1)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Active Positions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Active Positions</Typography>
              <Button size="small" variant="outlined">View All</Button>
            </Box>
            <Grid container spacing={2}>
              {tradingMetrics.positionSummary.map((position, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card variant="outlined" sx={{ boxShadow: 'none' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">{position.tokenSymbol}</Typography>
                        <Typography 
                          variant="body1" 
                          color={position.pnlPercent >= 0 ? 'success.main' : 'error.main'}
                          sx={{ fontWeight: 'medium' }}
                        >
                          {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </Typography>
                      </Box>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Entry</Typography>
                          <Typography variant="body2">${position.entryPrice.toFixed(6)}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Current</Typography>
                          <Typography variant="body2">${position.currentPrice.toFixed(6)}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">P&L</Typography>
                          <Typography 
                            variant="body2" 
                            color={position.pnlValue >= 0 ? 'success.main' : 'error.main'}
                          >
                            {position.pnlValue >= 0 ? '+' : ''}{position.pnlValue.toFixed(2)} SOL
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  // Portfolio overview section
  const renderPortfolioOverview = () => {
    return (
      <Grid container spacing={3} mt={2}>
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
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>Top Holdings</Typography>
            {portfolioMetrics.topHoldings.slice(0, 4).map((holding, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 1,
                  py: 0.5,
                  borderBottom: index < 3 ? `1px solid ${theme.palette.divider}` : 'none'
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {holding.tokenSymbol}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {holding.amount.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">${holding.valueUSD.toFixed(2)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right' }}>
                    {holding.percentOfPortfolio.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  // Market overview section
  const renderMarketOverview = () => {
    return (
      <Grid container spacing={3} mt={2}>
        {/* Market Trends */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Market Trends</Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marketMetrics.marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#2196f3" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f44336" />
                  <RechartsTooltip />
                  <Line yAxisId="left" type="monotone" dataKey="solPrice" stroke="#2196f3" name="SOL Price ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="marketCap" stroke="#f44336" name="Market Cap (T)" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        {/* Trending Tokens */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Trending Tokens</Typography>
            {marketMetrics.trendingTokens.map((token, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 1.5,
                  py: 0.5,
                  borderBottom: index < marketMetrics.trendingTokens.length - 1 ? `1px solid ${theme.palette.divider}` : 'none'
                }}
              >
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 500, mr: 1 }}>
                    {index + 1}.
                  </Typography>
                  <Box>
                    <Typography variant="body1">{token.tokenSymbol}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {token.tokenName}
                    </Typography>
                  </Box>
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: token.priceChangePercent >= 0 ? 'success.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {token.priceChangePercent >= 0 ? <TrendingUp fontSize="small" sx={{ mr: 0.5 }} /> : <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />}
                  {token.priceChangePercent >= 0 ? '+' : ''}{token.priceChangePercent.toFixed(1)}%
                </Typography>
              </Box>
            ))}
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Global Risk Score</Typography>
                <Typography variant="body2" color="text.secondary">Current Market Conditions</Typography>
              </Box>
              <Box 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: getRiskColor(marketMetrics.globalRiskScore)
                }}
              >
                <Typography variant="h5" sx={{ color: 'white' }}>{marketMetrics.globalRiskScore.toFixed(1)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
  };
  
  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">TradeForce Dashboard</Typography>
        <Box>
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
            size="small"
            endIcon={<Timeline />}
          >
            Performance Report
          </Button>
        </Box>
      </Box>
      
      {/* Time Range Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant={timeRange === '1d' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('1d')}
          sx={{ mx: 0.5 }}
        >
          1D
        </Button>
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
          variant={timeRange === '1y' ? 'contained' : 'outlined'} 
          size="small" 
          onClick={() => handleTimeRangeChange('1y')}
          sx={{ mx: 0.5 }}
        >
          1Y
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
      
      {/* Key Metrics */}
      {renderDashboardHeader()}
      
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Discovery" icon={<Search />} iconPosition="start" />
          <Tab label="Trading" icon={<ShowChart />} iconPosition="start" />
          <Tab label="Portfolio" icon={<DonutLarge />} iconPosition="start" />
          <Tab label="Market" icon={<BarChart />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 && renderDiscoveryOverview()}
          {activeTab === 1 && renderTradingPerformance()}
          {activeTab === 2 && renderPortfolioOverview()}
          {activeTab === 3 && renderMarketOverview()}
        </>
      )}
    </Box>
  );
};

export default UnifiedDashboard;
