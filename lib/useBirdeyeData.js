'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from './logger';
import fallbackMarketService from './fallbackMarketService';
import apiKeyManager from './apiKeyManager';

/**
 * Custom hook for fetching token data from Birdeye API
 * Includes rate limiting protection and fallback mechanisms
 * 
 * @param {string} tokenAddress - Token address to fetch data for
 * @param {string} apiKey - Birdeye API key
 * @returns {Object} Token data, loading state, error state, and refresh function
 */
const useBirdeyeData = (tokenAddress, apiKey) => {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [fetchCount, setFetchCount] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);
  
  // Track consecutive errors for circuit breaking
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const maxConsecutiveErrors = 3;
  
  // Track rate limits for adaptive delay
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lastRateLimitTime, setLastRateLimitTime] = useState(0);
  
  /**
   * Fetch token data from Birdeye API
   */
  const fetchTokenData = useCallback(async () => {
    // Skip if loading
    if (loading) return;
    
    // Exit if no token address or API key
    if (!tokenAddress) {
      setError('No token address provided');
      return;
    }
    
    if (!apiKey) {
      setError('No API key provided');
      return;
    }
    
    // Check if rate limited, use exponential backoff
    if (isRateLimited) {
      const currentTime = Date.now();
      const timeSinceRateLimit = currentTime - lastRateLimitTime;
      const backoffTime = Math.min(30000, 1000 * Math.pow(2, consecutiveErrors)); // Max 30 seconds
      
      if (timeSinceRateLimit < backoffTime) {
        logger.warn(`Rate limiting backoff in effect. Waiting ${(backoffTime - timeSinceRateLimit) / 1000}s before retry`);
        
        // Use fallback immediately when rate limited
        try {
          const fallbackData = await fallbackMarketService.getTokenData(tokenAddress);
          if (fallbackData) {
            setTokenData(fallbackData);
            setUsedFallback(true);
            logger.info(`Used fallback data for ${tokenAddress} while rate limited`);
            
            // Don't clear the rate limited flag, but still return data
            return fallbackData;
          }
        } catch (fallbackError) {
          logger.error(`Fallback service error: ${fallbackError.message}`);
        }
        
        // If fallback also failed, throw error
        throw new Error(`Rate limited. Please wait ${(backoffTime - timeSinceRateLimit) / 1000}s before retrying`);
      } else {
        // Reset rate limit flag after backoff time
        setIsRateLimited(false);
        logger.info('Rate limit backoff period ended, attempting request');
      }
    }
    
    // Progressive delay based on fetch count to avoid rate limiting
    // First few requests are fast, then we add increasing delays
    const delayMs = fetchCount < 3 ? 0 : Math.min(10000, 500 * Math.pow(1.5, fetchCount - 3)); 
    
    if (delayMs > 0) {
      logger.debug(`Adding progressive delay of ${delayMs}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    try {
      setLoading(true);
      setLastRefreshTime(Date.now());
      setFetchCount(prevCount => prevCount + 1);
      
      // Make API request to Birdeye
      const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${tokenAddress}`, {
        headers: {
          'X-API-KEY': apiKey
        }
      });
      
      // Check for rate limiting response
      if (response.status === 429) {
        logger.warn('Birdeye API rate limit reached');
        setIsRateLimited(true);
        setLastRateLimitTime(Date.now());
        setConsecutiveErrors(prev => prev + 1);
        
        // Report to API key manager
        apiKeyManager.reportKeyError('birdeye', 'rate_limit', 'Rate limit reached');
        
        // Try fallback service
        const fallbackData = await fallbackMarketService.getTokenData(tokenAddress);
        if (fallbackData) {
          setTokenData(fallbackData);
          setLoading(false);
          setUsedFallback(true);
          return fallbackData;
        }
        
        throw new Error('Rate limit reached and fallback service failed');
      }
      
      if (!response.ok) {
        throw new Error(`Birdeye API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data is valid
      if (!data || !data.data || !data.data.value) {
        throw new Error('Invalid data received from Birdeye API');
      }
      
      // Reset consecutive errors on success
      setConsecutiveErrors(0);
      
      // Format data
      const formattedData = {
        price: data.data.value,
        priceChange: data.data.priceChange24h || 0,
        volume: data.data.volume24h || 0,
        marketCap: data.data.marketCap || 0,
        lastUpdated: Date.now(),
        source: 'birdeye'
      };
      
      setTokenData(formattedData);
      setError(null);
      setUsedFallback(false);
      setLoading(false);
      
      return formattedData;
    } catch (error) {
      logger.error(`Error fetching data from Birdeye: ${error.message}`);
      setError(error.message);
      setConsecutiveErrors(prev => prev + 1);
      
      // Circuit breaker - if too many consecutive errors, use fallback
      if (consecutiveErrors >= maxConsecutiveErrors) {
        logger.warn(`Circuit breaker triggered after ${consecutiveErrors} consecutive errors`);
        
        try {
          const fallbackData = await fallbackMarketService.getTokenData(tokenAddress);
          if (fallbackData) {
            setTokenData(fallbackData);
            setUsedFallback(true);
            setLoading(false);
            return fallbackData;
          }
        } catch (fallbackError) {
          logger.error(`Fallback service error: ${fallbackError.message}`);
        }
      }
      
      setLoading(false);
      throw error;
    }
  }, [tokenAddress, apiKey, loading, isRateLimited, lastRateLimitTime, consecutiveErrors, fetchCount]);
  
  // Initial fetch on mount
  useEffect(() => {
    if (tokenAddress && apiKey) {
      fetchTokenData().catch(err => {
        logger.error(`Initial data fetch failed: ${err.message}`);
      });
    }
    
    // Set up refresh interval - but with jitter to avoid all clients hitting at same time
    const jitter = Math.random() * 10000; // Random jitter between 0-10 seconds
    const refreshInterval = setInterval(() => {
      fetchTokenData().catch(() => {
        // Silent catch to prevent unhandled promise rejection
      });
    }, 120000 + jitter); // 2 minutes + jitter
    
    return () => clearInterval(refreshInterval);
  }, [tokenAddress, apiKey, fetchTokenData]);
  
  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    return fetchTokenData();
  }, [fetchTokenData]);
  
  return { 
    tokenData, 
    loading, 
    error, 
    refresh,
    lastRefreshTime,
    usedFallback,
    isRateLimited
  };
};

export default useBirdeyeData;
