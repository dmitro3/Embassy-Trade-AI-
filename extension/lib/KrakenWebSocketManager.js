/**
 * KrakenWebSocketManager.js
 * 
 * A utility for managing WebSocket connections to Kraken's API v2.
 * Handles public and private connections, reconnection logic, and subscription management.
 */

import { getAuditLogger } from './AuditLogger.js';
import { ApiKeyStorage } from './SecureStorage.js';

/**
 * Manages WebSocket connections to Kraken's API
 */
class KrakenWebSocketManager {
  /**
   * Create a new Kraken WebSocket manager
   */
  constructor() {
    // WebSocket endpoints
    this.endpoints = {
      public: 'wss://ws.kraken.com/v2',
      private: 'wss://ws-auth.kraken.com/v2'
    };
    
    // WebSocket connections
    this.sockets = {
      public: null,
      private: null
    };
    
    // Connection status
    this.connected = {
      public: false,
      private: false
    };
    
    // Reconnection parameters
    this.reconnectAttempts = {
      public: 0,
      private: 0
    };
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Base delay in ms
    this.maxReconnectDelay = 30000; // Max 30 seconds
    
    // Rate limiting
    this.messageRateLimit = 50; // messages per second
    this.messageRatePeriod = 1000; // 1 second
    this.messagesSent = {
      public: 0,
      private: 0
    };
    this.messageQueues = {
      public: [],
      private: []
    };
    this.rateLimitTimers = {
      public: null,
      private: null
    };
    
    // Subscription management
    this.subscriptions = new Map();
    this.pendingRequests = new Map();
    this.messageHandlers = new Map();
    
    // Request ID counter
    this.requestId = 1;
    
    // Dependencies
    this.apiKeyStorage = null;
    this.auditLogger = getAuditLogger();
    
    // Bind methods to maintain 'this' context
    this._handleOpen = this._handleOpen.bind(this);
    this._handleClose = this._handleClose.bind(this);
    this._handleError = this._handleError.bind(this);
    this._handleMessage = this._handleMessage.bind(this);
  }
  
  /**
   * Initialize the WebSocket manager
   * 
   * @param {ApiKeyStorage} apiKeyStorage - The API key storage instance
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(apiKeyStorage) {
    try {
      this.apiKeyStorage = apiKeyStorage;
      
      // Connect to public WebSocket
      await this.connectPublic();
      
      // Set up rate limit reset timers
      this._setupRateLimitTimers();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Kraken WebSocket manager:', error);
      return false;
    }
  }
  
  /**
   * Connect to the public WebSocket
   * 
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async connectPublic() {
    return new Promise((resolve) => {
      try {
        // Close existing connection if any
        if (this.sockets.public) {
          this.sockets.public.close();
        }
        
        // Create new WebSocket connection
        this.sockets.public = new WebSocket(this.endpoints.public);
        
        // Set up event handlers
        this.sockets.public.onopen = (event) => {
          this._handleOpen('public', event);
          resolve(true);
        };
        this.sockets.public.onclose = (event) => this._handleClose('public', event);
        this.sockets.public.onerror = (event) => this._handleError('public', event);
        this.sockets.public.onmessage = (event) => this._handleMessage('public', event);
        
        // Set a timeout for connection
        setTimeout(() => {
          if (!this.connected.public) {
            console.error('Timeout connecting to Kraken public WebSocket');
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.error('Error connecting to Kraken public WebSocket:', error);
        this._scheduleReconnect('public');
        resolve(false);
      }
    });
  }
  
  /**
   * Connect to the private WebSocket
   * 
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async connectPrivate() {
    return new Promise(async (resolve) => {
      try {
        // Check if API key is available
        if (!this.apiKeyStorage) {
          throw new Error('API key storage not initialized');
        }
        
        // Get Kraken API key
        const apiKey = await this.apiKeyStorage.getApiKey('kraken');
        
        if (!apiKey) {
          throw new Error('Kraken API key not found');
        }
        
        // Close existing connection if any
        if (this.sockets.private) {
          this.sockets.private.close();
        }
        
        // Create new WebSocket connection
        this.sockets.private = new WebSocket(this.endpoints.private);
        
        // Set up event handlers
        this.sockets.private.onopen = async (event) => {
          this._handleOpen('private', event);
          
          // Authenticate after connection is established
          try {
            const authenticated = await this._authenticate(apiKey);
            if (!authenticated) {
              console.error('Failed to authenticate with Kraken private WebSocket');
              this.sockets.private.close();
              resolve(false);
              return;
            }
            
            // Log successful authentication
            this.auditLogger.logEvent('KRAKEN_WEBSOCKET_AUTHENTICATED', {
              timestamp: new Date().toISOString()
            });
            
            resolve(true);
          } catch (error) {
            console.error('Error authenticating with Kraken private WebSocket:', error);
            this.sockets.private.close();
            resolve(false);
          }
        };
        this.sockets.private.onclose = (event) => this._handleClose('private', event);
        this.sockets.private.onerror = (event) => this._handleError('private', event);
        this.sockets.private.onmessage = (event) => this._handleMessage('private', event);
        
        // Set a timeout for connection
        setTimeout(() => {
          if (!this.connected.private) {
            console.error('Timeout connecting to Kraken private WebSocket');
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.error('Error connecting to Kraken private WebSocket:', error);
        this._scheduleReconnect('private');
        resolve(false);
      }
    });
  }
  
  /**
   * Authenticate with the private WebSocket
   * 
   * @param {Object} apiKey - The Kraken API key
   * @returns {Promise<boolean>} - Whether authentication was successful
   * @private
   */
  async _authenticate(apiKey) {
    return new Promise((resolve) => {
      try {
        // Generate authentication token
        const token = this._generateAuthToken(apiKey);
        
        // Create authentication message
        const authMessage = {
          method: 'login',
          params: {
            token
          },
          req_id: this._getNextRequestId()
        };
        
        // Set up a one-time message handler for the auth response
        const authHandler = (message) => {
          try {
            const data = JSON.parse(message.data);
            
            // Check if this is the auth response
            if (data.req_id === authMessage.req_id) {
              // Remove the handler
              this.sockets.private.removeEventListener('message', authHandler);
              
              // Check if authentication was successful
              if (data.result === 'success') {
                resolve(true);
              } else {
                console.error('Authentication failed:', data.error || 'Unknown error');
                resolve(false);
              }
            }
          } catch (error) {
            console.error('Error handling authentication response:', error);
            resolve(false);
          }
        };
        
        // Add the handler
        this.sockets.private.addEventListener('message', authHandler);
        
        // Send the authentication message
        this.sockets.private.send(JSON.stringify(authMessage));
        
        // Set a timeout for authentication
        setTimeout(() => {
          this.sockets.private.removeEventListener('message', authHandler);
          resolve(false);
        }, 5000);
      } catch (error) {
        console.error('Error authenticating with Kraken private WebSocket:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Generate an authentication token
   * 
   * @param {Object} apiKey - The Kraken API key
   * @returns {string} - The authentication token
   * @private
   */
  _generateAuthToken(apiKey) {
    // In a real implementation, this would generate a token using the API key and secret
    // For now, we'll just return a placeholder
    return apiKey.token || 'placeholder_token';
  }
  
  /**
   * Subscribe to a channel
   * 
   * @param {string} channel - The channel to subscribe to
   * @param {string|string[]} symbols - The symbol(s) to subscribe to
   * @param {Object} params - Additional parameters for the subscription
   * @returns {Promise<Object>} - The subscription result
   */
  async subscribe(channel, symbols, params = {}) {
    try {
      // Normalize symbols to array
      const symbolsArray = Array.isArray(symbols) ? symbols : [symbols];
      
      // Create subscription key
      const subscriptionKey = this._createSubscriptionKey(channel, symbolsArray, params);
      
      // Check if already subscribed
      if (this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          subscriptionKey,
          message: 'Already subscribed'
        };
      }
      
      // Determine if this is a public or private subscription
      const type = this._isPrivateChannel(channel) ? 'private' : 'public';
      
      // Ensure connection is established
      if (!this.connected[type]) {
        if (type === 'public') {
          await this.connectPublic();
        } else {
          await this.connectPrivate();
        }
        
        if (!this.connected[type]) {
          throw new Error(`Not connected to Kraken ${type} WebSocket`);
        }
      }
      
      // Create subscription message
      const subscriptionMessage = {
        method: 'subscribe',
        params: {
          channel,
          symbol: symbolsArray
        },
        req_id: this._getNextRequestId()
      };
      
      // Add additional parameters
      if (Object.keys(params).length > 0) {
        subscriptionMessage.params = {
          ...subscriptionMessage.params,
          ...params
        };
      }
      
      // Send subscription message
      const result = await this._sendRequest(type, subscriptionMessage);
      
      if (result.success) {
        // Store subscription
        this.subscriptions.set(subscriptionKey, {
          channel,
          symbols: symbolsArray,
          params,
          type,
          subscriptionId: result.data.subscription_id
        });
        
        // Log subscription
        this.auditLogger.logEvent('KRAKEN_WEBSOCKET_SUBSCRIBED', {
          channel,
          symbols: symbolsArray,
          params,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          subscriptionKey,
          subscriptionId: result.data.subscription_id
        };
      } else {
        throw new Error(result.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error(`Error subscribing to ${channel}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Unsubscribe from a channel
   * 
   * @param {string} subscriptionKey - The subscription key to unsubscribe from
   * @returns {Promise<Object>} - The unsubscription result
   */
  async unsubscribe(subscriptionKey) {
    try {
      // Check if subscribed
      if (!this.subscriptions.has(subscriptionKey)) {
        return {
          success: true,
          message: 'Not subscribed'
        };
      }
      
      // Get subscription
      const subscription = this.subscriptions.get(subscriptionKey);
      
      // Ensure connection is established
      if (!this.connected[subscription.type]) {
        throw new Error(`Not connected to Kraken ${subscription.type} WebSocket`);
      }
      
      // Create unsubscription message
      const unsubscriptionMessage = {
        method: 'unsubscribe',
        params: {
          subscription_id: subscription.subscriptionId
        },
        req_id: this._getNextRequestId()
      };
      
      // Send unsubscription message
      const result = await this._sendRequest(subscription.type, unsubscriptionMessage);
      
      if (result.success) {
        // Remove subscription
        this.subscriptions.delete(subscriptionKey);
        
        // Log unsubscription
        this.auditLogger.logEvent('KRAKEN_WEBSOCKET_UNSUBSCRIBED', {
          channel: subscription.channel,
          symbols: subscription.symbols,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true
        };
      } else {
        throw new Error(result.error || 'Failed to unsubscribe');
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send a request to the WebSocket
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {Object} message - The message to send
   * @returns {Promise<Object>} - The response
   * @private
   */
  async _sendRequest(type, message) {
    return new Promise((resolve) => {
      try {
        // Ensure connection is established
        if (!this.connected[type]) {
          throw new Error(`Not connected to Kraken ${type} WebSocket`);
        }
        
        // Add request to pending requests
        this.pendingRequests.set(message.req_id, {
          resolve,
          timestamp: Date.now(),
          message
        });
        
        // Send message
        this._sendMessage(type, message);
        
        // Set a timeout for the request
        setTimeout(() => {
          if (this.pendingRequests.has(message.req_id)) {
            // Remove request from pending requests
            this.pendingRequests.delete(message.req_id);
            
            // Resolve with timeout error
            resolve({
              success: false,
              error: 'Request timed out'
            });
          }
        }, 10000);
      } catch (error) {
        console.error('Error sending request:', error);
        resolve({
          success: false,
          error: error.message
        });
      }
    });
  }
  
  /**
   * Send a message to the WebSocket
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {Object} message - The message to send
   * @private
   */
  _sendMessage(type, message) {
    try {
      // Convert message to string if it's an object
      const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
      
      // Add to queue
      this.messageQueues[type].push(messageString);
      
      // Process queue
      this._processQueue(type);
    } catch (error) {
      console.error(`Error sending message to ${type} WebSocket:`, error);
    }
  }
  
  /**
   * Process the message queue
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @private
   */
  _processQueue(type) {
    try {
      // Check if connected
      if (!this.connected[type]) {
        return;
      }
      
      // Check if rate limited
      if (this.messagesSent[type] >= this.messageRateLimit) {
        return;
      }
      
      // Process messages in queue
      while (this.messageQueues[type].length > 0 && this.messagesSent[type] < this.messageRateLimit) {
        const message = this.messageQueues[type].shift();
        
        try {
          this.sockets[type].send(message);
          this.messagesSent[type]++;
        } catch (error) {
          console.error(`Error sending message to ${type} WebSocket:`, error);
          this.messageQueues[type].unshift(message); // Put the message back
          break;
        }
      }
    } catch (error) {
      console.error(`Error processing ${type} message queue:`, error);
    }
  }
  
  /**
   * Set up rate limit timers
   * 
   * @private
   */
  _setupRateLimitTimers() {
    // Clear existing timers
    if (this.rateLimitTimers.public) {
      clearInterval(this.rateLimitTimers.public);
    }
    if (this.rateLimitTimers.private) {
      clearInterval(this.rateLimitTimers.private);
    }
    
    // Set up new timers
    this.rateLimitTimers.public = setInterval(() => {
      this.messagesSent.public = 0;
      this._processQueue('public');
    }, this.messageRatePeriod);
    
    this.rateLimitTimers.private = setInterval(() => {
      this.messagesSent.private = 0;
      this._processQueue('private');
    }, this.messageRatePeriod);
  }
  
  /**
   * Add a message handler
   * 
   * @param {string} channel - The channel to handle messages for
   * @param {Function} handler - The handler function
   * @returns {string} - The handler ID
   */
  addMessageHandler(channel, handler) {
    const handlerId = crypto.randomUUID();
    
    this.messageHandlers.set(handlerId, {
      channel,
      handler
    });
    
    return handlerId;
  }
  
  /**
   * Remove a message handler
   * 
   * @param {string} handlerId - The handler ID to remove
   * @returns {boolean} - Whether the handler was removed
   */
  removeMessageHandler(handlerId) {
    return this.messageHandlers.delete(handlerId);
  }
  
  /**
   * Handle WebSocket open event
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {Event} event - The event
   * @private
   */
  _handleOpen(type, event) {
    console.log(`Kraken ${type} WebSocket connected`);
    
    // Update connection status
    this.connected[type] = true;
    this.reconnectAttempts[type] = 0;
    
    // Log connection
    this.auditLogger.logEvent('KRAKEN_WEBSOCKET_CONNECTED', {
      type,
      timestamp: new Date().toISOString()
    });
    
    // Process any queued messages
    this._processQueue(type);
    
    // Resubscribe to channels if reconnecting
    if (type === 'public') {
      this._resubscribe('public');
    } else if (type === 'private') {
      // Private resubscription happens after authentication
    }
  }
  
  /**
   * Handle WebSocket close event
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {CloseEvent} event - The event
   * @private
   */
  _handleClose(type, event) {
    console.log(`Kraken ${type} WebSocket closed:`, event.code, event.reason);
    
    // Update connection status
    this.connected[type] = false;
    
    // Log disconnection
    this.auditLogger.logEvent('KRAKEN_WEBSOCKET_DISCONNECTED', {
      type,
      code: event.code,
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      this._scheduleReconnect(type);
    }
  }
  
  /**
   * Handle WebSocket error event
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {Event} event - The event
   * @private
   */
  _handleError(type, event) {
    console.error(`Kraken ${type} WebSocket error:`, event);
    
    // Log error
    this.auditLogger.logEvent('KRAKEN_WEBSOCKET_ERROR', {
      type,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Handle WebSocket message event
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @param {MessageEvent} event - The event
   * @private
   */
  _handleMessage(type, event) {
    try {
      // Parse message
      const message = JSON.parse(event.data);
      
      // Handle request responses
      if (message.req_id && this.pendingRequests.has(message.req_id)) {
        const request = this.pendingRequests.get(message.req_id);
        this.pendingRequests.delete(message.req_id);
        
        if (message.result === 'success') {
          request.resolve({
            success: true,
            data: message
          });
        } else {
          request.resolve({
            success: false,
            error: message.error || 'Unknown error'
          });
        }
        
        return;
      }
      
      // Handle subscription messages
      if (message.method === 'subscribe' && message.result === 'success') {
        // Subscription confirmation
        return;
      }
      
      // Handle channel messages
      if (message.channel && message.data) {
        // Route to appropriate handlers
        for (const [handlerId, handlerInfo] of this.messageHandlers) {
          if (handlerInfo.channel === message.channel || handlerInfo.channel === '*') {
            try {
              handlerInfo.handler(message);
            } catch (error) {
              console.error(`Error in message handler for ${message.channel}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error handling ${type} WebSocket message:`, error);
    }
  }
  
  /**
   * Schedule a reconnection attempt
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @private
   */
  _scheduleReconnect(type) {
    if (this.reconnectAttempts[type] >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts reached for Kraken ${type} WebSocket`);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts[type]),
      this.maxReconnectDelay
    );
    
    console.log(`Scheduling reconnect for Kraken ${type} WebSocket in ${delay}ms`);
    
    setTimeout(() => {
      this.reconnectAttempts[type]++;
      
      if (type === 'public') {
        this.connectPublic();
      } else {
        this.connectPrivate();
      }
    }, delay);
  }
  
  /**
   * Resubscribe to channels
   * 
   * @param {string} type - The type of WebSocket ('public' or 'private')
   * @private
   */
  async _resubscribe(type) {
    try {
      // Get subscriptions for this type
      const subscriptionsToRestore = Array.from(this.subscriptions.values())
        .filter(subscription => subscription.type === type);
      
      for (const subscription of subscriptionsToRestore) {
        // Create subscription message
        const subscriptionMessage = {
          method: 'subscribe',
          params: {
            channel: subscription.channel,
            symbol: subscription.symbols
          },
          req_id: this._getNextRequestId()
        };
        
        // Add additional parameters
        if (Object.keys(subscription.params).length > 0) {
          subscriptionMessage.params = {
            ...subscriptionMessage.params,
            ...subscription.params
          };
        }
        
        // Send subscription message
        await this._sendRequest(type, subscriptionMessage);
      }
    } catch (error) {
      console.error(`Error resubscribing to ${type} channels:`, error);
    }
  }
  
  /**
   * Create a subscription key
   * 
   * @param {string} channel - The channel
   * @param {string[]} symbols - The symbols
   * @param {Object} params - Additional parameters
   * @returns {string} - The subscription key
   * @private
   */
  _createSubscriptionKey(channel, symbols, params) {
    return `${channel}:${symbols.sort().join(',')}:${JSON.stringify(params)}`;
  }
  
  /**
   * Check if a channel is private
   * 
   * @param {string} channel - The channel
   * @returns {boolean} - Whether the channel is private
   * @private
   */
  _isPrivateChannel(channel) {
    const privateChannels = [
      'ownTrades',
      'openOrders',
      'balances'
    ];
    
    return privateChannels.includes(channel);
  }
  
  /**
   * Get the next request ID
   * 
   * @returns {number} - The next request ID
   * @private
   */
  _getNextRequestId() {
    return this.requestId++;
  }
  
  /**
   * Disconnect from WebSockets
   */
  disconnect() {
    // Close public WebSocket
    if (this.sockets.public) {
      this.sockets.public.close();
      this.sockets.public = null;
    }
    
    // Close private WebSocket
    if (this.sockets.private) {
      this.sockets.private.close();
      this.sockets.private = null;
    }
    
    // Clear connection status
    this.connected.public = false;
    this.connected.private = false;
    
    // Clear rate limit timers
    if (this.rateLimitTimers.public) {
      clearInterval(this.rateLimitTimers.public);
      this.rateLimitTimers.public = null;
    }
    if (this.rateLimitTimers.private) {
      clearInterval(this.rateLimitTimers.private);
      this.rateLimitTimers.private = null;
    }
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    // Log disconnection
    this.auditLogger.logEvent('KRAKEN_WEBSOCKET_DISCONNECTED', {
      type: 'all',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Singleton instance of the Kraken WebSocket manager
 */
let krakenWebSocketManagerInstance = null;

/**
 * Get the Kraken WebSocket manager instance
 * 
 * @returns {KrakenWebSocketManager} - The Kraken WebSocket manager instance
 */
function getKrakenWebSocketManager() {
  if (!krakenWebSocketManagerInstance) {
    krakenWebSocketManagerInstance = new KrakenWebSocketManager();
  }
  
  return krakenWebSocketManagerInstance;
}

export { KrakenWebSocketManager, getKrakenWebSocketManager };
