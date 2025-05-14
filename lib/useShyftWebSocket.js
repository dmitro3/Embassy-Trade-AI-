'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from './logger';

/**
 * Custom hook for connecting to Shyft WebSocket API for real-time token data
 * 
 * @param {string} wsUrl - WebSocket URL with API key
 * @returns {Object} - WebSocket status and token updates
 */
const useShyftWebSocket = (wsUrl) => {
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [tokenUpdates, setTokenUpdates] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Parse and validate API key from URL
  const getApiKeyFromUrl = useCallback((url) => {
    try {
      if (!url) return null;
      
      const urlObj = new URL(url);
      const apiKey = urlObj.searchParams.get('api_key');
      
      // Validate API key format
      if (!apiKey || apiKey.length < 10) {
        logger.warn('API key may be invalid or too short:', apiKey?.substring(0, 3) + '...');
      }
      
      return apiKey;
    } catch (error) {
      logger.error('Invalid WebSocket URL format:', error);
      return null;
    }
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      if (!wsUrl) {
        logger.warn('No WebSocket URL provided to useShyftWebSocket');
        return;
      }

      // Validate API key
      const apiKey = getApiKeyFromUrl(wsUrl);
      if (!apiKey) {
        logger.error('Missing or invalid API key in WebSocket URL');
        setWsStatus('error');
        return;
      }

      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }      // Create new WebSocket connection with validated URL
      logger.info(`Connecting to Shyft WebSocket with API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
      
      try {
        // Add timeout to handle connection attempts that might hang
        const connectionTimeout = setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            logger.error('WebSocket connection attempt timed out');
            wsRef.current.close();
            setWsStatus('error');
          }
        }, 10000); // 10 second timeout
        
        wsRef.current = new WebSocket(wsUrl);
        setWsStatus('connecting');
        
        // Clear timeout when connection succeeds or fails
        wsRef.current.addEventListener('open', () => clearTimeout(connectionTimeout));
        wsRef.current.addEventListener('error', () => clearTimeout(connectionTimeout));
      } catch (connectionError) {
        logger.error(`WebSocket connection creation failed: ${connectionError.message}`, { 
          module: 'shyftWebsocket',
          apiKey: `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`
        });
        setWsStatus('error');
      }

      // WebSocket event handlers
      wsRef.current.onopen = () => {
        setWsStatus('connected');
        logger.info('Shyft WebSocket connected');
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to token updates
        const subscribeMessage = JSON.stringify({
          action: 'subscribe',
          tokens: [
            'SOL', 'RAY', 'JUP', 'BONK'
          ]
        });
        
        wsRef.current.send(subscribeMessage);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'token_update') {
            setTokenUpdates(prevUpdates => {
              // Update existing token or add new one
              const existingIndex = prevUpdates.findIndex(
                t => t.tokenAddress === data.tokenAddress
              );
              
              if (existingIndex >= 0) {
                const updatedList = [...prevUpdates];
                updatedList[existingIndex] = {
                  ...updatedList[existingIndex],
                  ...data
                };
                return updatedList;
              } else {
                return [...prevUpdates, data];
              }
            });
          } else if (data.type === 'subscription_success') {
            logger.info('Successfully subscribed to token updates');
          } else if (data.type === 'pong') {
            // Heartbeat response
            logger.debug('Received pong from server');
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        setWsStatus('disconnected');
        logger.warn(`Shyft WebSocket disconnected: ${event.code} ${event.reason}`);
        
        // Attempt to reconnect after delay with exponential backoff
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const reconnectDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30 seconds
          logger.info(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${reconnectDelay / 1000} seconds...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          logger.error(`Maximum reconnect attempts (${maxReconnectAttempts}) reached. Please check your API key and network connection.`);
          setWsStatus('failed');
        }
      };      wsRef.current.onerror = (error) => {
        logger.error('Shyft WebSocket error:', error, {
          module: 'shyftWebsocket',
          errorType: 'connection_error',
          url: wsUrl.substring(0, wsUrl.indexOf('?')) // Log URL without API key
        });
        setWsStatus('error');
        
        // Check if error is related to authentication
        if (error.message && error.message.includes('401')) {
          logger.error('Authentication failed. Please check your Shyft API key.', {
            module: 'shyftWebsocket',
            errorType: 'auth_failed'
          });
          
          // Report auth error to key manager for potential rotation
          try {
            const apiKeyManager = require('./apiKeyManager').default;
            if (apiKeyManager && typeof apiKeyManager.reportKeyError === 'function') {
              apiKeyManager.reportKeyError('shyft', 'auth_failed', 'WebSocket authentication failed');
            }
          } catch (importError) {
            // Silent catch if module not available
          }
        }
        
        // Additional diagnostic information
        if (typeof window !== 'undefined') {
          logger.debug('Diagnostic info for WebSocket error:', {
            module: 'shyftWebsocket',
            navigator: {
              onLine: window.navigator.onLine,
              userAgent: window.navigator.userAgent.substring(0, 100)
            }
          });
        }
        
        // The websocket will also trigger onclose after an error
        // so reconnection is handled there
      };
    } catch (error) {
      logger.error('Error setting up WebSocket:', error);
      setWsStatus('error');
    }
  }, [wsUrl, getApiKeyFromUrl]);

  // Initial connection
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl, connectWebSocket]);
  
  // Heartbeat to keep connection alive
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ action: 'ping' }));
        } catch (error) {
          logger.error('Error sending heartbeat ping:', error);
          // If sending ping fails, try to reconnect
          if (wsRef.current) wsRef.current.close();
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, []);

  // Perform a connection status check
  useEffect(() => {
    // If status is error or failed, log detailed info
    if (wsStatus === 'error' || wsStatus === 'failed') {
      logger.info(`WebSocket is in ${wsStatus} state. Consider refreshing your API key.`);
      
      // Log the API key (first 3 and last 3 chars only for security)
      const apiKey = getApiKeyFromUrl(wsUrl);
      if (apiKey) {
        logger.info(`Current API key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
      }
    }
  }, [wsStatus, wsUrl, getApiKeyFromUrl]);

  return { 
    wsStatus, 
    tokenUpdates,
    reconnect: () => {
      logger.info('Manual reconnection initiated');
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      connectWebSocket();
    }
  };
};

export default useShyftWebSocket;
export { useShyftWebSocket };
