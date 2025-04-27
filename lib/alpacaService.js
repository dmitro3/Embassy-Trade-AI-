'use client';

import { useState, useEffect } from 'react';

/**
 * Enhanced Alpaca Paper Trading API Service
 * Provides integration with Alpaca's paper trading API for EMB token paper trading
 * with improved error handling and fallbacks
 */
const useAlpacaService = () => {
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Enhanced API configuration with better environment variable handling
  const API_KEY = process.env.NEXT_PUBLIC_ALPACA_API_KEY || '';
  const API_SECRET = process.env.NEXT_PUBLIC_ALPACA_API_SECRET || '';
  const AUTH_TOKEN = process.env.NEXT_PUBLIC_ALPACA_AUTH_TOKEN || '';
  // Use paper API by default but allow override
  const BASE_URL = process.env.NEXT_PUBLIC_ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  // Set separate URL for market data since some data requires a live account
  const DATA_URL = process.env.NEXT_PUBLIC_ALPACA_DATA_URL || 'https://data.alpaca.markets';
  
  // Track simulation mode - set to true by default if API keys aren't available
  const [simulationMode, setSimulationMode] = useState(!API_KEY || !API_SECRET);
  // Track retry attempts
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Debug function to detect environment variables without exposing them
  const debugEnvSetup = () => {
    console.debug("API Keys configured:", {
      apiKey: API_KEY ? 'Present' : 'Missing',
      apiSecret: API_SECRET ? 'Present' : 'Missing',
      authToken: AUTH_TOKEN ? 'Present' : 'Missing',
      baseUrl: BASE_URL,
      dataUrl: DATA_URL,
      simulationMode: simulationMode ? 'Enabled' : 'Disabled'
    });
  };
  
  // Call debug function once during initialization
  useEffect(() => {
    debugEnvSetup();
    
    // Try to check connection on startup
    checkConnection().catch(err => {
      console.warn('Initial connection check failed:', err.message);
    });
  }, []);
  
  /**
   * Make an API request to Alpaca with improved authentication and error handling
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request body for POST/PUT requests
   * @param {boolean} useDataApi - Whether to use the data API instead of trading API
   * @returns {Promise<any>} - Response data
   */
  const apiRequest = async (endpoint, method = 'GET', data = null, useDataApi = false) => {
    const url = `${useDataApi ? DATA_URL : BASE_URL}${endpoint}`;
    
    try {
      // Initialize headers with multiple authentication methods for maximum compatibility
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Set authentication headers using multiple fallback methods
      if (AUTH_TOKEN) {
        // OAuth Bearer token
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      } else if (API_KEY && API_SECRET) {
        // API key basic auth - encode properly for HTTP Basic Auth
        let credentials;
        if (typeof btoa === 'function') {
          credentials = btoa(`${API_KEY}:${API_SECRET}`);
        } else {
          // For Node.js environments
          credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
        }
        
        headers['Authorization'] = `Basic ${credentials}`;
        
        // Some Alpaca endpoints also accept APCA-API-KEY-ID and APCA-API-SECRET-KEY headers
        headers['APCA-API-KEY-ID'] = API_KEY;
        headers['APCA-API-SECRET-KEY'] = API_SECRET;
      } else {
        // If no auth credentials are available, throw early to use simulation mode
        throw new Error('auth_missing');
      }
      
      const options = {
        method,
        headers,
        // Set proper CORS mode
        mode: 'cors',
        credentials: 'same-origin'
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      // Set a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      options.signal = controller.signal;
      
      console.debug(`Calling Alpaca API: ${method} ${url}`);
      const response = await fetch(url, options);
      
      // Clear the timeout as the request has completed
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        let errorData = {};
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (jsonError) {
          // If the error response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Enhanced error handling for specific status codes
        if (response.status === 403 || response.status === 401) {
          // For authentication errors, add more context and try different auth methods
          console.warn('Authentication error with Alpaca API:', errorMessage);
          
          // Try a retry with an alternative auth method if available
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prevCount => prevCount + 1);
            
            // If we failed with basic auth, try the token auth if available, or vice versa
            if (headers['Authorization'].startsWith('Basic') && AUTH_TOKEN) {
              console.debug('Retrying with token authentication...');
              headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
              delete headers['APCA-API-KEY-ID'];
              delete headers['APCA-API-SECRET-KEY'];
              
              // Try again with new auth method
              return apiRequest(endpoint, method, data, useDataApi);
            }
          }
          
          // Check if this is a polygon data request which requires a live account
          if (endpoint.includes('/v1/bars') || endpoint.includes('/v2/aggs')) {
            errorMessage = 'Polygon data access requires a funded live account. Using simulation mode.';
          } else {
            errorMessage = 'Authentication failed with Alpaca API. Using simulated data.';
          }
          
          setSimulationMode(true);
          throw new Error(`auth_error: ${errorMessage}`);
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
          
          // Implement exponential backoff for rate limits
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prevCount => prevCount + 1);
            const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            
            console.debug(`Rate limited, retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            // Try again
            return apiRequest(endpoint, method, data, useDataApi);
          }
        } else if (response.status === 404) {
          errorMessage = 'API endpoint not found. Check the API documentation.';
        } else if (response.status >= 500) {
          errorMessage = 'Alpaca API server error. Please try again later.';
          
          // Retry server errors automatically
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prevCount => prevCount + 1);
            const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            
            console.debug(`Server error, retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            
            // Try again
            return apiRequest(endpoint, method, data, useDataApi);
          }
        }
        
        console.error('API error details:', errorData);
        throw new Error(errorMessage);
      }
      
      // Reset retry count on successful request
      setRetryCount(0);
      
      // Check if response is empty
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.debug(`API response received for ${endpoint}:`, 
          typeof data === 'object' ? 'Object data' : data);
        return data;
      }
      
      console.debug(`API response received for ${endpoint} (non-JSON)`);
      return {};
    } catch (err) {
      // Enhanced error handling with specific action for each error type
      if (err.message?.includes('auth_error') || err.message === 'auth_missing') {
        console.warn('Authentication issue, switching to simulation mode:', err.message);
        setSimulationMode(true);
        setError('Using simulated data due to authentication issues.');
      } else if (err.name === 'AbortError') {
        console.warn('Request timeout, switching to simulation mode');
        setSimulationMode(true);
        setError('API request timed out. Using simulated data.');
      } else {
        console.error('Alpaca API error:', err);
        setError(`API Error: ${err.message}`);
      }
      throw err;
    }
  };

  /**
   * Get account information with enhanced simulation mode
   * @returns {Promise<object>} Account information
   */
  const getAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try real API first, then use simulation as fallback
      if (!simulationMode) {
        try {
          const accountData = await apiRequest('/v2/account');
          setAccount(accountData);
          return accountData;
        } catch (apiError) {
          console.warn('Using simulated account data:', apiError.message);
          setSimulationMode(true);
        }
      }
      
      // Generate more realistic simulated account data
      const simulatedAccount = {
        id: 'simulated-account',
        account_number: 'PA12345678',
        status: 'ACTIVE',
        currency: 'USD',
        cash: '100000',
        portfolio_value: '105432.67',
        buying_power: '300000',
        initial_margin: '0',
        maintenance_margin: '0',
        sma: '0',
        daytrade_count: 0,
        last_equity: '102432.67',
        last_maintenance_margin: '0',
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: new Date().toISOString(),
        trade_suspended_by_user: false,
        multiplier: '4',
        shorting_enabled: true,
        equity: '105432.67',
        last_buying_power: '300000',
        long_market_value: '5432.67',
        short_market_value: '0',
        profit_loss: '432.67',
        profit_loss_pct: '0.0043'
      };
      setAccount(simulatedAccount);
      return simulatedAccount;
    } catch (err) {
      console.error('Error getting account:', err);
      setError('Failed to fetch account information - using simulated account');
      
      // Always return simulated account as fallback
      const fallbackAccount = {
        id: 'fallback-account',
        status: 'ACTIVE',
        currency: 'USD',
        cash: '10000',
        portfolio_value: '10000',
        equity: '10000',
        buying_power: '10000'
      };
      setAccount(fallbackAccount);
      return fallbackAccount;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get positions with better error handling and more robust fallbacks
   * @returns {Promise<array>} Positions
   */
  const getPositions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try real API first, then use simulation as fallback
      if (!simulationMode) {
        try {
          // Log that we're attempting to fetch positions
          console.debug('Attempting to fetch positions from Alpaca API');
          
          const positionsData = await apiRequest('/v2/positions');
          
          // Log successful fetch
          console.debug('Successfully fetched positions:', 
            Array.isArray(positionsData) ? `${positionsData.length} positions` : 'Invalid data format');
          
          setPositions(positionsData);
          return positionsData;
        } catch (apiError) {
          console.warn('Using simulated positions data:', apiError.message);
          
          // If this is a rate limit error, inform the user but don't switch to simulation
          if (apiError.message?.includes('Rate limit')) {
            setError('Rate limit exceeded. Wait a few minutes before trying again.');
            return [];
          }
          
          // Switch to simulation mode for other errors
          setSimulationMode(true);
        }
      }
      
      // Generate more realistic simulated positions
      console.debug('Generating simulated positions data');
      
      // Get current market prices for stocks (simulated)
      const currentPrices = {
        AAPL: 185.92 + (Math.random() * 5 - 2.5),  // Apple
        MSFT: 415.28 + (Math.random() * 8 - 4),    // Microsoft
        NVDA: 875.28 + (Math.random() * 20 - 10),  // Nvidia
        TSLA: 177.67 + (Math.random() * 6 - 3),    // Tesla
        EMB: 10.25 + (Math.random() * 0.5 - 0.25), // Embassy token
      };
      
      // Create a varied portfolio
      const simulatedPositions = [
        {
          asset_id: 'simulated-asset-1',
          symbol: 'AAPL',
          exchange: 'NASDAQ',
          asset_class: 'us_equity',
          avg_entry_price: '180.25',
          qty: '10',
          side: 'long',
          market_value: (currentPrices.AAPL * 10).toFixed(2),
          cost_basis: '1802.50',
          unrealized_pl: (currentPrices.AAPL * 10 - 1802.5).toFixed(2),
          unrealized_plpc: ((currentPrices.AAPL * 10 - 1802.5) / 1802.5).toFixed(4),
          current_price: currentPrices.AAPL.toFixed(2),
          lastday_price: (currentPrices.AAPL - 1.5).toFixed(2),
          change_today: (1.5 / (currentPrices.AAPL - 1.5)).toFixed(4)
        },
        {
          asset_id: 'simulated-asset-2',
          symbol: 'EMB',
          exchange: 'NASDAQ',
          asset_class: 'crypto',
          avg_entry_price: '10.00',
          qty: '1000',
          side: 'long',
          market_value: (currentPrices.EMB * 1000).toFixed(2),
          cost_basis: '10000.00',
          unrealized_pl: (currentPrices.EMB * 1000 - 10000).toFixed(2),
          unrealized_plpc: ((currentPrices.EMB * 1000 - 10000) / 10000).toFixed(4),
          current_price: currentPrices.EMB.toFixed(2),
          lastday_price: (currentPrices.EMB - 0.15).toFixed(2),
          change_today: (0.15 / (currentPrices.EMB - 0.15)).toFixed(4)
        },
        {
          asset_id: 'simulated-asset-3',
          symbol: 'NVDA',
          exchange: 'NASDAQ',
          asset_class: 'us_equity',
          avg_entry_price: '850.00',
          qty: '5',
          side: 'long',
          market_value: (currentPrices.NVDA * 5).toFixed(2),
          cost_basis: '4250.00',
          unrealized_pl: (currentPrices.NVDA * 5 - 4250).toFixed(2),
          unrealized_plpc: ((currentPrices.NVDA * 5 - 4250) / 4250).toFixed(4),
          current_price: currentPrices.NVDA.toFixed(2),
          lastday_price: (currentPrices.NVDA - 15.28).toFixed(2),
          change_today: (15.28 / (currentPrices.NVDA - 15.28)).toFixed(4)
        }
      ];
      
      setPositions(simulatedPositions);
      return simulatedPositions;
    } catch (err) {
      console.error('Error getting positions:', err);
      setError('Using offline mode - connection to trading API unavailable');
      
      // Return basic positions array on error
      const fallbackPositions = [
        {
          asset_id: 'fallback-asset',
          symbol: 'EMB',
          exchange: 'NASDAQ',
          asset_class: 'crypto',
          avg_entry_price: '10.00',
          qty: '100',
          market_value: '1000.00',
          cost_basis: '1000.00',
          current_price: '10.00'
        }
      ];
      setPositions(fallbackPositions);
      return fallbackPositions;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get open orders with improved error handling
   * @param {string} status - Order status ('open', 'closed', 'all')
   * @returns {Promise<array>} Orders
   */
  const getOrders = async (status = 'open') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try real API first, then use simulation as fallback
      if (!simulationMode) {
        try {
          const ordersData = await apiRequest(`/v2/orders?status=${status}`);
          setOrders(ordersData);
          return ordersData;
        } catch (apiError) {
          console.warn('Using simulated orders data:', apiError.message);
          setSimulationMode(true);
        }
      }
      
      // Generate more varied simulated orders
      const currentDate = new Date();
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const simulatedOrders = [
        {
          id: 'simulated-order-1',
          client_order_id: 'clientorder1',
          created_at: yesterday.toISOString(),
          updated_at: yesterday.toISOString(),
          submitted_at: yesterday.toISOString(),
          filled_at: null,
          expired_at: null,
          canceled_at: null,
          failed_at: null,
          replaced_at: null,
          replaced_by: null,
          replaces: null,
          asset_id: 'simulated-asset-3',
          symbol: 'NVDA',
          asset_class: 'us_equity',
          qty: '3',
          filled_qty: '0',
          type: 'limit',
          side: 'buy',
          time_in_force: 'day',
          limit_price: '425.50',
          stop_price: null,
          status: 'new'
        },
        {
          id: 'simulated-order-2',
          client_order_id: 'clientorder2',
          created_at: currentDate.toISOString(),
          updated_at: currentDate.toISOString(),
          submitted_at: currentDate.toISOString(),
          filled_at: null,
          expired_at: null,
          canceled_at: null,
          failed_at: null,
          replaced_at: null,
          replaced_by: null,
          replaces: null,
          asset_id: 'simulated-asset-2',
          symbol: 'EMB',
          asset_class: 'crypto',
          qty: '500',
          filled_qty: '0',
          type: 'market',
          side: 'buy',
          time_in_force: 'day',
          limit_price: null,
          stop_price: null,
          status: 'accepted'
        }
      ];
      
      // Filter orders based on status
      let filteredOrders;
      if (status === 'open') {
        filteredOrders = simulatedOrders.filter(o => 
          ['new', 'accepted', 'pending_new', 'accepted_for_bidding'].includes(o.status));
      } else if (status === 'closed') {
        filteredOrders = simulatedOrders.filter(o => 
          ['filled', 'canceled', 'expired', 'rejected', 'suspended', 'done_for_day'].includes(o.status));
      } else {
        filteredOrders = simulatedOrders;
      }
      
      setOrders(filteredOrders);
      return filteredOrders;
    } catch (err) {
      console.error('Error getting orders:', err);
      setError('Failed to fetch orders - using simulated data');
      
      // Return empty orders array on error
      const fallbackOrders = [];
      setOrders(fallbackOrders);
      return fallbackOrders;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Place an order with improved validation and error checking
   * @param {object} orderParams - Order parameters
   * @returns {Promise<object>} Order information
   */
  const placeOrder = async (orderParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate required parameters
      if (!orderParams.symbol) throw new Error('Symbol is required');
      if (!orderParams.qty) throw new Error('Quantity is required');
      if (!orderParams.side) throw new Error('Side is required');
      if (!orderParams.type) throw new Error('Order type is required');
      if (!orderParams.time_in_force) throw new Error('Time in force is required');
      
      // For limit orders, validate limit price
      if (orderParams.type === 'limit' && !orderParams.limit_price) {
        throw new Error('Limit price is required for limit orders');
      }
      
      // Try real API first, then use simulation as fallback
      if (!simulationMode) {
        try {
          // Log the order being placed (without sensitive details)
          console.debug('Placing order:', { 
            symbol: orderParams.symbol,
            type: orderParams.type,
            side: orderParams.side
          });
          
          const orderResult = await apiRequest('/v2/orders', 'POST', orderParams);
          
          // Refresh orders after placing a new one
          await getOrders();
          
          return orderResult;
        } catch (apiError) {
          console.warn('Error placing order with Alpaca API:', apiError);
          
          // Extract meaningful error message if possible
          let errorMsg = apiError.message;
          if (errorMsg.includes('auth_error')) {
            errorMsg = 'Authentication failed. Using simulated order placement.';
            setSimulationMode(true);
          } else if (apiError.response) {
            errorMsg = apiError.response.data?.message || errorMsg;
          }
          
          setError(errorMsg);
          
          // Only switch to simulation mode for auth errors
          if (apiError.message?.includes('auth_error')) {
            console.warn('Using simulated order placement due to auth error');
            setSimulationMode(true);
          } else {
            // For other errors, bubble them up
            throw new Error(errorMsg);
          }
        }
      }
      
      // Generate a probability of success/failure
      const orderSuccess = Math.random() > 0.1; // 90% success rate
      
      if (!orderSuccess) {
        throw new Error('Simulated order failure - insufficient funds');
      }
      
      // Simulate order response with more details
      const now = new Date();
      const simulatedOrderResult = {
        id: `simulated-order-${Date.now()}`,
        client_order_id: `client-${Date.now()}`,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        submitted_at: now.toISOString(),
        filled_at: Math.random() > 0.3 ? now.toISOString() : null,
        expired_at: null,
        canceled_at: null,
        failed_at: null,
        replaced_at: null,
        replaced_by: null,
        replaces: null,
        asset_id: `simulated-asset-${Date.now()}`,
        symbol: orderParams.symbol,
        asset_class: orderParams.symbol === 'EMB' ? 'crypto' : 'us_equity',
        qty: orderParams.qty,
        filled_qty: Math.random() > 0.3 ? orderParams.qty : '0',
        type: orderParams.type,
        side: orderParams.side,
        time_in_force: orderParams.time_in_force,
        limit_price: orderParams.limit_price || null,
        stop_price: orderParams.stop_price || null,
        status: Math.random() > 0.3 ? 'filled' : 'accepted' // Randomly simulate filled or accepted
      };
      
      // Add to orders immediately for better UX
      setOrders(prevOrders => [...prevOrders, simulatedOrderResult]);
      
      // Update positions if order is filled
      if (simulatedOrderResult.status === 'filled') {
        const currentPositions = [...positions];
        const existingPosition = currentPositions.find(p => p.symbol === orderParams.symbol);
        
        if (existingPosition) {
          // Update existing position
          const qtyChange = parseFloat(orderParams.qty);
          const newQty = parseFloat(existingPosition.qty) + (orderParams.side === 'buy' ? qtyChange : -qtyChange);
          
          existingPosition.qty = newQty.toString();
          existingPosition.market_value = (newQty * parseFloat(existingPosition.current_price)).toFixed(2);
          existingPosition.unrealized_pl = (
            parseFloat(existingPosition.market_value) - parseFloat(existingPosition.cost_basis)
          ).toFixed(2);
          
          setPositions(currentPositions);
        } else if (orderParams.side === 'buy') {
          // Add new position
          const mockPrice = orderParams.limit_price || 
            (orderParams.symbol === 'EMB' ? '10.25' : '100.00');
          
          const newPosition = {
            asset_id: `simulated-position-${Date.now()}`,
            symbol: orderParams.symbol,
            exchange: 'NASDAQ',
            asset_class: orderParams.symbol === 'EMB' ? 'crypto' : 'us_equity',
            avg_entry_price: mockPrice,
            qty: orderParams.qty,
            side: 'long',
            market_value: (parseFloat(mockPrice) * parseFloat(orderParams.qty)).toFixed(2),
            cost_basis: (parseFloat(mockPrice) * parseFloat(orderParams.qty)).toFixed(2),
            unrealized_pl: '0.00',
            unrealized_plpc: '0.0000',
            current_price: mockPrice,
            lastday_price: (parseFloat(mockPrice) * 0.98).toFixed(2),
            change_today: '0.0200'
          };
          
          setPositions([...currentPositions, newPosition]);
        }
      }
      
      return simulatedOrderResult;
    } catch (err) {
      console.error('Error placing order:', err);
      setError(`Failed to place order: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Cancel an order with improved simulation
   * @param {string} orderId - Order ID
   * @returns {Promise<object>} Cancellation result
   */
  const cancelOrder = async (orderId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!orderId) throw new Error('Order ID is required');
      
      // Try real API first, then use simulation as fallback
      if (!simulationMode) {
        try {
          await apiRequest(`/v2/orders/${orderId}`, 'DELETE');
          
          // Refresh orders after cancellation
          await getOrders();
          
          return { success: true, orderId };
        } catch (apiError) {
          console.warn('Using simulated order cancellation:', apiError.message);
          setSimulationMode(true);
        }
      }
      
      // Update local orders state to reflect cancellation
      const now = new Date().toISOString();
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'canceled', canceled_at: now }
            : order
        )
      );
      
      return { success: true, orderId, canceled_at: now };
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError(`Failed to cancel order: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get portfolio history with improved simulation and error handling
   * @param {string} period - Time period ('1D', '1W', '1M', '3M', '1Y', etc.)
   * @param {string} timeframe - Time frame for data points ('1Min', '5Min', '1H', '1D')
   * @returns {Promise<object>} Portfolio history
   */
  const getPortfolioHistory = async (period = '1M', timeframe = '1D') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch real data first if not in simulation mode
      if (!simulationMode) {
        try {
          const historyData = await apiRequest(
            `/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}`
          );
          return historyData;
        } catch (apiError) {
          console.warn('Using simulated portfolio history:', apiError.message);
          setSimulationMode(true);
        }
      }
      
      // Generate more realistic simulated portfolio history data
      const timestamps = [];
      const equity = [];
      const profitLoss = [];
      
      // Start date based on period
      let startDate;
      switch (period) {
        case '1D': startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); break;
        case '1W': startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
        case '1M': startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
        case '3M': startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
        case '1Y': startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
      
      // Time interval based on timeframe
      let interval;
      switch (timeframe) {
        case '1Min': interval = 60 * 1000; break;
        case '5Min': interval = 5 * 60 * 1000; break;
        case '1H': interval = 60 * 60 * 1000; break;
        case '1D': interval = 24 * 60 * 60 * 1000; break;
        default: interval = 24 * 60 * 60 * 1000;
      }
      
      // Number of data points
      let numPoints = Math.ceil((Date.now() - startDate.getTime()) / interval);
      
      // Limit number of data points for performance
      const maxPoints = 500;
      if (numPoints > maxPoints) {
        interval = (Date.now() - startDate.getTime()) / maxPoints;
        numPoints = maxPoints;
      }
      
      let baseEquity = 100000;
      
      // Use a more realistic random walk algorithm with trend and market patterns
      let momentum = 0;
      const volatility = 0.01; // 1% daily volatility
      const trend = 0.0002; // Slight uptrend
      
      // Simulate some market events for more realism
      const marketEvents = [];
      if (period !== '1D' && period !== '1W') {
        // Add some market events for longer periods
        const eventCount = Math.floor(Math.random() * 3) + (period === '1Y' ? 3 : 1);
        
        for (let i = 0; i < eventCount; i++) {
          const eventTime = startDate.getTime() + Math.random() * (Date.now() - startDate.getTime());
          const magnitude = (Math.random() * 0.08) - 0.04; // -4% to +4% event
          marketEvents.push({ time: eventTime, magnitude });
        }
      }
      
      for (let i = 0; i < numPoints; i++) {
        const timestamp = startDate.getTime() + i * interval;
        const date = new Date(timestamp);
        
        // Skip weekends for more realism in longer timeframes
        const dayOfWeek = date.getDay();
        if (timeframe === '1D' && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue;
        }
        
        timestamps.push(timestamp / 1000); // Convert to seconds for API compatibility
        
        // Check for market events
        const event = marketEvents.find(e => 
          Math.abs(e.time - timestamp) < interval / 2
        );
        
        if (event) {
          // Apply market event impact
          baseEquity = baseEquity * (1 + event.magnitude);
          momentum = event.magnitude * baseEquity * 0.3; // Carry some momentum from the event
        } else {
          // Generate random price movement with momentum and trend
          momentum = momentum * 0.9 + (Math.random() - 0.5) * volatility * baseEquity;
          const change = momentum + trend * baseEquity;
          baseEquity += change;
        }
        
        // Ensure value doesn't go below a reasonable amount
        baseEquity = Math.max(baseEquity, 10000);
        
        equity.push(parseFloat(baseEquity.toFixed(2)));
        
        // Calculate profit/loss
        const pl = baseEquity - 100000;
        profitLoss.push(parseFloat(pl.toFixed(2)));
      }
      
      return {
        timestamp: timestamps,
        equity: equity,
        profit_loss: profitLoss,
        profit_loss_pct: profitLoss.map(pl => parseFloat((pl / 100000).toFixed(4))),
        base_value: 100000,
        timeframe
      };
    } catch (err) {
      console.error('Error getting portfolio history:', err);
      setError('Failed to fetch portfolio history - using simulated data');
      
      // Return basic placeholder data on error
      const now = Date.now() / 1000;
      const yesterday = now - 86400;
      return {
        timestamp: [yesterday, now],
        equity: [100000, 100000],
        profit_loss: [0, 0],
        profit_loss_pct: [0, 0],
        base_value: 100000,
        timeframe
      };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get market data for a symbol with proper error handling
   * Uses Alpaca Data API (may require live account for some endpoints)
   * @param {string} symbol - Stock symbol
   * @returns {Promise<object>} Market data
   */
  const getMarketData = async (symbol) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!symbol) throw new Error('Symbol is required');
      
      // Try real API call first (note this uses the data API which may require a live account)
      if (!simulationMode) {
        try {
          // First check if the market is open
          const clockData = await apiRequest('/v2/clock');
          console.debug('Market clock:', clockData);
          
          // Attempt to get last quote
          const endpoint = `/v2/stocks/${symbol}/quotes/latest`;
          const quoteData = await apiRequest(endpoint, 'GET', null, true);
          
          // Format response in a standardized way
          return {
            symbol,
            last: {
              price: quoteData.quote?.ap || quoteData.quote?.p || 0,
              time: new Date(quoteData.quote?.t || Date.now()),
              size: quoteData.quote?.as || quoteData.quote?.s || 0
            },
            bidPrice: quoteData.quote?.bp || 0,
            askPrice: quoteData.quote?.ap || 0,
            bidSize: quoteData.quote?.bs || 0,
            askSize: quoteData.quote?.as || 0,
            volume: quoteData.quote?.v || 0,
            isLive: true
          };
        } catch (apiError) {
          console.warn('Error fetching market data, using simulation:', apiError.message);
          // For data API access errors, we'll just use simulated data
          // Don't switch global simulation mode since this might be specific to the data API
        }
      }
      
      // For demo purposes, generate realistic market data based on symbol
      let basePrice, volatility;
      
      // Set base price and volatility based on symbol
      switch(symbol) {
        case 'AAPL': 
          basePrice = 185.92; 
          volatility = 0.02;
          break;
        case 'MSFT': 
          basePrice = 415.28; 
          volatility = 0.015;
          break;
        case 'NVDA': 
          basePrice = 875.28; 
          volatility = 0.03;
          break;
        case 'TSLA': 
          basePrice = 177.67; 
          volatility = 0.035;
          break;
        case 'EMB':
          basePrice = 10.25;
          volatility = 0.04;
          break;
        default:
          basePrice = 100.00;
          volatility = 0.02;
      }
      
      // Generate price movements
      const lastPrice = basePrice * (1 + (Math.random() - 0.5) * volatility);
      const bidPrice = lastPrice * (1 - Math.random() * 0.001);
      const askPrice = lastPrice * (1 + Math.random() * 0.001);
      const volume = Math.floor(Math.random() * 10000000) + 100000;
      
      const response = {
        symbol,
        last: {
          price: parseFloat(lastPrice.toFixed(4)),
          time: new Date(),
          size: Math.floor(Math.random() * 100) + 1
        },
        bidPrice: parseFloat(bidPrice.toFixed(4)),
        askPrice: parseFloat(askPrice.toFixed(4)),
        bidSize: Math.floor(Math.random() * 100) + 1,
        askSize: Math.floor(Math.random() * 100) + 1,
        volume,
        isLive: false
      };
      
      return response;
    } catch (err) {
      console.error('Error getting market data:', err);
      setError(`Failed to fetch market data: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get historical bars (OHLC data) with better error handling
   * @param {string} symbol - Stock symbol
   * @param {string} timeframe - Timeframe ('1Min', '5Min', '15Min', '1H', '1D')
   * @param {string} start - Start date (ISO format)
   * @param {string} end - End date (ISO format)
   * @returns {Promise<array>} Historical bars
   */
  const getBars = async (symbol, timeframe = '1D', start, end) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!symbol) throw new Error('Symbol is required');
      
      // Set default dates if not provided
      if (!end) end = new Date().toISOString();
      if (!start) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        start = startDate.toISOString();
      }
      
      // Try the real API first - using a different endpoint that doesn't require
      // a live account with Polygon data access
      if (!simulationMode) {
        try {
          // Try v2 API first (which doesn't require Polygon access)
          const barsEndpoint = `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&start=${start}&end=${end}&adjustment=raw`;
          const barsData = await apiRequest(barsEndpoint, 'GET', null, true);
          
          if (barsData.bars && barsData.bars.length > 0) {
            // Format to standard format
            return barsData.bars.map(bar => ({
              t: new Date(bar.t).toISOString(),
              o: bar.o,
              h: bar.h,
              l: bar.l,
              c: bar.c,
              v: bar.v
            }));
          } else {
            console.warn('No bars data returned from API, using simulation');
          }
        } catch (apiError) {
          console.warn('Error fetching bars, using simulation:', apiError.message);
          // Don't set global simulation mode for data API specific issues
        }
      }
      
      // Generate realistic historical bars based on symbol
      let basePrice, volatility, trend;
      
      // Set characteristics based on symbol
      switch(symbol) {
        case 'AAPL': 
          basePrice = 180; 
          volatility = 0.015;
          trend = 0.0005;
          break;
        case 'MSFT': 
          basePrice = 410; 
          volatility = 0.012;
          trend = 0.0007;
          break;
        case 'NVDA': 
          basePrice = 850; 
          volatility = 0.025;
          trend = 0.001;
          break;
        case 'TSLA': 
          basePrice = 175; 
          volatility = 0.03;
          trend = 0.0003;
          break;
        case 'EMB':
          basePrice = 10;
          volatility = 0.04;
          trend = 0.001;
          break;
        default:
          basePrice = 100;
          volatility = 0.02;
          trend = 0;
      }
      
      const bars = [];
      const startDate = new Date(start);
      const endDate = new Date(end);
      let currentDate = new Date(startDate);
      
      // Create a random walk with the parameters
      let price = basePrice;
      
      while (currentDate <= endDate) {
        // Skip weekends for stock symbols
        const dayOfWeek = currentDate.getDay();
        if ((symbol !== 'EMB' && dayOfWeek !== 0 && dayOfWeek !== 6) || symbol === 'EMB') {
          // Generate daily price movement
          // Calculate the day's range
          const dailyVolatility = volatility * basePrice;
          const open = price + (Math.random() - 0.5) * dailyVolatility * 0.3;
          const change = (Math.random() - 0.5) * dailyVolatility + trend * basePrice;
          const close = open + change;
          
          // Calculate high and low with realistic logic
          const highLowRange = dailyVolatility * (0.5 + Math.random() * 0.5);
          const high = Math.max(open, close) + Math.random() * highLowRange * 0.5;
          const low = Math.min(open, close) - Math.random() * highLowRange * 0.5;
          
          bars.push({
            t: currentDate.toISOString(),
            o: parseFloat(open.toFixed(4)),
            h: parseFloat(high.toFixed(4)),
            l: parseFloat(low.toFixed(4)),
            c: parseFloat(close.toFixed(4)),
            v: Math.floor((basePrice * 100000) * (0.5 + Math.random()))
          });
          
          // Update price for next iteration
          price = close;
        }
        
        // Advance to next unit based on timeframe
        switch (timeframe) {
          case '1Min':
            currentDate = new Date(currentDate.getTime() + 60000);
            break;
          case '5Min':
            currentDate = new Date(currentDate.getTime() + 5 * 60000);
            break;
          case '15Min':
            currentDate = new Date(currentDate.getTime() + 15 * 60000);
            break;
          case '1H':
            currentDate = new Date(currentDate.getTime() + 60 * 60000);
            break;
          default: // 1D
            currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      return bars;
    } catch (err) {
      console.error('Error getting bars:', err);
      setError(`Failed to fetch historical data: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Check API connectivity and authenticate
   * @returns {Promise<boolean>} Whether connection was successful
   */
  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we have API keys configured
      if (!API_KEY || !API_SECRET) {
        console.warn('Missing API keys - running in simulation mode');
        setError('API keys not configured. Running in simulation mode.');
        setSimulationMode(true);
        return false;
      }
      
      // Clear any previous retry count
      setRetryCount(0);
      
      // Try to connect to the API
      const data = await apiRequest('/v2/account');
      console.debug('API connection successful, account:', data.id);
      
      // If we got this far, authentication worked
      setSimulationMode(false);
      return true;
    } catch (err) {
      console.error('API connection check failed:', err);
      
      // Set a useful error message
      if (err.message?.includes('auth_error')) {
        setError('Authentication failed. Using simulated data for trading operations.');
      } else {
        setError(`Connection error: ${err.message}. Using simulated data.`);
      }
      
      setSimulationMode(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Force simulation mode on or off
   * @param {boolean} enabled - Whether to enable simulation mode
   */
  const setSimulation = (enabled) => {
    setSimulationMode(enabled);
    console.debug(`${enabled ? 'Enabled' : 'Disabled'} simulation mode manually`);
    
    if (enabled) {
      setError('Using simulated data for trading operations.');
    } else {
      setError(null);
      // Check if we can connect to the real API
      checkConnection().catch(err => {
        console.warn('Failed to reconnect to real API:', err.message);
      });
    }
  };
  
  return {
    // State
    account,
    positions,
    orders,
    watchlists,
    isLoading,
    error,
    simulationMode,
    
    // Methods
    getAccount,
    getPositions,
    getOrders,
    placeOrder,
    cancelOrder,
    getPortfolioHistory,
    getMarketData,
    getBars,
    checkConnection,
    setSimulation
  };
};

export default useAlpacaService;