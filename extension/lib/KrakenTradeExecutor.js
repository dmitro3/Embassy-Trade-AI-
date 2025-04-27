/**
 * KrakenTradeExecutor.js
 * 
 * A utility for executing trades via Kraken's WebSocket API v2.
 * Handles order placement, modification, and cancellation.
 */

import { getKrakenWebSocketManager } from './KrakenWebSocketManager.js';
import { getAuditLogger } from './AuditLogger.js';
import { ApiKeyStorage } from './SecureStorage.js';

/**
 * Executes trades via Kraken's WebSocket API
 */
class KrakenTradeExecutor {
  /**
   * Create a new Kraken trade executor
   */
  constructor() {
    this.webSocketManager = getKrakenWebSocketManager();
    this.auditLogger = getAuditLogger();
    this.apiKeyStorage = null;
    this.pendingOrders = new Map();
    this.orderCallbacks = new Map();
    this.initialized = false;
    
    // Order status constants
    this.ORDER_STATUS = {
      PENDING: 'pending',
      OPEN: 'open',
      CLOSED: 'closed',
      CANCELED: 'canceled',
      EXPIRED: 'expired',
      FAILED: 'failed'
    };
    
    // Order type constants
    this.ORDER_TYPE = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_LOSS: 'stop-loss',
      TAKE_PROFIT: 'take-profit',
      STOP_LOSS_LIMIT: 'stop-loss-limit',
      TAKE_PROFIT_LIMIT: 'take-profit-limit'
    };
    
    // Order side constants
    this.ORDER_SIDE = {
      BUY: 'buy',
      SELL: 'sell'
    };
    
    // Bind methods to maintain 'this' context
    this._handleOrderUpdate = this._handleOrderUpdate.bind(this);
  }
  
  /**
   * Initialize the trade executor
   * 
   * @param {ApiKeyStorage} apiKeyStorage - The API key storage instance
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(apiKeyStorage) {
    try {
      this.apiKeyStorage = apiKeyStorage;
      
      // Initialize WebSocket manager if not already initialized
      if (!this.webSocketManager.connected.public) {
        await this.webSocketManager.initialize(apiKeyStorage);
      }
      
      // Connect to private WebSocket if not already connected
      if (!this.webSocketManager.connected.private) {
        await this.webSocketManager.connectPrivate();
      }
      
      // Subscribe to own trades and open orders
      await this._subscribeToOrderUpdates();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Kraken trade executor:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to order updates
   * 
   * @returns {Promise<boolean>} - Whether subscription was successful
   * @private
   */
  async _subscribeToOrderUpdates() {
    try {
      // Subscribe to own trades
      const ownTradesResult = await this.webSocketManager.subscribe('ownTrades', '*');
      
      if (!ownTradesResult.success) {
        throw new Error(`Failed to subscribe to own trades: ${ownTradesResult.error}`);
      }
      
      // Subscribe to open orders
      const openOrdersResult = await this.webSocketManager.subscribe('openOrders', '*');
      
      if (!openOrdersResult.success) {
        throw new Error(`Failed to subscribe to open orders: ${openOrdersResult.error}`);
      }
      
      // Add message handlers
      this.webSocketManager.addMessageHandler('ownTrades', this._handleOrderUpdate);
      this.webSocketManager.addMessageHandler('openOrders', this._handleOrderUpdate);
      
      return true;
    } catch (error) {
      console.error('Error subscribing to order updates:', error);
      return false;
    }
  }
  
  /**
   * Place a new order
   * 
   * @param {Object} params - The order parameters
   * @param {string} params.symbol - The trading pair symbol (e.g., 'XBT/USD')
   * @param {string} params.side - The order side ('buy' or 'sell')
   * @param {string} params.orderType - The order type ('market', 'limit', etc.)
   * @param {number} params.volume - The order volume
   * @param {number} [params.price] - The order price (required for limit orders)
   * @param {number} [params.stopPrice] - The stop price (required for stop orders)
   * @param {string} [params.timeInForce] - Time in force ('GTC', 'IOC', 'FOK')
   * @param {boolean} [params.reduceOnly] - Whether the order is reduce-only
   * @param {boolean} [params.postOnly] - Whether the order is post-only
   * @param {string} [params.leverage] - The leverage to use
   * @param {Object} [params.closeOrder] - The close order parameters
   * @returns {Promise<Object>} - The order result
   */
  async placeOrder(params) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Validate parameters
      this._validateOrderParams(params);
      
      // Create order message
      const orderMessage = {
        method: 'add_order',
        params: {
          symbol: params.symbol,
          side: params.side,
          orderType: params.orderType,
          volume: params.volume.toString()
        },
        req_id: this._generateRequestId()
      };
      
      // Add optional parameters
      if (params.price) {
        orderMessage.params.price = params.price.toString();
      }
      
      if (params.stopPrice) {
        orderMessage.params.stopPrice = params.stopPrice.toString();
      }
      
      if (params.timeInForce) {
        orderMessage.params.timeInForce = params.timeInForce;
      }
      
      if (params.reduceOnly !== undefined) {
        orderMessage.params.reduceOnly = params.reduceOnly;
      }
      
      if (params.postOnly !== undefined) {
        orderMessage.params.postOnly = params.postOnly;
      }
      
      if (params.leverage) {
        orderMessage.params.leverage = params.leverage;
      }
      
      if (params.closeOrder) {
        orderMessage.params.closeOrder = params.closeOrder;
      }
      
      // Add order to pending orders
      this.pendingOrders.set(orderMessage.req_id, {
        params,
        status: this.ORDER_STATUS.PENDING,
        timestamp: Date.now()
      });
      
      // Send order message
      const result = await this._sendPrivateRequest(orderMessage);
      
      if (result.success) {
        // Update order with order ID
        const order = this.pendingOrders.get(orderMessage.req_id);
        order.orderId = result.data.order_id;
        order.status = this.ORDER_STATUS.OPEN;
        
        // Log order placement
        this.auditLogger.logTradeExecution({
          platform: 'kraken',
          symbol: params.symbol,
          side: params.side,
          amount: params.volume,
          price: params.price || 'market',
          id: result.data.order_id,
          reason: 'User initiated'
        });
        
        return {
          success: true,
          orderId: result.data.order_id,
          status: order.status
        };
      } else {
        // Update order status
        const order = this.pendingOrders.get(orderMessage.req_id);
        order.status = this.ORDER_STATUS.FAILED;
        order.error = result.error;
        
        throw new Error(result.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Edit an existing order
   * 
   * @param {string} orderId - The order ID to edit
   * @param {Object} params - The order parameters to update
   * @param {number} [params.price] - The new price
   * @param {number} [params.volume] - The new volume
   * @param {number} [params.stopPrice] - The new stop price
   * @returns {Promise<Object>} - The edit result
   */
  async editOrder(orderId, params) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Validate parameters
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      if (!params || Object.keys(params).length === 0) {
        throw new Error('At least one parameter to update is required');
      }
      
      // Create edit message
      const editMessage = {
        method: 'edit_order',
        params: {
          order_id: orderId
        },
        req_id: this._generateRequestId()
      };
      
      // Add parameters to update
      if (params.price) {
        editMessage.params.price = params.price.toString();
      }
      
      if (params.volume) {
        editMessage.params.volume = params.volume.toString();
      }
      
      if (params.stopPrice) {
        editMessage.params.stopPrice = params.stopPrice.toString();
      }
      
      // Send edit message
      const result = await this._sendPrivateRequest(editMessage);
      
      if (result.success) {
        // Log order edit
        this.auditLogger.logEvent('ORDER_EDITED', {
          platform: 'kraken',
          orderId,
          params,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          orderId: result.data.order_id
        };
      } else {
        throw new Error(result.error || 'Failed to edit order');
      }
    } catch (error) {
      console.error('Error editing order:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cancel an order
   * 
   * @param {string} orderId - The order ID to cancel
   * @returns {Promise<Object>} - The cancellation result
   */
  async cancelOrder(orderId) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Validate parameters
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      // Create cancel message
      const cancelMessage = {
        method: 'cancel_order',
        params: {
          order_id: orderId
        },
        req_id: this._generateRequestId()
      };
      
      // Send cancel message
      const result = await this._sendPrivateRequest(cancelMessage);
      
      if (result.success) {
        // Log order cancellation
        this.auditLogger.logEvent('ORDER_CANCELED', {
          platform: 'kraken',
          orderId,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          orderId
        };
      } else {
        throw new Error(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Cancel all orders
   * 
   * @returns {Promise<Object>} - The cancellation result
   */
  async cancelAllOrders() {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Create cancel all message
      const cancelAllMessage = {
        method: 'cancel_all',
        params: {},
        req_id: this._generateRequestId()
      };
      
      // Send cancel all message
      const result = await this._sendPrivateRequest(cancelAllMessage);
      
      if (result.success) {
        // Log order cancellation
        this.auditLogger.logEvent('ALL_ORDERS_CANCELED', {
          platform: 'kraken',
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          count: result.data.count || 0
        };
      } else {
        throw new Error(result.error || 'Failed to cancel all orders');
      }
    } catch (error) {
      console.error('Error canceling all orders:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get open orders
   * 
   * @returns {Promise<Object>} - The open orders
   */
  async getOpenOrders() {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Create get open orders message
      const getOpenOrdersMessage = {
        method: 'get_open_orders',
        params: {},
        req_id: this._generateRequestId()
      };
      
      // Send get open orders message
      const result = await this._sendPrivateRequest(getOpenOrdersMessage);
      
      if (result.success) {
        return {
          success: true,
          orders: result.data.orders || []
        };
      } else {
        throw new Error(result.error || 'Failed to get open orders');
      }
    } catch (error) {
      console.error('Error getting open orders:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get order status
   * 
   * @param {string} orderId - The order ID to get status for
   * @returns {Promise<Object>} - The order status
   */
  async getOrderStatus(orderId) {
    try {
      // Ensure initialized
      if (!this.initialized) {
        throw new Error('Kraken trade executor not initialized');
      }
      
      // Validate parameters
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      // Create get order status message
      const getOrderStatusMessage = {
        method: 'get_order_status',
        params: {
          order_id: orderId
        },
        req_id: this._generateRequestId()
      };
      
      // Send get order status message
      const result = await this._sendPrivateRequest(getOrderStatusMessage);
      
      if (result.success) {
        return {
          success: true,
          order: result.data.order
        };
      } else {
        throw new Error(result.error || 'Failed to get order status');
      }
    } catch (error) {
      console.error('Error getting order status:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Wait for order to be filled
   * 
   * @param {string} orderId - The order ID to wait for
   * @param {number} [timeout=60000] - The timeout in milliseconds
   * @returns {Promise<Object>} - The order result
   */
  async waitForOrderFill(orderId, timeout = 60000) {
    return new Promise((resolve) => {
      try {
        // Ensure initialized
        if (!this.initialized) {
          throw new Error('Kraken trade executor not initialized');
        }
        
        // Validate parameters
        if (!orderId) {
          throw new Error('Order ID is required');
        }
        
        // Check if order is already filled
        this.getOrderStatus(orderId).then((result) => {
          if (result.success) {
            if (result.order.status === this.ORDER_STATUS.CLOSED) {
              resolve({
                success: true,
                order: result.order
              });
              return;
            }
          }
          
          // Add callback for order update
          const callbackId = crypto.randomUUID();
          
          this.orderCallbacks.set(callbackId, {
            orderId,
            callback: (order) => {
              if (order.status === this.ORDER_STATUS.CLOSED) {
                this.orderCallbacks.delete(callbackId);
                resolve({
                  success: true,
                  order
                });
              }
            }
          });
          
          // Set timeout
          setTimeout(() => {
            if (this.orderCallbacks.has(callbackId)) {
              this.orderCallbacks.delete(callbackId);
              resolve({
                success: false,
                error: 'Timeout waiting for order fill'
              });
            }
          }, timeout);
        });
      } catch (error) {
        console.error('Error waiting for order fill:', error);
        
        resolve({
          success: false,
          error: error.message
        });
      }
    });
  }
  
  /**
   * Handle order update
   * 
   * @param {Object} message - The order update message
   * @private
   */
  _handleOrderUpdate(message) {
    try {
      // Process order update
      if (message.channel === 'ownTrades' && message.data) {
        // Handle own trades update
        for (const trade of message.data) {
          // Find order by order ID
          for (const [reqId, order] of this.pendingOrders) {
            if (order.orderId === trade.order_id) {
              // Update order
              order.trades = order.trades || [];
              order.trades.push(trade);
              
              // Check if order is fully filled
              if (trade.remaining === '0') {
                order.status = this.ORDER_STATUS.CLOSED;
              }
              
              // Notify callbacks
              this._notifyOrderCallbacks(order);
              
              break;
            }
          }
        }
      } else if (message.channel === 'openOrders' && message.data) {
        // Handle open orders update
        for (const orderUpdate of message.data) {
          // Find order by order ID
          for (const [reqId, order] of this.pendingOrders) {
            if (order.orderId === orderUpdate.order_id) {
              // Update order status
              if (orderUpdate.status) {
                order.status = orderUpdate.status;
              }
              
              // Notify callbacks
              this._notifyOrderCallbacks(order);
              
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling order update:', error);
    }
  }
  
  /**
   * Notify order callbacks
   * 
   * @param {Object} order - The order
   * @private
   */
  _notifyOrderCallbacks(order) {
    try {
      for (const [callbackId, callbackInfo] of this.orderCallbacks) {
        if (callbackInfo.orderId === order.orderId) {
          try {
            callbackInfo.callback(order);
          } catch (error) {
            console.error('Error in order callback:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error notifying order callbacks:', error);
    }
  }
  
  /**
   * Send a private request
   * 
   * @param {Object} message - The message to send
   * @returns {Promise<Object>} - The response
   * @private
   */
  async _sendPrivateRequest(message) {
    try {
      // Ensure connected to private WebSocket
      if (!this.webSocketManager.connected.private) {
        await this.webSocketManager.connectPrivate();
        
        if (!this.webSocketManager.connected.private) {
          throw new Error('Not connected to Kraken private WebSocket');
        }
      }
      
      // Send request
      return await this.webSocketManager._sendRequest('private', message);
    } catch (error) {
      console.error('Error sending private request:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate order parameters
   * 
   * @param {Object} params - The order parameters
   * @throws {Error} - If parameters are invalid
   * @private
   */
  _validateOrderParams(params) {
    // Check required parameters
    if (!params.symbol) {
      throw new Error('Symbol is required');
    }
    
    if (!params.side) {
      throw new Error('Side is required');
    }
    
    if (!params.orderType) {
      throw new Error('Order type is required');
    }
    
    if (params.volume === undefined || params.volume <= 0) {
      throw new Error('Volume must be greater than 0');
    }
    
    // Check side
    if (params.side !== this.ORDER_SIDE.BUY && params.side !== this.ORDER_SIDE.SELL) {
      throw new Error(`Invalid side: ${params.side}`);
    }
    
    // Check order type
    const validOrderTypes = Object.values(this.ORDER_TYPE);
    if (!validOrderTypes.includes(params.orderType)) {
      throw new Error(`Invalid order type: ${params.orderType}`);
    }
    
    // Check price for limit orders
    if (params.orderType.includes('limit') && (params.price === undefined || params.price <= 0)) {
      throw new Error('Price is required for limit orders and must be greater than 0');
    }
    
    // Check stop price for stop orders
    if (params.orderType.includes('stop') && (params.stopPrice === undefined || params.stopPrice <= 0)) {
      throw new Error('Stop price is required for stop orders and must be greater than 0');
    }
  }
  
  /**
   * Generate a request ID
   * 
   * @returns {string} - The request ID
   * @private
   */
  _generateRequestId() {
    return crypto.randomUUID();
  }
}

/**
 * Singleton instance of the Kraken trade executor
 */
let krakenTradeExecutorInstance = null;

/**
 * Get the Kraken trade executor instance
 * 
 * @returns {KrakenTradeExecutor} - The Kraken trade executor instance
 */
function getKrakenTradeExecutor() {
  if (!krakenTradeExecutorInstance) {
    krakenTradeExecutorInstance = new KrakenTradeExecutor();
  }
  
  return krakenTradeExecutorInstance;
}

export { KrakenTradeExecutor, getKrakenTradeExecutor };
