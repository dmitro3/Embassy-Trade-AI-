'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * useLiveMarketData Hook
 * 
 * A robust hook for fetching and updating real-time market data
 * with automatic reconnection, error handling, and data validation
 * 
 * Features:
 * - Supports multiple data sources with failover
 * - Automatic reconnection on connection failure
 * - Data validation and normalization
 * - Historical data caching
 * - Performance optimization
 */
export function useLiveMarketData(options = {}) {
  // Default options
  const {
    tokens = ['SOL', 'BTC', 'ETH', 'USDC', 'BONK'],
    refreshInterval = 10000, // 10 seconds
    maxRetries = 5,
    sources = ['primary', 'secondary', 'fallback'],
    historyPeriod = '24h',
    enableWebSocket = true,
    cacheResults = true
  } = options;
  
  // State for market data
  const [marketData, setMarketData] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [selectedSource, setSelectedSource] = useState(sources[0]);
  const [retryCount, setRetryCount] = useState(0);
  
  // WebSocket reference
  const [wsInstance, setWsInstance] = useState(null);
  
  // Function to normalize data from different sources
  const normalizeData = useCallback((data, source) => {
    if (!data) return null;
    
    try {
      // Different normalization logic based on source
      switch (source) {
        case 'primary': // DexScreener data
          return {
            price: parseFloat(data.priceUsd || data.price || 0),
            change24h: parseFloat(data.priceChange24h || data.change24h || 0),
            volume24h: parseFloat(data.volume24h || 0),
            marketCap: parseFloat(data.marketCap || 0),
            lastUpdated: data.timestamp || new Date().toISOString(),
            source: 'dexscreener'
          };
        case 'secondary': // SHYFT API data
          return {
            price: parseFloat(data.usdPrice || data.price || 0),
            change24h: parseFloat(data.priceChange24hr || data.change24h || 0),
            volume24h: parseFloat(data.volume24h || 0),
            marketCap: parseFloat(data.marketCap || 0),
            lastUpdated: data.lastUpdatedAt || new Date().toISOString(),
            source: 'shyft'
          };
        case 'fallback': // Binance/CEX data
          return {
            price: parseFloat(data.price || data.lastPrice || 0),
            change24h: parseFloat(data.priceChangePercent || data.change24h || 0),
            volume24h: parseFloat(data.volume || data.volume24h || 0),
            marketCap: 0, // Often not available from exchange APIs
            lastUpdated: data.closeTime ? new Date(data.closeTime).toISOString() : new Date().toISOString(),
            source: 'binance'
          };
        default:
          return {
            price: parseFloat(data.price || 0),
            change24h: parseFloat(data.change24h || 0),
            volume24h: parseFloat(data.volume24h || 0),
            marketCap: parseFloat(data.marketCap || 0),
            lastUpdated: data.timestamp || new Date().toISOString(),
            source: 'unknown'
          };
      }
    } catch (error) {
      console.error(`Error normalizing data from ${source}:`, error);
      return null;
    }
  }, []);
  
  // Function to validate data
  const validateData = useCallback((data) => {
    if (!data) return false;
    
    // Check if price is a valid number
    if (typeof data.price !== 'number' || isNaN(data.price)) {
      return false;
    }
    
    // Check if the data is too old (> 5 minutes)
    if (data.lastUpdated) {
      const lastUpdate = new Date(data.lastUpdated).getTime();
      const now = Date.now();
      if (now - lastUpdate > 5 * 60 * 1000) {
        return false;
      }
    }
    
    return true;
  }, []);
  
  // Function to fetch market data from a specific source
  const fetchMarketData = useCallback(async (source = 'primary') => {
    try {
      setLoading(true);
      
      // API endpoints based on source
      const endpoints = {
        primary: '/api/market-data/prices',
        secondary: '/api/shyft-data/prices',
        fallback: '/api/binance/prices'
      };
      
      const endpoint = endpoints[source] || endpoints.primary;
      
      // Add token list to query parameters
      const queryParams = new URLSearchParams();
      tokens.forEach(token => queryParams.append('tokens', token));
      
      // Make API request
      const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process and validate the data
      const processedData = {};
      let hasValidData = false;
      
      Object.entries(data).forEach(([token, tokenData]) => {
        const normalized = normalizeData(tokenData, source);
        if (normalized && validateData(normalized)) {
          processedData[token] = normalized;
          hasValidData = true;
        }
      });
      
      if (!hasValidData) {
        throw new Error('No valid data received');
      }
      
      // Update market data state
      setMarketData(prev => ({...prev, ...processedData}));
      setLastUpdated(new Date());
      setConnectionStatus('connected');
      setRetryCount(0);
      setError(null);
      
      // Cache data if enabled
      if (cacheResults) {
        try {
          localStorage.setItem('tradeforce_market_data', JSON.stringify({
            data: processedData,
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.warn('Failed to cache market data:', e);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error fetching market data from ${source}:`, error);
      
      // If this source failed, increment retry count
      setRetryCount(prev => prev + 1);
      
      // If we've tried this source too many times, switch to next source
      if (retryCount >= maxRetries) {
        const currentIndex = sources.indexOf(source);
        const nextIndex = (currentIndex + 1) % sources.length;
        setSelectedSource(sources[nextIndex]);
        setRetryCount(0);
      }
      
      setError(`Failed to fetch from ${source}: ${error.message}`);
      setConnectionStatus('error');
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [tokens, maxRetries, normalizeData, validateData, retryCount, sources, cacheResults]);
  
  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!enableWebSocket) return;
    
    try {
      // Close existing connection if any
      if (wsInstance) {
        wsInstance.close();
      }
      
      const ws = new WebSocket('ws://localhost:3008/ws/market-data');
      
      ws.onopen = () => {
        console.log('WebSocket connected for market data');
        setConnectionStatus('connected');
        
        // Subscribe to token updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          tokens
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'market-data') {
            const { token, data } = message;
            const normalized = normalizeData(data, 'websocket');
            
            if (normalized && validateData(normalized)) {
              setMarketData(prev => ({
                ...prev,
                [token]: normalized
              }));
              setLastUpdated(new Date());
            }
          } else if (message.type === 'historical-data') {
            const { token, data } = message;
            setHistoricalData(prev => ({
              ...prev,
              [token]: data
            }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected for market data');
        setConnectionStatus('disconnected');
        
        // Try to reconnect after a delay
        setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            initializeWebSocket();
          }
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        ws.close();
      };
      
      setWsInstance(ws);
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [tokens, enableWebSocket, normalizeData, validateData]);
  
  // Initialize data
  useEffect(() => {
    async function initialize() {
      // Try to load cached data first
      if (cacheResults) {
        try {
          const cached = localStorage.getItem('tradeforce_market_data');
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - new Date(timestamp).getTime();
            
            // Use cached data if it's less than 1 minute old
            if (age < 60 * 1000) {
              setMarketData(data);
              setLastUpdated(new Date(timestamp));
            }
          }
        } catch (e) {
          console.warn('Failed to load cached market data:', e);
        }
      }
      
      // Initial data fetch
      await fetchMarketData(selectedSource);
      
      // Initialize WebSocket connection
      if (enableWebSocket) {
        initializeWebSocket();
      }
    }
    
    initialize();
    
    // Cleanup WebSocket on unmount
    return () => {
      if (wsInstance) {
        wsInstance.close();
      }
    };
  }, [fetchMarketData, initializeWebSocket, selectedSource, cacheResults, enableWebSocket]);
  
  // Set up polling interval
  useEffect(() => {
    // Skip if WebSocket is enabled and connected
    if (enableWebSocket && connectionStatus === 'connected' && wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      return;
    }
    
    const interval = setInterval(() => {
      fetchMarketData(selectedSource);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchMarketData, refreshInterval, selectedSource, connectionStatus, enableWebSocket, wsInstance]);
  
  // Load historical data
  const loadHistoricalData = useCallback(async (token, period = '24h') => {
    try {
      const response = await fetch(`/api/market-data/historical?token=${token}&period=${period}`);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      setHistoricalData(prev => ({
        ...prev,
        [token]: data
      }));
      
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${token}:`, error);
      return null;
    }
  }, []);
  
  // Return the hook interface
  return {
    marketData,
    historicalData,
    loading,
    error,
    lastUpdated,
    connectionStatus,
    loadHistoricalData,
    refreshData: () => fetchMarketData(selectedSource),
    changePeriod: (token, period) => loadHistoricalData(token, period)
  };
}
