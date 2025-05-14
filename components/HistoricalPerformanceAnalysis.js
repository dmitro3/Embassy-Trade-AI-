'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  ButtonGroup, 
  Button,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import logger from '../lib/logger';

/**
 * Historical Performance Analysis Component
 * 
 * This component displays historical performance metrics for trading strategies,
 * including win rate, drawdown, risk-adjusted returns, and profit/loss trends.
 */
const HistoricalPerformanceAnalysis = () => {
  const theme = useTheme();
  
  // State
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1m');
  const [performanceData, setPerformanceData] = useState([]);
  const [metrics, setMetrics] = useState({
    winRate: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    maxDrawdown: 0,
    totalTrades: 0,
    profitableTrades: 0,
    averageProfit: 0,
    averageLoss: 0,
    profitFactor: 0,
    expectancy: 0
  });
  
  // Fetch performance data
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/performance/history?timeframe=${timeframe}`);
        const data = await response.json();
        
        if (data.success) {
          setPerformanceData(data.history || []);
          setMetrics(data.metrics || {});
        } else {
          logger.error(`Error fetching performance data: ${data.error}`);
        }
      } catch (error) {
        logger.error(`Error fetching performance data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [timeframe]);
  
  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  // Format date for charts
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1, bgcolor: 'background.paper' }}>
          <Typography variant="body2">{formatDate(label)}</Typography>
          {payload.map((entry, index) => (
            <Typography
              key={`item-${index}`}
              variant="body2"
              color={entry.color}
            >
              {entry.name}: {entry.name.includes('PnL') ? formatCurrency(entry.value) : formatPercentage(entry.value)}
            </Typography>
          ))}
        </Paper>
      );
    }
    
    return null;
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Historical Performance Analysis</Typography>
        <ButtonGroup variant="outlined" size="small">
          <Button 
            onClick={() => handleTimeframeChange('1d')}
            variant={timeframe === '1d' ? 'contained' : 'outlined'}
          >
            1D
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('1w')}
            variant={timeframe === '1w' ? 'contained' : 'outlined'}
          >
            1W
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('1m')}
            variant={timeframe === '1m' ? 'contained' : 'outlined'}
          >
            1M
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('3m')}
            variant={timeframe === '3m' ? 'contained' : 'outlined'}
          >
            3M
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('all')}
            variant={timeframe === 'all' ? 'contained' : 'outlined'}
          >
            All
          </Button>
        </ButtonGroup>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Win Rate</Typography>
                <Typography variant="h5" color="success.main">{metrics.winRate.toFixed(2)}%</Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.profitableTrades} / {metrics.totalTrades} trades
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Max Drawdown</Typography>
                <Typography variant="h5" color="error.main">{metrics.maxDrawdown.toFixed(2)}%</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Profit Factor</Typography>
                <Typography variant="h5" color={metrics.profitFactor >= 1.5 ? 'success.main' : 'warning.main'}>
                  {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Expectancy</Typography>
                <Typography variant="h5" color={metrics.expectancy >= 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(metrics.expectancy)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3}>
            {/* Cumulative P&L Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>Cumulative P&L</Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativePnl" 
                        name="Cumulative PnL" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            {/* Win Rate Chart */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>Win Rate Trend</Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="winRate" 
                        name="Win Rate" 
                        stroke="#82ca9d" 
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="winRateMA" 
                        name="Win Rate MA" 
                        stroke="#ff7300" 
                        dot={false}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            {/* Daily P&L Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>Daily P&L</Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="pnl" 
                        name="Daily PnL" 
                        fill={(data) => data.pnl >= 0 ? '#82ca9d' : '#ff6b6b'}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            {/* Drawdown Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>Drawdown</Typography>
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={[0, 'dataMax + 5']}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="drawdown" 
                        name="Drawdown" 
                        stroke="#ff6b6b" 
                        fill="#ff6b6b" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            {/* Risk-Adjusted Returns */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Risk-Adjusted Returns</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Typography variant="body2" color="text.secondary">Sharpe Ratio</Typography>
                      <Typography variant="h6" color={metrics.sharpeRatio >= 1 ? 'success.main' : 'warning.main'}>
                        {metrics.sharpeRatio.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {metrics.sharpeRatio >= 3 ? 'Excellent' : 
                          metrics.sharpeRatio >= 2 ? 'Very Good' : 
                          metrics.sharpeRatio >= 1 ? 'Good' : 
                          metrics.sharpeRatio >= 0 ? 'Average' : 'Poor'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Typography variant="body2" color="text.secondary">Sortino Ratio</Typography>
                      <Typography variant="h6" color={metrics.sortinoRatio >= 1 ? 'success.main' : 'warning.main'}>
                        {metrics.sortinoRatio.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {metrics.sortinoRatio >= 3 ? 'Excellent' : 
                          metrics.sortinoRatio >= 2 ? 'Very Good' : 
                          metrics.sortinoRatio >= 1 ? 'Good' : 
                          metrics.sortinoRatio >= 0 ? 'Average' : 'Poor'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center">
                      <Typography variant="body2" color="text.secondary">Avg Win / Avg Loss</Typography>
                      <Typography variant="h6" color={metrics.averageLoss > 0 && metrics.averageProfit / metrics.averageLoss >= 1.5 ? 'success.main' : 'warning.main'}>
                        {metrics.averageLoss > 0 ? (metrics.averageProfit / metrics.averageLoss).toFixed(2) : '∞'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {metrics.averageLoss > 0 && metrics.averageProfit / metrics.averageLoss >= 2 ? 'Excellent' : 
                          metrics.averageLoss > 0 && metrics.averageProfit / metrics.averageLoss >= 1.5 ? 'Good' : 
                          'Needs Improvement'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default HistoricalPerformanceAnalysis;
