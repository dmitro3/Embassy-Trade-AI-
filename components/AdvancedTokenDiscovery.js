'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  Typography, 
  Button, 
  Chip, 
  CircularProgress, 
  Divider, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  Slider, 
  TextField, 
  Tooltip, 
  Paper, 
  Alert,
  AlertTitle,
  Tab, 
  Tabs,
  ToggleButton, 
  ToggleButtonGroup 
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Warning, 
  Check, 
  Info, 
  LocalFireDepartment,
  FilterAlt, 
  Sort,
  Search,
  Refresh,
  Star,
  StarBorder,
  Timeline,
  BarChart,
  PieChart,
  Visibility,
  VisibilityOff,
  Analytics,
  ShowChart,
  Speed
} from '@mui/icons-material';
import tokenDiscoveryMCP from '../mcp/token-discovery-mcp/integration.js';
import logger from '../lib/logger.js';

/**
 * Risk score colors for visualization
 * @param {number} score - Risk score from 0-10
 * @returns {string} - Color code
 */
const getRiskColor = (score) => {
  if (score <= 3) return '#4caf50'; // Low risk - Green
  if (score <= 6) return '#ff9800'; // Medium risk - Orange
  return '#f44336'; // High risk - Red
};

/**
 * Advanced Token Discovery Component
 * 
 * Provides sophisticated token discovery with:
 * - Multi-source scanning (BirdEye, DexScreener, PumpFun)
 * - Advanced filtering options
 * - Risk assessment visualizations
 * - Real-time monitoring
 * - Opportunity scoring
 */
const AdvancedTokenDiscovery = () => {
  // State for token discovery
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokenAnalysis, setTokenAnalysis] = useState(null);
  
  // State for tabs and views
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  
  // State for filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState('opportunity');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Filter criteria
  const [filters, setFilters] = useState({
    minLiquidity: 5000,
    maxLiquidity: 500000,
    minHolders: 20,
    maxAgeHours: 72,
    minPriceChange: 5,
    maxRiskScore: 7,
    sources: ['birdeye', 'dexscreener', 'pumpfun']
  });
  
  // Risk tolerance setting
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  
  // Initialize MCP connection
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const success = await tokenDiscoveryMCP.init();
        
        if (success) {
          setInitialized(true);
          // Load initial data
          await fetchOpportunities();
        } else {
          logger.error('Failed to initialize token discovery MCP connection');
        }
      } catch (error) {
        logger.error(`Error initializing token discovery: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  // Fetch opportunities from MCP server
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      
      // Get snipe opportunities with current filters
      const opportunities = await tokenDiscoveryMCP.getSnipeOpportunities({
        minLiquidity: filters.minLiquidity,
        maxLiquidity: filters.maxLiquidity,
        minHolders: filters.minHolders,
        maxAgeHours: filters.maxAgeHours,
        minPriceChangePercent: filters.minPriceChange,
        sources: filters.sources,
        riskTolerance: riskTolerance
      });
      
      setTokens(opportunities);
      applyFiltersAndSort(opportunities);
    } catch (error) {
      logger.error(`Error fetching token opportunities: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters and sorting to tokens
  const applyFiltersAndSort = (tokensToFilter = tokens) => {
    // Apply search filter if provided
    let result = tokensToFilter;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(token => 
        token.symbol?.toLowerCase().includes(query) || 
        token.name?.toLowerCase().includes(query) ||
        token.address?.toLowerCase().includes(query)
      );
    }
    
    // Apply risk score filter
    result = result.filter(token => (token.riskScore || 5) <= filters.maxRiskScore);
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'opportunity':
          comparison = (b.opportunityScore || 0) - (a.opportunityScore || 0);
          break;
        case 'liquidity':
          comparison = (b.liquidity || 0) - (a.liquidity || 0);
          break;
        case 'age':
          const getAge = (token) => {
            return token.createdAt ? new Date(token.createdAt).getTime() : 0;
          };
          comparison = getAge(b) - getAge(a);
          break;
        case 'priceChange':
          comparison = (b.priceChangePercent || 0) - (a.priceChangePercent || 0);
          break;
        case 'risk':
          comparison = (a.riskScore || 5) - (b.riskScore || 5); // Low to high for risk
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
    
    setFilteredTokens(result);
  };
  
  // Apply filters when search query changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, sortBy, sortOrder, filters, riskTolerance]);
  
  // Get token details
  const fetchTokenDetails = async (token) => {
    try {
      setLoading(true);
      setSelectedToken(token);
      
      // Get detailed analysis
      const analysis = await tokenDiscoveryMCP.analyzeToken(token.address);
      setTokenAnalysis(analysis);
    } catch (error) {
      logger.error(`Error fetching token details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate opportunity score components for the visualization
  const opportunityScoreComponents = useMemo(() => {
    if (!tokenAnalysis) return null;
    
    return [
      { name: 'Liquidity', value: tokenAnalysis.liquidityScore || 0, color: '#2196f3' },
      { name: 'Momentum', value: tokenAnalysis.momentumScore || 0, color: '#9c27b0' },
      { name: 'Holders', value: tokenAnalysis.holdersScore || 0, color: '#4caf50' },
      { name: 'Volume', value: tokenAnalysis.volumeScore || 0, color: '#ff9800' },
      { name: 'Social', value: tokenAnalysis.socialScore || 0, color: '#e91e63' }
    ];
  }, [tokenAnalysis]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle view mode change
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle risk tolerance change
  const handleRiskToleranceChange = (event) => {
    setRiskTolerance(event.target.value);
  };
  
  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default desc order
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  // Render token card
  const renderTokenCard = (token) => {
    const isSelected = selectedToken?.address === token.address;
    
    return (
      <Card 
        key={token.address} 
        sx={{ 
          mb: 2,
          cursor: 'pointer',
          borderLeft: '5px solid',
          borderLeftColor: getRiskColor(token.riskScore || 5),
          boxShadow: isSelected ? 3 : 1,
          transition: 'all 0.2s',
          backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)'
          }
        }}
        onClick={() => fetchTokenDetails(token)}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
                {token.symbol}
                {token.verified && (
                  <Tooltip title="Verified Contract">
                    <Check 
                      fontSize="small" 
                      color="success" 
                      sx={{ ml: 0.5 }} 
                    />
                  </Tooltip>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">{token.name}</Typography>
            </Box>
            <Box>
              <Chip 
                label={`${token.opportunityScore || 0}/100`} 
                color="primary" 
                size="small"
                icon={<Timeline />}
                sx={{ mr: 1 }}
              />
              <Tooltip title={`Risk Score: ${token.riskScore || 5}/10`}>
                <Chip
                  label={`Risk: ${token.riskScore || 5}`}
                  size="small"
                  sx={{ 
                    bgcolor: getRiskColor(token.riskScore || 5),
                    color: 'white'
                  }}
                />
              </Tooltip>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 1.5, mt: 1 }} />
          
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2">
                Price: ${token.price?.toFixed(6) || '0.000000'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="body2"
                sx={{ 
                  color: (token.priceChangePercent || 0) >= 0 ? 'success.main' : 'error.main',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {(token.priceChangePercent || 0) >= 0 ? <TrendingUp fontSize="small" sx={{ mr: 0.5 }} /> : <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />}
                {Math.abs(token.priceChangePercent || 0).toFixed(2)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Liquidity: ${(token.liquidity || 0).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Holders: {(token.holders || 0).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
          
          <Box display="flex" mt={1.5} justifyContent="space-between" alignItems="center">
            <Chip 
              size="small" 
              label={`Source: ${token.source || 'Unknown'}`}
              variant="outlined"
            />
            <Button 
              size="small" 
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                fetchTokenDetails(token);
              }}
            >
              Details
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Render token list view
  const renderTokenListView = (token) => {
    const isSelected = selectedToken?.address === token.address;
    
    return (
      <Paper
        key={token.address}
        sx={{
          p: 1,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          borderLeft: '5px solid',
          borderLeftColor: getRiskColor(token.riskScore || 5),
          backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
          '&:hover': {
            boxShadow: 1
          }
        }}
        onClick={() => fetchTokenDetails(token)}
      >
        <Box width="30%" display="flex" flexDirection="column">
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
            {token.symbol}
            {token.verified && <Check fontSize="small" color="success" sx={{ ml: 0.5 }} />}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {token.name}
          </Typography>
        </Box>
        
        <Box width="20%" display="flex" alignItems="center">
          <Typography variant="body2">
            ${token.price?.toFixed(6) || '0.000000'}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              ml: 1,
              color: (token.priceChangePercent || 0) >= 0 ? 'success.main' : 'error.main' 
            }}
          >
            {(token.priceChangePercent || 0) >= 0 ? '↑' : '↓'}{Math.abs(token.priceChangePercent || 0).toFixed(2)}%
          </Typography>
        </Box>
        
        <Box width="20%">
          <Typography variant="body2">
            ${(token.liquidity || 0).toLocaleString()}
          </Typography>
        </Box>
        
        <Box width="10%">
          <Typography variant="body2">
            {(token.holders || 0).toLocaleString()}
          </Typography>
        </Box>
        
        <Box width="20%" display="flex" justifyContent="flex-end">
          <Chip 
            label={`Opp: ${token.opportunityScore || 0}`}
            size="small"
            color="primary"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`Risk: ${token.riskScore || 5}`}
            size="small"
            sx={{ 
              bgcolor: getRiskColor(token.riskScore || 5),
              color: 'white'
            }}
          />
        </Box>
      </Paper>
    );
  };
  
  // Render token analysis view
  const renderTokenAnalysis = () => {
    if (!tokenAnalysis) return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Info sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6">Select a token to view detailed analysis</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          The analysis includes risk assessment, contract audit, social metrics, and trading recommendations
        </Typography>
      </Paper>
    );
    
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
              {tokenAnalysis.symbol}
              {tokenAnalysis.verified && (
                <Tooltip title="Verified Contract">
                  <Check fontSize="small" color="success" sx={{ ml: 1 }} />
                </Tooltip>
              )}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {tokenAnalysis.name}
            </Typography>
          </Box>
          <Box>
            <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => window.open(`https://solscan.io/token/${tokenAnalysis.address}`, '_blank')}>
              View on SolScan
            </Button>
            <Button variant="contained" size="small" onClick={() => tokenDiscoveryMCP.monitorToken(tokenAnalysis.address)}>
              Monitor Token
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          {/* Price and Stats */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Price & Stats</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Current Price</Typography>
                    <Typography variant="h6">${tokenAnalysis.price?.toFixed(6) || '0.000000'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Price Change (24h)</Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ color: (tokenAnalysis.priceChangePercent || 0) >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {(tokenAnalysis.priceChangePercent || 0) >= 0 ? '+' : ''}{(tokenAnalysis.priceChangePercent || 0).toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Market Cap</Typography>
                    <Typography variant="body1">${(tokenAnalysis.marketCap || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Fully Diluted Valuation</Typography>
                    <Typography variant="body1">${(tokenAnalysis.fdv || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Liquidity</Typography>
                    <Typography variant="body1">${(tokenAnalysis.liquidity || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Volume (24h)</Typography>
                    <Typography variant="body1">${(tokenAnalysis.volume24h || 0).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Holders Analysis */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Holders Analysis</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Holders</Typography>
                    <Typography variant="body1">{(tokenAnalysis.holders || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Top 10 Concentration</Typography>
                    <Typography variant="body1">{(tokenAnalysis.topHoldersConcentration || 0).toFixed(2)}%</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>Holder Distribution</Typography>
                      {/* Placeholder for holder distribution chart */}
                      <Box 
                        sx={{
                          height: 25,
                          width: '100%',
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          overflow: 'hidden',
                          display: 'flex'
                        }}
                      >
                        <Box sx={{ width: `${tokenAnalysis.topHoldersConcentration || 60}%`, bgcolor: '#f44336', height: '100%' }} />
                        <Box sx={{ width: `${100 - (tokenAnalysis.topHoldersConcentration || 60)}%`, bgcolor: '#4caf50', height: '100%' }} />
                      </Box>
                      <Box display="flex" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption">Top 10 Holders</Typography>
                        <Typography variant="caption">Other Holders</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Risk Assessment and Opportunity Score */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Risk Assessment</Typography>
                
                <Box display="flex" alignItems="center" mb={2}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      display: 'inline-flex',
                      mr: 2
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={80}
                      thickness={4}
                      sx={{ color: 'grey.300' }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={(tokenAnalysis.riskScore || 5) * 10}
                      size={80}
                      thickness={4}
                      sx={{ 
                        color: getRiskColor(tokenAnalysis.riskScore || 5),
                        position: 'absolute',
                        left: 0,
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6" component="div">
                        {tokenAnalysis.riskScore || 5}/10
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {tokenAnalysis.riskScore <= 3 ? 'Low Risk' : 
                       tokenAnalysis.riskScore <= 6 ? 'Moderate Risk' : 'High Risk'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tokenAnalysis.riskSummary || 'Based on liquidity, contract analysis, and trading patterns.'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Risk Factors */}
                <Typography variant="subtitle2" gutterBottom>Risk Factors</Typography>
                <Grid container spacing={1}>
                  {/* Contract Risk */}
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: getRiskColor(tokenAnalysis.contractRisk || 5),
                          mr: 1
                        }} 
                      />
                      <Typography variant="body2">Contract Risk: {tokenAnalysis.contractRisk || 5}/10</Typography>
                    </Box>
                  </Grid>
                  
                  {/* Liquidity Risk */}
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: getRiskColor(tokenAnalysis.liquidityRisk || 5),
                          mr: 1
                        }} 
                      />
                      <Typography variant="body2">Liquidity Risk: {tokenAnalysis.liquidityRisk || 5}/10</Typography>
                    </Box>
                  </Grid>
                  
                  {/* Concentration Risk */}
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: getRiskColor(tokenAnalysis.concentrationRisk || 5),
                          mr: 1
                        }} 
                      />
                      <Typography variant="body2">Concentration Risk: {tokenAnalysis.concentrationRisk || 5}/10</Typography>
                    </Box>
                  </Grid>
                  
                  {/* Volatility Risk */}
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%', 
                          bgcolor: getRiskColor(tokenAnalysis.volatilityRisk || 5),
                          mr: 1
                        }} 
                      />
                      <Typography variant="body2">Volatility Risk: {tokenAnalysis.volatilityRisk || 5}/10</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Opportunity Score */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Opportunity Score</Typography>
                
                <Box display="flex" alignItems="center" mb={2}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      display: 'inline-flex',
                      mr: 2
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={80}
                      thickness={4}
                      sx={{ color: 'grey.300' }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={tokenAnalysis.opportunityScore || 0}
                      size={80}
                      thickness={4}
                      sx={{ color: 'primary.main' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6" component="div">
                        {tokenAnalysis.opportunityScore || 0}/100
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {tokenAnalysis.opportunityScore >= 80 ? 'Excellent Opportunity' : 
                       tokenAnalysis.opportunityScore >= 60 ? 'Good Opportunity' : 
                       tokenAnalysis.opportunityScore >= 40 ? 'Moderate Opportunity' : 'Low Opportunity'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tokenAnalysis.opportunitySummary || 'Based on momentum, social sentiment, and technical factors.'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Opportunity Factors */}
                <Typography variant="subtitle2" gutterBottom>Opportunity Factors</Typography>
                <Grid container spacing={1}>
                  {opportunityScoreComponents && opportunityScoreComponents.map(component => (
                    <Grid item xs={12} key={component.name}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {component.name}: {component.value}/10
                      </Typography>
                      <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1, height: 6, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            width: `${component.value * 10}%`,
                            bgcolor: component.color,
                            height: '100%'
                          }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Contract Audit */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Contract Audit</Typography>
                
                {tokenAnalysis.contractAudit ? (
                  <>
                    <Box sx={{ mb: 2 }}>
                      {tokenAnalysis.contractAudit.hasRugPullIndicators ? (
                        <Alert severity="error" sx={{ mb: 1 }}>
                          <AlertTitle>Rug Pull Risk Detected</AlertTitle>
                          This contract has characteristics often associated with rug pulls.
                        </Alert>
                      ) : (
                        <Alert severity="success" sx={{ mb: 1 }}>
                          <AlertTitle>No Rug Pull Indicators</AlertTitle>
                          No obvious rug pull mechanisms were detected in this contract.
                        </Alert>
                      )}
                      
                      {tokenAnalysis.contractAudit.hasHoneypotIndicators ? (
                        <Alert severity="error" sx={{ mb: 1 }}>
                          <AlertTitle>Honeypot Risk Detected</AlertTitle>
                          This contract has characteristics often associated with honeypots.
                        </Alert>
                      ) : (
                        <Alert severity="success" sx={{ mb: 1 }}>
                          <AlertTitle>No Honeypot Indicators</AlertTitle>
                          No obvious honeypot mechanisms were detected in this contract.
                        </Alert>
                      )}
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Contract Verified</Typography>
                        <Typography variant="body1">
                          {tokenAnalysis.contractAudit.isVerified ? 'Yes' : 'No'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Mint Authority</Typography>
                        <Typography variant="body1">
                          {tokenAnalysis.contractAudit.hasMintAuthority ? 'Yes' : 'No'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Freezing Authority</Typography>
                        <Typography variant="body1">
                          {tokenAnalysis.contractAudit.hasFreezingAuthority ? 'Yes' : 'No'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Audit Score</Typography>
                        <Typography variant="body1">
                          {tokenAnalysis.contractAudit.auditScore || 0}/10
                        </Typography>
                      </Grid>
                      {tokenAnalysis.contractAudit.redFlags && tokenAnalysis.contractAudit.redFlags.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Red Flags</Typography>
                          {tokenAnalysis.contractAudit.redFlags.map((flag, index) => (
                            <Chip 
                              key={index}
                              label={flag}
                              size="small"
                              icon={<Warning fontSize="small" />}
                              color="error"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Grid>
                      )}
                    </Grid>
                  </>
                ) : (
                  <Typography variant="body1">Contract audit information not available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Trade Recommendation */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Trade Recommendation</Typography>
                
                {tokenAnalysis.tradingRecommendation ? (
                  <>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Chip
                        label={tokenAnalysis.tradingRecommendation.action}
                        color={
                          tokenAnalysis.tradingRecommendation.action === 'Buy' ? 'success' :
                          tokenAnalysis.tradingRecommendation.action === 'Sell' ? 'error' : 'warning'
                        }
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body1">
                        Confidence: {tokenAnalysis.tradingRecommendation.confidence || 'Medium'}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      {tokenAnalysis.tradingRecommendation.reason || 'No detailed reason provided.'}
                    </Typography>
                    
                    {tokenAnalysis.tradingRecommendation.targets && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Price Targets</Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Entry</Typography>
                            <Typography variant="body1">${tokenAnalysis.tradingRecommendation.targets.entry?.toFixed(6) || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Target</Typography>
                            <Typography variant="body1" color="success.main">
                              ${tokenAnalysis.tradingRecommendation.targets.target?.toFixed(6) || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Stop Loss</Typography>
                            <Typography variant="body1" color="error.main">
                              ${tokenAnalysis.tradingRecommendation.targets.stopLoss?.toFixed(6) || 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body1">Trading recommendation not available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };
  
  return (
    <Box>
      {/* Header with stats and filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={7}>
            <Typography variant="h5" component="h1" gutterBottom>
              Advanced Token Discovery
            </Typography>
            <Typography variant="body1" gutterBottom>
              Discover new tokens on Solana with advanced filtering and risk assessment
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button 
              variant="contained" 
              startIcon={<Refresh />}
              onClick={fetchOpportunities}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterAlt />}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            >
              Filters
            </Button>
          </Grid>
        </Grid>
        
        {/* Filter panel */}
        {filterPanelOpen && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="risk-tolerance-label">Risk Tolerance</InputLabel>
                  <Select
                    labelId="risk-tolerance-label"
                    value={riskTolerance}
                    label="Risk Tolerance"
                    onChange={handleRiskToleranceChange}
                  >
                    <MenuItem value="low">Conservative (Low Risk)</MenuItem>
                    <MenuItem value="moderate">Balanced (Moderate Risk)</MenuItem>
                    <MenuItem value="high">Aggressive (High Risk)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="max-risk-score-label">Max Risk Score</InputLabel>
                  <Select
                    labelId="max-risk-score-label"
                    value={filters.maxRiskScore}
                    label="Max Risk Score"
                    onChange={(e) => handleFilterChange('maxRiskScore', e.target.value)}
                  >
                    <MenuItem value={3}>Low Risk Only (1-3)</MenuItem>
                    <MenuItem value={5}>Moderate Risk (1-5)</MenuItem>
                    <MenuItem value={7}>Medium-High Risk (1-7)</MenuItem>
                    <MenuItem value={10}>Any Risk Level (1-10)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="min-price-change-label">Min Price Change</InputLabel>
                  <Select
                    labelId="min-price-change-label"
                    value={filters.minPriceChange}
                    label="Min Price Change"
                    onChange={(e) => handleFilterChange('minPriceChange', e.target.value)}
                  >
                    <MenuItem value={1}>1%+</MenuItem>
                    <MenuItem value={5}>5%+</MenuItem>
                    <MenuItem value={10}>10%+</MenuItem>
                    <MenuItem value={25}>25%+</MenuItem>
                    <MenuItem value={50}>50%+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="min-liquidity-label">Min Liquidity</InputLabel>
                  <Select
                    labelId="min-liquidity-label"
                    value={filters.minLiquidity}
                    label="Min Liquidity"
                    onChange={(e) => handleFilterChange('minLiquidity', e.target.value)}
                  >
                    <MenuItem value={1000}>$1,000+</MenuItem>
                    <MenuItem value={5000}>$5,000+</MenuItem>
                    <MenuItem value={10000}>$10,000+</MenuItem>
                    <MenuItem value={50000}>$50,000+</MenuItem>
                    <MenuItem value={100000}>$100,000+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography id="max-age-slider" gutterBottom>
                  Maximum Token Age: {filters.maxAgeHours} hours
                </Typography>
                <Slider
                  value={filters.maxAgeHours}
                  onChange={(e, newValue) => handleFilterChange('maxAgeHours', newValue)}
                  aria-labelledby="max-age-slider"
                  valueLabelDisplay="auto"
                  step={12}
                  marks={[
                    { value: 24, label: '24h' },
                    { value: 72, label: '3d' },
                    { value: 168, label: '7d' },
                  ]}
                  min={12}
                  max={168}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
      
      {/* Main content */}
      <Box>
        <Grid container spacing={3}>
          {/* Token list section */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  placeholder="Search tokens..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <Search color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {filteredTokens.length} tokens
                </Typography>
              </Box>
              
              <ToggleButtonGroup
                size="small"
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
              >
                <ToggleButton value="grid">
                  <Tooltip title="Card View">
                    <GridViewIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="list">
                  <Tooltip title="List View">
                    <ViewListIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            {/* Sort options */}
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap' }}>
              <Chip
                label="Opportunity"
                icon={<Timeline fontSize="small" />}
                onClick={() => handleSortChange('opportunity')}
                color={sortBy === 'opportunity' ? 'primary' : 'default'}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label="Liquidity"
                icon={<BarChart fontSize="small" />}
                onClick={() => handleSortChange('liquidity')}
                color={sortBy === 'liquidity' ? 'primary' : 'default'}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label="Age"
                icon={<AccessTime fontSize="small" />}
                onClick={() => handleSortChange('age')}
                color={sortBy === 'age' ? 'primary' : 'default'}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label="Price Change"
                icon={<ShowChart fontSize="small" />}
                onClick={() => handleSortChange('priceChange')}
                color={sortBy === 'priceChange' ? 'primary' : 'default'}
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label="Risk"
                icon={<Speed fontSize="small" />}
                onClick={() => handleSortChange('risk')}
                color={sortBy === 'risk' ? 'primary' : 'default'}
                sx={{ mb: 1 }}
              />
            </Box>
            
            {/* Token list */}
            <Box sx={{ maxHeight: 'calc(100vh - 350px)', overflow: 'auto', pr: 1 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                  <CircularProgress />
                </Box>
              ) : filteredTokens.length === 0 ? (
                <Box textAlign="center" p={3}>
                  <Typography variant="body1" color="text.secondary">
                    No tokens found matching your criteria
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Refresh />} 
                    onClick={fetchOpportunities}
                    sx={{ mt: 2 }}
                  >
                    Refresh Data
                  </Button>
                </Box>
              ) : (
                filteredTokens.map(token => 
                  viewMode === 'grid' ? renderTokenCard(token) : renderTokenListView(token)
                )
              )}
            </Box>
          </Grid>
          
          {/* Analysis section */}
          <Grid item xs={12} md={8}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Analysis" icon={<Analytics />} iconPosition="start" />
              <Tab label="Chart" icon={<ShowChart />} iconPosition="start" />
              <Tab label="Trade" icon={<SwapHoriz />} iconPosition="start" />
            </Tabs>
            
            {activeTab === 0 && renderTokenAnalysis()}
            
            {activeTab === 1 && (
              <Paper sx={{ p: 3, height: 'calc(100vh - 350px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedToken ? (
                  <iframe
                    title="Trading View Chart"
                    src={`https://solscan.io/token/${selectedToken.address}#tradingview`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <Box textAlign="center">
                    <TrendingUp sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">Select a token to view price chart</Typography>
                  </Box>
                )}
              </Paper>
            )}
            
            {activeTab === 2 && (
              <Paper sx={{ p: 3 }}>
                {selectedToken ? (
                  <Box>
                    <Typography variant="h6" gutterBottom>Trade {selectedToken.symbol}</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Amount (SOL)"
                            type="number"
                            value={snipeAmount}
                            onChange={(e) => setSnipeAmount(Number(e.target.value))}
                            InputProps={{
                              inputProps: { min: 0.01, step: 0.01 }
                            }}
                          />
                        </FormControl>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <TextField
                            label="Max Slippage (%)"
                            type="number"
                            value={maxSlippage}
                            onChange={(e) => setMaxSlippage(Number(e.target.value))}
                            InputProps={{
                              inputProps: { min: 0.1, max: 100, step: 0.1 }
                            }}
                          />
                        </FormControl>
                        
                        <Button 
                          variant="contained" 
                          fullWidth
                          color="primary"
                          onClick={() => handlePrepareSnipe()}
                          disabled={!snipeAmount || snipeAmount <= 0}
                        >
                          Prepare Trade
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Trade Preview</Typography>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">You Pay</Typography>
                            <Typography variant="body1">{snipeAmount} SOL</Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">You Receive (Estimated)</Typography>
                            <Typography variant="body1">
                              {(snipeAmount / (selectedToken.price || 0.0001)).toLocaleString()} {selectedToken.symbol}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Price</Typography>
                            <Typography variant="body1">
                              1 {selectedToken.symbol} = ${selectedToken.price?.toFixed(6) || '0.000000'}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Maximum Slippage</Typography>
                            <Typography variant="body1">{maxSlippage}%</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Box textAlign="center">
                    <SwapHoriz sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6">Select a token to trade</Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdvancedTokenDiscovery;
