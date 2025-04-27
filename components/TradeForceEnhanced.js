// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\TradeForceEnhanced.js
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import RoundTableConsensus from './RoundTableConsensus';
import TokenDisplay from './TokenDisplay';

/**
 * TradeForceEnhanced Component
 * 
 * This is the main component for the enhanced TradeForce AI trading system
 * with RoundTable AI collaboration, real market data, and automated trading.
 */
const TradeForceEnhanced = () => {
  // Wallet connection
  const { publicKey, connected, signTransaction } = useWallet();
  
  // Component state
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [botActive, setBotActive] = useState(false);
  const [botStatus, setBotStatus] = useState('stopped');
  const [botLog, setBotLog] = useState([]);
  
  // Market data state
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedTokenData, setSelectedTokenData] = useState(null);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  
  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [marketState, setMarketState] = useState({
    trend: 'neutral',
    volatility: 'medium',
    riskScore: 5
  });
  
  // User preferences
  const [timeframe, setTimeframe] = useState('1h');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [autoApprove, setAutoApprove] = useState(false);
  const [maxAutoApproveAmount, setMaxAutoApproveAmount] = useState(10);
  
  // Modals
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // References
  const botLogEndRef = useRef(null);
    // Initialize the system
  useEffect(() => {
    const initSystem = async () => {
      try {
        setLoading(true);
        
        // Fetch initial tokens with retries
        let tokensSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!tokensSuccess && retryCount < maxRetries) {
          try {
            await fetchTopTokens();
            tokensSuccess = true;
          } catch (error) {
            retryCount++;
            logger.warn(`Tokens fetch attempt ${retryCount} failed: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
        
        if (!tokensSuccess) {
          // Use fallback tokens if all retries failed
          setTokens([
            { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', price: 0 },
            { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', price: 1 }
          ]);
          
          toast.warn('Using fallback token data. Real-time data unavailable.');
        }
        
        // Check bot status with retries
        try {
          await checkBotStatus();
        } catch (error) {
          logger.warn(`Bot status check failed: ${error.message}`);
          setBotStatus('unknown');
          setBotActive(false);
        }
        
        setInitialized(true);
      } catch (error) {
        logger.error('Initialization error:', error);
        toast.error(`System initializing with limited functionality: ${error.message}`, { duration: 5000 });
        
        // Still mark as initialized to allow user interaction
        setInitialized(true);
      } finally {
        setLoading(false);
      }
    };
    
    initSystem();
    
    // Set up polling for bot status with exponential backoff mechanism
    let pollingInterval = 30000; // Initial 30-second polling
    let consecutiveFailures = 0;
    
    const statusInterval = setInterval(() => {
      if (initialized) {
        checkBotStatus().catch(error => {
          consecutiveFailures++;
          // Exponential backoff: increase interval on consecutive failures
          if (consecutiveFailures > 3) {
            clearInterval(statusInterval);
            pollingInterval = Math.min(pollingInterval * 2, 300000); // Max 5 minutes
            const newStatusInterval = setInterval(() => checkBotStatus(), pollingInterval);
            return newStatusInterval;
          }
        });
      }
    }, pollingInterval);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);
  
  // Scroll to bottom of bot log when new entries are added
  useEffect(() => {
    if (botLogEndRef.current) {
      botLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botLog]);
  
  // Update wallet connection status
  useEffect(() => {
    // Update relevant components when wallet connection changes
    if (connected && publicKey) {
      toast.success('Wallet connected');
      
      // Log the connection
      addToBotLog({
        type: 'info',
        message: `Wallet connected: ${publicKey.toString().substring(0, 8)}...${publicKey.toString().substring(publicKey.toString().length - 8)}`
      });
    }
  }, [connected, publicKey]);
  
  // Fetch top tokens
  const fetchTopTokens = async () => {
    try {
      const response = await fetch('/api/tradeforce/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      
      const data = await response.json();
      
      if (data.tokens && data.tokens.length > 0) {
        setTokens(data.tokens);
        
        // Set first token as selected if none selected
        if (!selectedToken) {
          setSelectedToken(data.tokens[0].address);
          fetchTokenDetails(data.tokens[0].address);
        }
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    }
  };
    // Fetch token details with enhanced resilience
  const fetchTokenDetails = async (tokenAddress) => {
    try {
      setLoading(true);
      
      // Implement retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`/api/tradeforce/tokens?address=${tokenAddress}`, {
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Check if response has minimal required data
          if (!data || (!data.symbol && !data.address)) {
            throw new Error('Received incomplete token data');
          }
          
          setSelectedTokenData(data);
          return data; // Successfully fetched data
        } catch (retryError) {
          lastError = retryError;
          retryCount++;
          
          if (retryCount >= maxRetries) {
            break; // Exit retry loop after max attempts
          }
          
          // Log the retry attempt
          console.warn(`Token detail fetch attempt ${retryCount} failed: ${retryError.message}`);
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
      
      // If we got here, all retries failed
      throw new Error(`Failed to fetch token details after ${maxRetries} attempts: ${lastError?.message || 'unknown error'}`);
    } catch (error) {
      console.error('Error fetching token details:', error);
      
      // Create fallback token data
      const fallbackData = {
        address: tokenAddress,
        symbol: tokenAddress.substring(0, 4).toUpperCase(),
        name: `Unknown Token (${tokenAddress.substring(0, 6)}...)`,
        decimals: 9,
        price: 0,
        priceChange24h: 0,
        fallback: true
      };
        // Set fallback data so UI doesn't break
      setSelectedTokenData(fallbackData);
      
      // Show warning instead of error when using fallback
      toast.error('Using fallback token data - continuing with limited functionality');
      
      // Return the fallback data in case caller needs it
      return fallbackData;
    } finally {
      setLoading(false);
    }
  };
  
  // Check bot status
  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/tradeforce/bot');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot status');
      }
      
      const data = await response.json();
      
      setBotStatus(data.status);
      setBotActive(data.status === 'running');
      setMarketState(data.marketState || marketState);
      
      // Update scan results if available
      if (data.recommendations && data.recommendations.length > 0) {
        setScanResults(data.recommendations);
      }
    } catch (error) {
      console.error('Error checking bot status:', error);
    }
  };
  // Start/stop the bot with enhanced error handling and timeout
  const toggleBot = async () => {
    try {
      setLoading(true);
      
      const action = botActive ? 'stop' : 'start';
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/tradeforce/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          settings: {
            consensusThreshold: 0.7,
            stopLossPercent: 0.02,
            takeProfitPercent: 0.05,
            riskLevel,
            scanInterval: 60000 // 1 minute scan interval
          }
        }),
        signal: controller.signal
      });
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate response data
      if (!data || typeof data.status !== 'string') {
        throw new Error('Invalid response from server');
      }
        setBotStatus(data.status);
      setBotActive(data.status === 'running');
      
      // Add to bot log
      addToBotLog({
        type: 'system',
        message: `Bot ${action === 'start' ? 'started' : 'stopped'} - ${data.message || ''}`
      });
        toast.success(`Bot ${action === 'start' ? 'started' : 'stopped'} successfully`);
      
      // If we're starting the bot, do an initial scan
      if (action === 'start') {
        scanMarket();
      }    } catch (error) {
      console.error(`Error ${botActive ? 'stopping' : 'starting'} bot:`, error);
      toast.error(`Bot operation failed: ${error.message.substring(0, 50)}`);
      
      // Set the bot to a known state on error
      const fallbackStatus = botActive ? 'stopping_failed' : 'starting_failed';
      setBotStatus(fallbackStatus);
      
      // Add error to bot log
      addToBotLog({
        type: 'error',
        message: `Failed to ${botActive ? 'stop' : 'start'} bot: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  // Scan the market for opportunities with improved resilience
  const scanMarket = async () => {
    try {
      setLoading(true);
      
      addToBotLog({
        type: 'system',
        message: 'Scanning market for opportunities...'
      });
      
      // Set a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch('/api/tradeforce/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            minVolume: 10000,
            minMarketCap: 1000000,
            minPriceChangePercent: 3
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout on success
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add validation for the response data
      if (!data || !Array.isArray(data.opportunities)) {
        throw new Error('Invalid scan response format');
      }
    
      // Update scan results
      if (data.results) {
        setScanResults(data.results);
        
        // Add to bot log
        addToBotLog({
          type: 'info',
          message: `Market scan complete: ${data.count} opportunities found`
        });
        
        data.results.forEach(result => {
          if (result.hasConsensus) {
            addToBotLog({
              type: result.action === 'buy' ? 'buy' : 'sell',
              message: `${result.action.toUpperCase()} signal for ${result.symbol || result.asset}: ${Math.round(result.consensusConfidence * 100)}% confidence`
            });
          }
        });
      }
    } catch (error) {
      console.error('Error scanning market:', error);
      toast.error(`Market scan issue: ${error.message.substring(0, 50)}...`);
      
      // Provide fallback results so the UI doesn't break
      setScanResults([]);
      
      addToBotLog({
        type: 'error',
        message: `Market scan failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };
    // Analyze selected token
  const analyzeToken = async () => {
    if (!selectedToken) {
      toast.error('Please select a token first');
      return;
    }
    
    try {
      setLoading(true);
      
      addToBotLog({
        type: 'system',
        message: `Analyzing ${selectedTokenData?.symbol || 'token'}...`
      });
      
      // First, ensure we have token data
      if (!selectedTokenData) {
        try {
          await fetchTokenDetails(selectedToken);
        } catch (tokenError) {
          logger.warn(`Failed to fetch token details before analysis: ${tokenError.message}`);
          // Continue anyway - we'll use fallback data
        }
      }
      
      // Prepare fallback symbol in case we don't have proper token data
      const tokenSymbol = selectedTokenData?.symbol || 
                         selectedToken.substring(0, 4) + '...' + selectedToken.substring(selectedToken.length - 4);
      
      // Try the analysis with retries
      let analyzeResponse;
      let analyzeData;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          analyzeResponse = await fetch('/api/tradeforce/roundTable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              asset: selectedToken,
              timeframe,
              riskLevel
            }),
            // Increase timeout for analysis which can take longer
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });
          
          if (!analyzeResponse.ok) {
            throw new Error(`Server responded with status: ${analyzeResponse.status}`);
          }
          
          analyzeData = await analyzeResponse.json();
          break; // Success, exit the retry loop
        } catch (retryError) {
          retryCount++;
          logger.warn(`Analysis attempt ${retryCount} failed: ${retryError.message}`);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Analysis failed after ${maxRetries} attempts: ${retryError.message}`);
          }
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
      
      // If we got here without data, use fallback analysis
      if (!analyzeData) {
        // Generate minimal fallback analysis data
        analyzeData = {
          asset: selectedToken,
          symbol: tokenSymbol,
          action: 'hold',
          hasConsensus: false,
          consensusConfidence: 0.5,
          currentPrice: selectedTokenData?.price || 0,
          agentSignals: [
            {
              agent: 'Trend Analyst',
              specialty: 'Moving Averages',
              action: 'hold',
              confidence: 0.5,
              strategy: 'MA Crossovers',
              notes: ['Insufficient data for analysis']
            }
          ],
          agreeingAgents: 0,
          fallback: true
        };
      }
      
      setAnalysis(analyzeData);
      
      // Add to bot log
      addToBotLog({
        type: analyzeData.action === 'buy' ? 'buy' : analyzeData.action === 'sell' ? 'sell' : 'info',
        message: `Analysis for ${analyzeData.symbol || tokenSymbol}: ${analyzeData.action.toUpperCase()} signal with ${Math.round(analyzeData.consensusConfidence * 100)}% confidence`
      });
      
      if (analyzeData.fallback) {
        toast.warn('Analysis completed with limited data');
      } else if (analyzeData.hasConsensus && analyzeData.consensusConfidence >= 0.7) {
        toast.success(`Strong ${analyzeData.action.toUpperCase()} signal detected!`);
      } else {
        toast.success('Analysis complete');
      }
    } catch (error) {
      console.error('Error analyzing token:', error);
      toast.error(`Analysis failed: ${error.message.substring(0, 100)}`);
      
      addToBotLog({
        type: 'error',
        message: `Analysis failed: ${error.message}`
      });
      
      // Set minimal fallback analysis to prevent UI errors
      setAnalysis({
        asset: selectedToken,
        symbol: selectedTokenData?.symbol || 'Unknown',
        action: 'hold',
        hasConsensus: false,
        consensusConfidence: 0,
        currentPrice: selectedTokenData?.price || 0,
        agentSignals: [],
        agreeingAgents: 0,
        error: true
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Execute a trade
  const executeTrade = async () => {
    if (!analysis || !analysis.hasConsensus) {
      toast.error('No valid trading signal available');
      return;
    }
    
    if (!connected) {
      toast.error('Please connect your wallet to execute trades');
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real implementation, you would call your trade execution API here
      // For this example, we'll simulate a successful trade
      
      addToBotLog({
        type: analysis.action === 'buy' ? 'buy' : 'sell',
        message: `Executing ${analysis.action.toUpperCase()} for ${analysis.quantity.toFixed(4)} ${analysis.symbol || selectedTokenData?.symbol || 'tokens'}`
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add trade confirmation to log
      addToBotLog({
        type: 'success',
        message: `${analysis.action.toUpperCase()} order executed successfully`
      });
      
      addToBotLog({
        type: 'info',
        message: `Stop loss set at $${analysis.stopLoss.toFixed(4)}`
      });
      
      addToBotLog({
        type: 'info',
        message: `Take profit set at $${analysis.takeProfit.toFixed(4)}`
      });
      
      toast.success(`${analysis.action.toUpperCase()} order executed`);
    } catch (error) {
      console.error('Error executing trade:', error);
      toast.error('Failed to execute trade');
      
      addToBotLog({
        type: 'error',
        message: `Trade execution failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add entry to bot log
  const addToBotLog = (entry) => {
    const timestamp = new Date().toISOString();
    setBotLog(prevLog => [
      ...prevLog,
      { ...entry, timestamp }
    ]);
  };
  
  // Handle token selection
  const handleTokenSelect = (tokenAddress) => {
    setSelectedToken(tokenAddress);
    fetchTokenDetails(tokenAddress);
    setAnalysis(null); // Clear previous analysis
  };
  
  // Filter tokens based on search query
  const filteredTokens = tokens.filter(token => {
    if (!tokenSearchQuery) return true;
    
    const query = tokenSearchQuery.toLowerCase();
    return (
      token.symbol?.toLowerCase().includes(query) ||
      token.name?.toLowerCase().includes(query) ||
      token.address?.toLowerCase().includes(query)
    );
  });
  
  // Format timestamp for bot log
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  // Get bot log entry class based on type
  const getBotLogClass = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      case 'buy':
        return 'text-green-400';
      case 'sell':
        return 'text-red-400';
      case 'system':
        return 'text-blue-400';
      case 'info':
      default:
        return 'text-gray-300';
    }
  };
  
  // Show agent details modal
  const showAgentDetails = (agent) => {
    setSelectedAgent(agent);
    setShowAgentModal(true);
  };
  
  // Render loading screen
  if (loading && !initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg text-white">Loading TradeForce AI...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">TradeForce AI Trading System</h1>
          <p className="text-gray-400">Collaborative AI-driven trading with RoundTable technology</p>
        </header>
        
        {/* Main grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Token list and selection */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Available Tokens</h2>
              
              {/* Token search */}
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search tokens..."
                  value={tokenSearchQuery}
                  onChange={e => setTokenSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Token list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTokens.length === 0 ? (
                  tokenSearchQuery ? (
                    <p className="text-center text-gray-400 py-8">No tokens matching your search criteria</p>
                  ) : (
                    <div className="animate-pulse space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-gray-700 h-16 rounded-lg"></div>
                      ))}
                    </div>
                  )
                ) : (
                  filteredTokens.map(token => (
                    <div 
                      key={token.address}
                      className={`cursor-pointer transition-transform transform hover:scale-[1.02] ${
                        selectedToken === token.address ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <TokenDisplay
                        token={token}
                        onClick={() => handleTokenSelect(token.address)}
                        showDetails={false}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Analysis settings */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Analysis Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timeframe</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={timeframe}
                    onChange={e => setTimeframe(e.target.value)}
                  >
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">1 Day</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={riskLevel}
                    onChange={e => setRiskLevel(e.target.value)}
                  >
                    <option value="low">Conservative (1% SL, 3% TP)</option>
                    <option value="medium">Moderate (2% SL, 5% TP)</option>
                    <option value="high">Aggressive (3% SL, 8% TP)</option>
                  </select>
                </div>
              </div>
              
              {/* Wallet info */}
              <div className="mt-6 p-3 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-2">Wallet Status</h3>
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-300">{connected ? 'Connected' : 'Not Connected'}</span>
                </div>
                
                {connected && publicKey && (
                  <div className="text-xs text-gray-400 break-all">
                    {publicKey.toString().substring(0, 8)}...
                    {publicKey.toString().substring(publicKey.toString().length - 8)}
                  </div>
                )}
              </div>
              
              {/* Auto-approve setting */}
              <div className="mt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoApprove}
                    onChange={() => setAutoApprove(!autoApprove)}
                  />
                  <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative"></div>
                  <span className="ml-3 text-sm text-gray-300">Auto-approve trades</span>
                </label>
                
                {autoApprove && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">Max amount (SOL)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={maxAutoApproveAmount}
                      onChange={e => setMaxAutoApproveAmount(parseFloat(e.target.value) || 0)}
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Middle column - Chart and Analysis */}
          <div className="lg:col-span-6">
            {/* TradingView chart */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Market Chart: {selectedTokenData?.symbol || 'Loading...'}
                </h2>
                
                <div className="flex space-x-2">
                  <button
                    onClick={analyzeToken}
                    disabled={!selectedToken || loading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Analyze
                  </button>
                </div>
              </div>
                <div className="h-96 rounded-lg overflow-hidden bg-gray-900">
                <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>}>
                  {selectedToken ? (
                    <div className="w-full h-full">
                      {/* Import and use the new TradingViewChart component */}
                      {typeof window !== 'undefined' && (
                        dynamic(() => import('./TradingViewChart'), { ssr: false })({
                          symbol: selectedTokenData?.symbol ? `${selectedTokenData.symbol}USD` : "SOLUSD",
                          theme: "dark",
                          interval: timeframe === '1d' ? 'D' : timeframe === '4h' ? '240' : timeframe === '1h' ? '60' : timeframe === '15m' ? '15' : '5',
                          height: "100%",
                          width: "100%",
                        })
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Select a token to view chart
                    </div>
                  )}
                </Suspense>
              </div>
            </div>
            
            {/* RoundTable Consensus */}
            <RoundTableConsensus
              analysis={analysis}
              onAgentClick={showAgentDetails}
            />
            
            {/* Trade execution */}
            {analysis && analysis.hasConsensus && (
              <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Trade Execution</h2>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-gray-300">
                    <span className="font-medium">Recommendation: </span>
                    <span className={`font-bold ${
                      analysis.action === 'buy' ? 'text-green-400' :
                      analysis.action === 'sell' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {analysis.action.toUpperCase()}
                    </span>
                  </div>
                  
                  <button
                    onClick={executeTrade}
                    disabled={!connected || loading}
                    className={`px-6 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !connected ? 'bg-gray-600 cursor-not-allowed text-gray-400' :
                      analysis.action === 'buy' ? 'bg-green-500 hover:bg-green-600 text-white' :
                      'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {!connected ? 'Connect Wallet to Trade' :
                     analysis.action === 'buy' ? `Buy ${selectedTokenData?.symbol || 'Token'}` :
                     `Sell ${selectedTokenData?.symbol || 'Token'}`}
                  </button>
                </div>
                
                <div className="text-xs text-gray-400 italic">
                  {connected ? 
                    'Trade will be executed using Solana devnet tokens' :
                    'Please connect your wallet to execute trades'
                  }
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Bot controls and logs */}
          <div className="lg:col-span-3">
            {/* Bot controls */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">TradeForce Bot</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${botActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-300 capitalize">{botStatus}</span>
                </div>
                
                <button
                  onClick={toggleBot}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    botActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {botActive ? 'Stop Bot' : 'Start Bot'}
                </button>
              </div>
              
              <div className="text-sm text-gray-400 mb-4">
                {botActive ? 
                  'Bot is actively scanning for trading opportunities' : 
                  'Start the bot to automatically scan for and execute trades'
                }
              </div>
              
              {/* Market scan button */}
              <button
                onClick={scanMarket}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Scan Market Now
              </button>
              
              {/* Market state indicators */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400 mb-1">Market Trend</div>
                  <div className={`text-sm font-medium ${
                    marketState.trend === 'bullish' ? 'text-green-400' :
                    marketState.trend === 'bearish' ? 'text-red-400' :
                    'text-gray-300'
                  }`}>
                    {marketState.trend.charAt(0).toUpperCase() + marketState.trend.slice(1)}
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400 mb-1">Volatility</div>
                  <div className={`text-sm font-medium ${
                    marketState.volatility === 'high' ? 'text-orange-400' :
                    marketState.volatility === 'low' ? 'text-blue-400' :
                    'text-gray-300'
                  }`}>
                    {marketState.volatility.charAt(0).toUpperCase() + marketState.volatility.slice(1)}
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400 mb-1">Risk Score</div>
                  <div className={`text-sm font-medium ${
                    marketState.riskScore > 7 ? 'text-red-400' :
                    marketState.riskScore < 4 ? 'text-green-400' :
                    'text-yellow-400'
                  }`}>
                    {marketState.riskScore}/10
                  </div>
                </div>
              </div>
            </div>
            
            {/* Scan results */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Scan Results</h2>
              
              {scanResults.length === 0 ? (
                <div className="text-center text-gray-400 py-6">
                  No scan results available. Start the bot or click "Scan Market Now".
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {scanResults.map((result, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.action === 'buy' ? 'border-green-500 bg-green-900 bg-opacity-20' :
                        'border-red-500 bg-red-900 bg-opacity-20'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-medium text-white">
                          {result.symbol || result.asset.substring(0, 6)}...
                        </div>
                        <div className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                          result.action === 'buy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {result.action.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-white">{Math.round(result.consensusConfidence * 100)}%</span>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Entry:</span>
                        <span className="text-white">${result.currentPrice?.toFixed(4) || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Bot log */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Bot Log</h2>
              
              <div className="h-64 overflow-y-auto bg-gray-900 rounded-lg p-2 text-sm font-mono">
                {botLog.length === 0 ? (
                  <div className="text-gray-500 p-2">No activity yet</div>
                ) : (
                  botLog.map((entry, index) => (
                    <div key={index} className={`p-1 ${getBotLogClass(entry.type)}`}>
                      <span className="text-gray-500">[{formatTimestamp(entry.timestamp)}]</span> {entry.message}
                    </div>
                  ))
                )}
                <div ref={botLogEndRef}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Agent Modal */}
      {showAgentModal && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">{selectedAgent.agent}</h3>
            
            <div className="mb-4">
              <div className="text-gray-400 mb-1">Specialty:</div>
              <div className="text-white">{selectedAgent.specialty}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-gray-400 mb-1">Strategy:</div>
              <div className="text-white">{selectedAgent.strategy}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-gray-400 mb-1">Signal:</div>
              <div className={`font-bold ${
                selectedAgent.action === 'buy' ? 'text-green-400' :
                selectedAgent.action === 'sell' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {selectedAgent.action.toUpperCase()}
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-gray-400 mb-1">Confidence: {Math.round(selectedAgent.confidence * 100)}%</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    selectedAgent.action === 'buy' ? 'bg-green-400' :
                    selectedAgent.action === 'sell' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${selectedAgent.confidence * 100}%` }}
                ></div>
              </div>
            </div>
            
            {selectedAgent.notes && selectedAgent.notes.length > 0 && (
              <div className="mb-6">
                <div className="text-gray-400 mb-1">Analysis Notes:</div>
                <ul className="list-disc list-inside text-white">
                  {selectedAgent.notes.map((note, i) => (
                    <li key={i} className="text-sm">{note}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              onClick={() => setShowAgentModal(false)}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {loading && initialized && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2 mx-auto"></div>
            <div className="text-white">Processing...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeForceEnhanced;
