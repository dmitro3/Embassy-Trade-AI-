/**
 * TokenDiscoveryPanel Component
 * 
 * This component provides a UI for interacting with the Token Discovery MCP server.
 * It allows users to scan for new tokens, analyze tokens, and monitor tokens.
 */

import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Divider, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import tokenDiscoveryMCP from '../mcp/token-discovery-mcp/integration.js';
import logger from '../lib/logger.js';

const TokenDiscoveryPanel = () => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTokens, setNewTokens] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokenAnalysis, setTokenAnalysis] = useState(null);
  const [scanOptions, setScanOptions] = useState({
    timeframe: '24h',
    minLiquidity: 10000,
    limit: 10
  });
  const [tokenAddress, setTokenAddress] = useState('');
  const [snipeAmount, setSnipeAmount] = useState(0.1);
  const [maxSlippage, setMaxSlippage] = useState(1);
  const [snipeResult, setSnipeResult] = useState(null);
  // Initialize the integration
  useEffect(() => {
    const initialize = async () => {
      try {
        const success = await tokenDiscoveryMCP.init();
        setIsInitialized(success);
        
        if (success) {
          // Load initial data
          await loadWatchlist();
          
          // Get initial bot status
          const status = await tokenDiscoveryMCP.getBotStatus();
          logger.info(`Token Discovery MCP Status: ${JSON.stringify(status)}`);
        }
      } catch (error) {
        logger.error(`Error initializing TokenDiscoveryPanel: ${error.message}`);
      }
    };
    
    initialize();
  }, []);
  // Load watchlist
  const loadWatchlist = async () => {
    try {
      const watchlistData = await tokenDiscoveryMCP.getMonitoredTokens();
      setWatchlist(watchlistData);
    } catch (error) {
      logger.error(`Error loading watchlist: ${error.message}`);
    }
  };

  // Handle scan options change
  const handleScanOptionsChange = (event) => {
    const { name, value } = event.target;
    setScanOptions(prev => ({
      ...prev,
      [name]: name === 'minLiquidity' || name === 'limit' ? Number(value) : value
    }));
  };

  // Handle token address change
  const handleTokenAddressChange = (event) => {
    setTokenAddress(event.target.value);
  };

  // Handle snipe amount change
  const handleSnipeAmountChange = (event) => {
    setSnipeAmount(Number(event.target.value));
  };

  // Handle max slippage change
  const handleMaxSlippageChange = (event) => {
    setMaxSlippage(Number(event.target.value));
  };
  // Handle scan for new tokens
  const handleScanNewTokens = async () => {
    try {
      setIsLoading(true);
      const tokens = await tokenDiscoveryMCP.scanNewTokens(scanOptions);
      setNewTokens(tokens);
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error scanning for new tokens: ${error.message}`);
      setIsLoading(false);
    }
  };
  // Handle analyze token
  const handleAnalyzeToken = async () => {
    try {
      if (!tokenAddress) {
        return;
      }
      
      setIsLoading(true);
      const analysis = await tokenDiscoveryMCP.analyzeToken(tokenAddress);
      setTokenAnalysis(analysis);
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error analyzing token: ${error.message}`);
      setIsLoading(false);
    }
  };
  // Handle monitor token
  const handleMonitorToken = async () => {
    try {
      if (!tokenAddress) {
        return;
      }
      
      setIsLoading(true);
      await tokenDiscoveryMCP.monitorToken(tokenAddress);
      await loadWatchlist();
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error monitoring token: ${error.message}`);
      setIsLoading(false);
    }
  };
  // Handle prepare snipe
  const handlePrepareSnipe = async () => {
    try {
      if (!tokenAddress || snipeAmount <= 0) {
        return;
      }
      
      setIsLoading(true);
      
      // Get snipe opportunities first to validate token
      const opportunities = await tokenDiscoveryMCP.getSnipeOpportunities({
        tokenAddress,
        minLiquidity: 0, // No minimum to ensure we get this specific token
      });
      
      // Create a simulated snipe result since the actual snipe functionality
      // would need to be implemented in the MCP server
      const tokenInfo = opportunities.find(opp => opp.address === tokenAddress) || { 
        symbol: 'UNKNOWN', 
        name: 'Unknown Token',
        price: 0
      };
      
      const result = {
        tokenAddress,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        inputAmount: snipeAmount,
        inputToken: 'SOL',
        estimatedOutput: snipeAmount / (tokenInfo.price || 0.0001),
        minOutput: (snipeAmount / (tokenInfo.price || 0.0001)) * (1 - maxSlippage/100),
        maxSlippage,
        useFlashbots: true,
        warning: tokenInfo.riskScore > 7 ? 'This token has a high risk score' : null,
        recommendation: tokenInfo.riskScore > 7 ? 'Consider reducing position size or avoiding this token' : 'Token appears to have acceptable risk profile',
        txId: null // Would be populated after actual execution
      };
      
      setSnipeResult(result);
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error preparing snipe: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Handle token selection
  const handleTokenSelect = async (token) => {
    try {
      setSelectedToken(token);
      setTokenAddress(token.address);
      
      setIsLoading(true);
      const analysis = await tokenDiscoveryIntegration.analyzeToken(token.address);
      setTokenAnalysis(analysis);
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error selecting token: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Handle run discovery workflow
  const handleRunDiscoveryWorkflow = async () => {
    try {
      setIsLoading(true);
      await tokenDiscoveryIntegration.runDiscoveryWorkflow();
      await loadWatchlist();
      setIsLoading(false);
    } catch (error) {
      logger.error(`Error running discovery workflow: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Render risk score color
  const getRiskScoreColor = (score) => {
    if (score <= 3) return 'green';
    if (score <= 6) return 'orange';
    return 'red';
  };

  // Render token card
  const renderTokenCard = (token) => {
    return (
      <Card 
        key={token.address} 
        sx={{ 
          mb: 2, 
          cursor: 'pointer',
          border: selectedToken?.address === token.address ? '2px solid #1976d2' : 'none'
        }}
        onClick={() => handleTokenSelect(token)}
      >
        <CardContent>
          <Typography variant="h6">{token.symbol}</Typography>
          <Typography variant="body2" color="text.secondary">{token.name}</Typography>
          <Typography variant="body2">Address: {token.address.substring(0, 8)}...{token.address.substring(token.address.length - 4)}</Typography>
          {token.liquidity && (
            <Typography variant="body2">Liquidity: ${token.liquidity.toLocaleString()}</Typography>
          )}
          {token.price && (
            <Typography variant="body2">Price: ${token.price.toFixed(6)}</Typography>
          )}
          {token.riskScore && (
            <Typography variant="body2" sx={{ color: getRiskScoreColor(token.riskScore) }}>
              Risk Score: {token.riskScore}/10
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render token analysis
  const renderTokenAnalysis = () => {
    if (!tokenAnalysis) return null;
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6">Token Analysis</Typography>
          <Typography variant="body2">Symbol: {tokenAnalysis.symbol}</Typography>
          <Typography variant="body2">Name: {tokenAnalysis.name}</Typography>
          <Typography variant="body2">Price: ${tokenAnalysis.price?.toFixed(6) || 'N/A'}</Typography>
          <Typography variant="body2">Market Cap: ${tokenAnalysis.marketCap?.toLocaleString() || 'N/A'}</Typography>
          <Typography variant="body2">Holders: {tokenAnalysis.holders?.toLocaleString() || 'N/A'}</Typography>
          <Typography variant="body2">Volatility: {tokenAnalysis.volatility?.toFixed(2) || 'N/A'}%</Typography>
          <Typography variant="body2" sx={{ color: getRiskScoreColor(tokenAnalysis.riskScore) }}>
            Risk Score: {tokenAnalysis.riskScore}/10
          </Typography>
          
          {tokenAnalysis.tradingRecommendation && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1">Trading Recommendation</Typography>
              <Typography variant="body2">Action: {tokenAnalysis.tradingRecommendation.action}</Typography>
              <Typography variant="body2">Confidence: {tokenAnalysis.tradingRecommendation.confidence}</Typography>
              <Typography variant="body2">Reason: {tokenAnalysis.tradingRecommendation.reason}</Typography>
            </>
          )}
          
          {tokenAnalysis.contractAudit && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1">Contract Audit</Typography>
              <Typography variant="body2">Rug Pull Indicators: {tokenAnalysis.contractAudit.hasRugPullIndicators ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2">Honeypot Indicators: {tokenAnalysis.contractAudit.hasHoneypotIndicators ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2">Mint Authority: {tokenAnalysis.contractAudit.hasMintAuthority ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2">Freezing Authority: {tokenAnalysis.contractAudit.hasFreezingAuthority ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2">Verified: {tokenAnalysis.contractAudit.isVerified ? 'Yes' : 'No'}</Typography>
              <Typography variant="body2">Audit Score: {tokenAnalysis.contractAudit.auditScore}/10</Typography>
            </>
          )}
          
          {tokenAnalysis.socialMetrics && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1">Social Metrics</Typography>
              <Typography variant="body2">Twitter Followers: {tokenAnalysis.socialMetrics.twitterFollowers?.toLocaleString() || 'N/A'}</Typography>
              <Typography variant="body2">Discord Members: {tokenAnalysis.socialMetrics.discordMembers?.toLocaleString() || 'N/A'}</Typography>
              <Typography variant="body2">Telegram Members: {tokenAnalysis.socialMetrics.telegramMembers?.toLocaleString() || 'N/A'}</Typography>
              <Typography variant="body2">Sentiment Score: {tokenAnalysis.socialMetrics.sentimentScore?.toFixed(1) || 'N/A'}/10</Typography>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render snipe result
  const renderSnipeResult = () => {
    if (!snipeResult) return null;
    
    if (snipeResult.warning) {
      return (
        <Card sx={{ mt: 2, bgcolor: '#fff3e0' }}>
          <CardContent>
            <Typography variant="h6" color="error">Snipe Warning</Typography>
            <Typography variant="body2">{snipeResult.warning}</Typography>
            <Typography variant="body2">{snipeResult.recommendation}</Typography>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card sx={{ mt: 2, bgcolor: '#e8f5e9' }}>
        <CardContent>
          <Typography variant="h6" color="success.main">Snipe Transaction Prepared</Typography>
          <Typography variant="body2">Token: {snipeResult.tokenSymbol} ({snipeResult.tokenName})</Typography>
          <Typography variant="body2">Input: {snipeResult.inputAmount} {snipeResult.inputToken}</Typography>
          <Typography variant="body2">Estimated Output: {snipeResult.estimatedOutput.toLocaleString()} {snipeResult.tokenSymbol}</Typography>
          <Typography variant="body2">Min Output: {snipeResult.minOutput.toLocaleString()} {snipeResult.tokenSymbol}</Typography>
          <Typography variant="body2">Max Slippage: {snipeResult.maxSlippage}%</Typography>
          <Typography variant="body2">Flashbots: {snipeResult.useFlashbots ? 'Enabled' : 'Disabled'}</Typography>
          
          {snipeResult.tradeExecuted && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" color="success.main">Trade Executed</Typography>
              <Typography variant="body2">Status: {snipeResult.tradeResult.status}</Typography>
              <Typography variant="body2">Transaction Hash: {snipeResult.tradeResult.txHash}</Typography>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // If not initialized, show loading
  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Initializing Token Discovery...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Token Discovery</Typography>
      
      <Grid container spacing={3}>
        {/* Left Column - Controls */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Scan for New Tokens</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  name="timeframe"
                  value={scanOptions.timeframe}
                  onChange={handleScanOptionsChange}
                  label="Timeframe"
                >
                  <MenuItem value="1h">1 Hour</MenuItem>
                  <MenuItem value="24h">24 Hours</MenuItem>
                  <MenuItem value="7d">7 Days</MenuItem>
                  <MenuItem value="30d">30 Days</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Min Liquidity (USD)"
                name="minLiquidity"
                type="number"
                value={scanOptions.minLiquidity}
                onChange={handleScanOptionsChange}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Limit"
                name="limit"
                type="number"
                value={scanOptions.limit}
                onChange={handleScanOptionsChange}
                sx={{ mb: 2 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleScanNewTokens}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Scan for New Tokens'}
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>Token Analysis</Typography>
              
              <TextField
                fullWidth
                label="Token Address"
                value={tokenAddress}
                onChange={handleTokenAddressChange}
                sx={{ mb: 2 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleAnalyzeToken}
                disabled={isLoading || !tokenAddress}
                sx={{ mb: 2 }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Analyze Token'}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                onClick={handleMonitorToken}
                disabled={isLoading || !tokenAddress}
                sx={{ mb: 2 }}
              >
                Add to Watchlist
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>Token Sniping</Typography>
              
              <TextField
                fullWidth
                label="Amount (SOL)"
                type="number"
                value={snipeAmount}
                onChange={handleSnipeAmountChange}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Max Slippage (%)"
                type="number"
                value={maxSlippage}
                onChange={handleMaxSlippageChange}
                sx={{ mb: 2 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                color="warning"
                onClick={handlePrepareSnipe}
                disabled={isLoading || !tokenAddress || snipeAmount <= 0}
                sx={{ mb: 2 }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Prepare Snipe'}
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleRunDiscoveryWorkflow}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Run Discovery Workflow'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Middle Column - New Tokens */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ mb: 2 }}>New Tokens</Typography>
          
          {isLoading && newTokens.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : newTokens.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tokens found. Click "Scan for New Tokens" to discover new tokens.
            </Typography>
          ) : (
            newTokens.map(token => renderTokenCard(token))
          )}
          
          {tokenAnalysis && renderTokenAnalysis()}
          {snipeResult && renderSnipeResult()}
        </Grid>
        
        {/* Right Column - Watchlist */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ mb: 2 }}>Watchlist</Typography>
          
          {isLoading && watchlist.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : watchlist.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No tokens in watchlist. Add tokens to monitor them.
            </Typography>
          ) : (
            watchlist.map(token => renderTokenCard(token))
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default TokenDiscoveryPanel;
