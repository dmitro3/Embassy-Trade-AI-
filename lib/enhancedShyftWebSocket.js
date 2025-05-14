'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import logger from './logger';
import apiKeyManager from './apiKeyManager';

/**
 * Enhanced Shyft WebSocket service with improved error handling and reconnection
 * Addresses critical integration errors by implementing:
 * 1. Automatic API key rotation on failure
 * 2. Exponential backoff for reconnection attempts
 * 3. Connection health monitoring
 * 4. Automatic token resubscription after reconnection
 * 5. Data caching for low-latency access (<500ms)
 * 6. Robust error recovery with fallback mechanisms
 * 7. Detailed connection analytics and logging
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.tokens - Tokens to subscribe to
 * @param {number} options.reconnectMaxAttempts - Maximum reconnection attempts
 * @param {number} options.heartbeatInterval - Heartbeat interval in ms
 * @param {boolean} options.enableCache - Enable data caching
 * @param {number} options.cacheExpiry - Cache expiry time in ms
 * @returns {Object} WebSocket status and token updates
 */
const useEnhancedShyftWebSocket = (options = {}) => {
  const {
    tokens = ['SOL', 'RAY', 'JUP', 'BONK', 'USDC'],
    reconnectMaxAttempts = 15,
    heartbeatInterval = 15000,
    enableCache = true,
    cacheExpiry = 60000 // 1 minute cache expiry
  } = options;
  
  // State variables
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [tokenData, setTokenData] = useState({});
  const [lastMessage, setLastMessage] = useState(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(true);
  const [connectionStats, setConnectionStats] = useState({
    connectAttempts: 0,
    successfulConnections: 0,
    disconnects: 0,
    messagesReceived: 0,
    lastConnectTime: null,
    uptime: 0,
    latency: 0
  });
  
  // Reference values
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const healthCheckTimerRef = useRef(null);
  const subscriptionsRef = useRef(new Set(tokens));
  const apiKeyRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const cacheRef = useRef({});
  const cacheTimestampsRef = useRef({});
  const connectionStartTimeRef = useRef(null);
  const pingTimestampRef = useRef(null);
  
  /**
   * Get WebSocket URL with API key
   */
  const getWebSocketUrl = useCallback(async () => {
    try {
      // Get API key from manager
      const apiKey = await apiKeyManager.getApiKey('shyft');
      if (!apiKey) {
        // Try fallback to environment variable
        const envApiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY;
        if (envApiKey) {
          logger.warn('Using fallback API key from environment variables');
          apiKeyRef.current = envApiKey;
          return `wss://devnet-rpc.shyft.to?api_key=${envApiKey}`;
        }
        throw new Error('No Shyft API key available');
      }
      
      // Store API key for reference
      apiKeyRef.current = apiKey;
      
      // Form WebSocket URL with network parameter
      return `wss://devnet-rpc.shyft.to?api_key=${apiKey}`;
    } catch (error) {
      logger.error(`Failed to get WebSocket URL: ${error.message}`);
      setIsApiKeyValid(false);
      return null;
    }
  }, []);
  
  /**
   * Connection health check
   */
  const checkConnectionHealth = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Check last message time
    const currentTime = Date.now();
    const timeSinceLastMessage = currentTime - lastMessageTimeRef.current;
    
    // If no message for 2x heartbeat interval, consider connection stale
    if (lastMessageTimeRef.current > 0 && timeSinceLastMessage > heartbeatInterval * 2) {
      logger.warn(`WebSocket connection may be stale. Last message ${timeSinceLastMessage}ms ago`);
      
      // Try to send a ping to confirm and measure latency
      try {
        pingTimestampRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
        
        // Give it a short time to respond
        setTimeout(() => {
          if (currentTime - lastMessageTimeRef.current > heartbeatInterval * 2) {
            logger.error('WebSocket connection is stale, forcing reconnection');
            
            // Update connection stats
            setConnectionStats(prev => ({
              ...prev,
              disconnects: prev.disconnects + 1
            }));
            
            wsRef.current.close();
          }
        }, 5000);
      } catch (error) {
        logger.error('Error sending ping, connection appears dead');
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          disconnects: prev.disconnects + 1
        }));
        
        wsRef.current.close();
      }
    }
    
    // Update uptime if connection is active
    if (connectionStartTimeRef.current) {
      const uptime = Math.floor((Date.now() - connectionStartTimeRef.current) / 1000);
      setConnectionStats(prev => ({
        ...prev,
        uptime
      }));
    }
  }, [heartbeatInterval]);
  
  /**
   * Subscribe to token updates
   */
  const subscribeToTokens = useCallback((tokenList) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    try {
      const subscribeMessage = JSON.stringify({
        action: 'subscribe',
        tokens: tokenList
      });
      
      wsRef.current.send(subscribeMessage);
      logger.info(`Subscribed to tokens: ${tokenList.join(', ')}`);
      
      // Update subscriptions ref
      tokenList.forEach(token => subscriptionsRef.current.add(token));
      
      // Return success status
      return true;
    } catch (error) {
      logger.error(`Failed to subscribe to tokens: ${error.message}`);
      return false;
    }
  }, []);
  
  /**
   * Get cached token data
   */
  const getCachedTokenData = useCallback((token) => {
    if (!enableCache) return null;
    
    const cachedData = cacheRef.current[token];
    const timestamp = cacheTimestampsRef.current[token];
    
    // Check if cache exists and is not expired
    if (cachedData && timestamp && (Date.now() - timestamp) < cacheExpiry) {
      return cachedData;
    }
    
    return null;
  }, [enableCache, cacheExpiry]);
  
  /**
   * Set cached token data
   */
  const setCachedTokenData = useCallback((token, data) => {
    if (!enableCache) return;
    
    cacheRef.current[token] = data;
    cacheTimestampsRef.current[token] = Date.now();
  }, [enableCache]);
  
  /**
   * Initialize WebSocket connection
   */
  const connectWebSocket = useCallback(async () => {
    // Clear any existing timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    // Close existing connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore closure errors
      }
      wsRef.current = null;
    }
    
    try {
      // Update connection stats
      setConnectionStats(prev => ({
        ...prev,
        connectAttempts: prev.connectAttempts + 1
      }));
      
      // Get WebSocket URL with API key
      const wsUrl = await getWebSocketUrl();
      if (!wsUrl) {
        throw new Error('Failed to get WebSocket URL');
      }
      
      logger.info('Connecting to Shyft WebSocket...');
      setConnectionStatus('connecting');
        // Before attempting connection, check if network is available
      try {
        // Perform a quick fetch to check connectivity
        const networkCheckPromise = fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        // Set a timeout for the network check
        const networkCheckTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network check timeout')), 3000)
        );
        
        // Wait for either the fetch to complete or timeout
        await Promise.race([networkCheckPromise, networkCheckTimeout]);
        
        logger.info('Network connectivity confirmed, establishing WebSocket connection');
      } catch (networkError) {
        logger.warn(`Network check failed before WebSocket connection: ${networkError.message}`);
        // Continue anyway, the WebSocket might still work
      }

      // Create new WebSocket with connection timeout
      const connectionTimeoutId = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          logger.error('WebSocket connection attempt timed out');
          wsRef.current.close();
          
          // Set error status
          setConnectionStatus('error');
          
          // Try fallback WebSocket URL if available
          if (fallbackWsUrlRef.current && fallbackWsUrlRef.current !== wsUrl) {
            logger.info('Attempting fallback WebSocket connection');
            try {
              wsRef.current = new WebSocket(fallbackWsUrlRef.current);
              // Event handlers will be set after this block
            } catch (fallbackError) {
              logger.error(`Fallback connection failed: ${fallbackError.message}`);
              
              // Schedule reconnect with primary URL
              scheduleReconnect();
            }
          } else {
            // Schedule reconnect
            scheduleReconnect();
          }
        }
      }, 10000); // Reduced to 10 second connection timeout for faster recovery
      
      // Create WebSocket with error handling
      try {
        wsRef.current = new WebSocket(wsUrl);
      } catch (wsError) {
        logger.error(`WebSocket instantiation error: ${wsError.message}`);
        clearTimeout(connectionTimeoutId);
        setConnectionStatus('error');
        scheduleReconnect();
        return;
      }
      
      // Connection opened successfully
      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeoutId);
        
        // Set connection start time for uptime tracking
        connectionStartTimeRef.current = Date.now();
        
        logger.info('WebSocket connection established');
        setConnectionStatus('connected');
        
        // Reset reconnect attempts
        reconnectAttemptsRef.current = 0;
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          successfulConnections: prev.successfulConnections + 1,
          lastConnectTime: new Date().toISOString()
        }));
        
        // Subscribe to tokens
        const tokensToSubscribe = Array.from(subscriptionsRef.current);
        subscribeToTokens(tokensToSubscribe);
        
        // Set up heartbeat to keep connection alive
        heartbeatTimerRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              // Send ping and store timestamp for latency calculation
              pingTimestampRef.current = Date.now();
              wsRef.current.send(JSON.stringify({ action: 'ping' }));
            } catch (error) {
              logger.error(`Heartbeat error: ${error.message}`);
              wsRef.current.close();
            }
          }
        }, heartbeatInterval);
        
        // Set up connection health check
        healthCheckTimerRef.current = setInterval(checkConnectionHealth, heartbeatInterval);
      };
      
      // Handle incoming messages
      wsRef.current.onmessage = (event) => {
        try {
          // Update last message timestamp
          lastMessageTimeRef.current = Date.now();
          
          // Parse message data
          const data = JSON.parse(event.data);
          
          // Update connection stats
          setConnectionStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1
          }));
          
          // Handle different message types
          if (data.type === 'token_update') {
            // Store token data
            setTokenData(prevData => ({
              ...prevData,
              [data.tokenAddress]: {
                ...data,
                lastUpdated: Date.now()
              }
            }));
            
            // Cache token data for low-latency access
            if (data.symbol) {
              setCachedTokenData(data.symbol, {
                ...data,
                lastUpdated: Date.now()
              });
            }
            
            // Update last received message
            setLastMessage({
              type: 'token_update',
              token: data.symbol || data.tokenAddress,
              timestamp: Date.now()
            });
          } else if (data.type === 'subscription_success') {
            logger.info(`Successfully subscribed to ${data.tokens?.length || 0} tokens`);
          } else if (data.type === 'pong') {
            // Heartbeat response received
            logger.debug('Heartbeat acknowledged by server');
            
            // Calculate latency if we have a ping timestamp
            if (pingTimestampRef.current) {
              const latency = Date.now() - pingTimestampRef.current;
              setConnectionStats(prev => ({
                ...prev,
                latency
              }));
              pingTimestampRef.current = null;
            }
          } else if (data.type === 'error') {
            logger.error(`WebSocket error from server: ${data.message}`);
            
            // Check if error is API key related
            if (data.message?.includes('unauthorized') || data.message?.includes('api key')) {
              setIsApiKeyValid(false);
              
              // Report API key error
              if (apiKeyRef.current) {
                apiKeyManager.reportKeyError('shyft', 'auth_error', data.message);
              }
              
              // Force reconnect to get new API key
              wsRef.current.close();
            }
          }
        } catch (error) {
          logger.error(`Error processing WebSocket message: ${error.message}`);
        }
      };
      
      // Handle connection closed
      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeoutId);
        
        setConnectionStatus('disconnected');
        logger.warn(`WebSocket connection closed: Code ${event.code} - ${event.reason || 'No reason provided'}`);
        
        // Update connection stats
        setConnectionStats(prev => ({
          ...prev,
          disconnects: prev.disconnects + 1
        }));
        
        // Reset connection start time
        connectionStartTimeRef.current = null;
        
        // Schedule reconnection
        scheduleReconnect();
      };
      
      // Handle connection errors
      wsRef.current.onerror = (error) => {
        clearTimeout(connectionTimeoutId);
        
        setConnectionStatus('error');
        logger.error(`WebSocket error: ${error.message || 'Unknown error'}`);
        
        // WebSocket will also trigger onclose
      };
    } catch (error) {
      logger.error(`Failed to establish WebSocket connection: ${error.message}`);
      setConnectionStatus('error');
      
      // Schedule reconnection
      scheduleReconnect();
    }
  }, [getWebSocketUrl, heartbeatInterval, checkConnectionHealth, subscribeToTokens, setCachedTokenData]);
  
  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = useCallback(() => {
    reconnectAttemptsRef.current += 1;
    
    if (reconnectAttemptsRef.current > reconnectMaxAttempts) {
      logger.error(`Maximum reconnection attempts (${reconnectMaxAttempts}) reached`);
      setConnectionStatus('failed');
      return;
    }
    
    // Calculate backoff delay: 1s, 2s, 4s, 8s, etc. with a maximum of 30s
    const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
    
    logger.info(`Scheduling reconnection attempt ${reconnectAttemptsRef.current}/${reconnectMaxAttempts} in ${backoffDelay / 1000}s`);
    
    reconnectTimerRef.current = setTimeout(async () => {
      // If API key was invalid, get a new one before reconnecting
      if (!isApiKeyValid) {
        logger.info('Rotating API key before reconnection');
        apiKeyManager.rotateApiKey('shyft');
        setIsApiKeyValid(true);
      }
      
      connectWebSocket();
    }, backoffDelay);
  }, [connectWebSocket, isApiKeyValid, reconnectMaxAttempts]);
  
  /**
   * Add tokens to subscription list
   */
  const addTokenSubscription = useCallback((newTokens) => {
    if (!Array.isArray(newTokens) || newTokens.length === 0) return false;
    
    const tokensToAdd = newTokens.filter(token => !subscriptionsRef.current.has(token));
    if (tokensToAdd.length === 0) return true; // Already subscribed
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      subscribeToTokens(tokensToAdd);
    } else {
      // Just add to set for later subscription when connected
      tokensToAdd.forEach(token => subscriptionsRef.current.add(token));
    }
    
    return true;
  }, [subscribeToTokens]);
  
  /**
   * Get token data with cache fallback
   */
  const getTokenData = useCallback((token) => {
    // First check state
    const stateData = tokenData[token];
    if (stateData) return stateData;
    
    // Then check cache
    return getCachedTokenData(token);
  }, [tokenData, getCachedTokenData]);
  
  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    // Initialize API key manager if needed
    if (!apiKeyManager.initialized) {
      apiKeyManager.init();
    }
    
    // Establish WebSocket connection
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      // Clear all timers
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (healthCheckTimerRef.current) clearInterval(healthCheckTimerRef.current);
      
      // Close WebSocket connection
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore closure errors
        }
      }
    };
  }, [connectWebSocket]);
  
  return {
    connectionStatus,
    tokenData,
    lastMessage,
    isApiKeyValid,
    connectionStats,
    addTokenSubscription,
    getTokenData,
    reconnect: () => {
      logger.info('Manual reconnection requested');
      reconnectAttemptsRef.current = 0;
      connectWebSocket();
    }
  };
};

export default useEnhancedShyftWebSocket;
