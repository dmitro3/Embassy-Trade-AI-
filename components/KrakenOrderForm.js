'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import tradeExecutionService from '../lib/tradeExecutionService';
import logger from '../lib/logger';

/**
 * KrakenOrderForm Component
 * 
 * This component provides a user interface for placing orders on Kraken
 * through the TradeForce AI trading system.
 */
const KrakenOrderForm = ({ isConnected = false, onOrderPlaced }) => {
  // Order form state
  const [formState, setFormState] = useState({
    pair: 'SOLUSD',
    type: 'buy',
    ordertype: 'limit',
    price: '',
    volume: '',
    validate: true,
  });
  
  // Available pairs for trading
  const [availablePairs, setAvailablePairs] = useState([
    'SOLUSD',
    'BTCUSD',
    'ETHUSD',
    'USDCUSD',
    'BONKUSD'
  ]);
  
  // Component state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Load available pairs on component mount
  useEffect(() => {
    const loadAssetPairs = async () => {
      try {
        // Import and initialize the Kraken service
        const module = await import('../lib/krakenTradingService');
        const krakenService = module.default;
        
        // Initialize the service
        await krakenService.initialize();
        
        // Fetch asset pairs
        await krakenService.refreshAssetPairs();
        
        // Get all asset pairs that include USD
        const pairs = Object.values(await krakenService.publicRequest('AssetPairs'))
          .filter(pair => pair.quote === 'ZUSD' || pair.quote === 'USD')
          .map(pair => pair.altname || pair.wsname)
          .filter(Boolean);
        
        if (pairs.length > 0) {
          setAvailablePairs(pairs);
        }
      } catch (error) {
        logger.error('Failed to load Kraken asset pairs:', error);
        // Keep the default pairs if loading fails
      }
    };
    
    if (isConnected) {
      loadAssetPairs();
    }
  }, [isConnected]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormState(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setOrderResult(null);
    
    try {
      if (!isConnected) {
        throw new Error('Kraken is not connected. Please connect before placing orders.');
      }
      
      // Validate the form
      if (!formState.pair) {
        throw new Error('Please select a trading pair.');
      }
      
      if (formState.ordertype === 'limit' && (!formState.price || parseFloat(formState.price) <= 0)) {
        throw new Error('Please enter a valid price for limit orders.');
      }
      
      if (!formState.volume || parseFloat(formState.volume) <= 0) {
        throw new Error('Please enter a valid volume.');
      }
      
      // Execute the trade
      const result = await tradeExecutionService.executeKrakenTrade({
        pair: formState.pair,
        type: formState.type,
        ordertype: formState.ordertype,
        price: formState.ordertype === 'limit' ? formState.price : undefined,
        volume: formState.volume,
        validate: formState.validate,
      });
      
      // Handle the result
      setOrderResult(result);
      
      if (result.success) {
        if (result.validateOnly) {
          toast.success('Order validation successful! Order not placed.');
        } else {
          toast.success('Order placed successfully!');
          // Notify parent component
          if (onOrderPlaced) {
            onOrderPlaced(result);
          }
        }
      } else {
        setErrorMessage(result.error || 'Unknown error occurred');
        toast.error(`Order failed: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(error.message);
      toast.error(error.message);
      logger.error('Error placing order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render preview of order details
  const renderOrderPreview = () => {
    const { pair, type, ordertype, price, volume } = formState;
    const totalValue = ordertype === 'limit' && price && volume 
      ? (parseFloat(price) * parseFloat(volume)).toFixed(2)
      : 'Market price';
    
    return (
      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md mt-3">
        <h4 className="text-sm font-bold mb-2">Order Preview</h4>
        <p className="text-xs">
          {type.toUpperCase()} {volume} {pair.substring(0, 3)} 
          {ordertype === 'limit' ? ` at ${price} USD` : ' at market price'}
        </p>
        <p className="text-xs mt-1">
          Estimated total: {totalValue} USD
        </p>
        {formState.validate && (
          <p className="text-xs mt-2 text-amber-500">
            <strong>Note:</strong> This is a validation only. No real order will be placed.
          </p>
        )}
      </div>
    );
  };
  
  // Render the result of order placement
  const renderOrderResult = () => {
    if (!orderResult) return null;
    
    return (
      <div className={`p-3 mt-3 rounded-md ${orderResult.success ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
        <h4 className="text-sm font-bold mb-1">{orderResult.success ? 'Order Success' : 'Order Failed'}</h4>
        
        {orderResult.success ? (
          <>
            {orderResult.validateOnly ? (
              <p className="text-xs">Order validation passed. No real order was placed.</p>
            ) : (
              <>
                <p className="text-xs">Transaction ID: {orderResult.transactionId}</p>
                <p className="text-xs mt-1">Status: Order submitted to Kraken</p>
              </>
            )}
          </>
        ) : (
          <p className="text-xs text-red-600 dark:text-red-400">{orderResult.error}</p>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3">Place Kraken Order</h3>
        
        {!isConnected && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
            <p className="text-sm">Kraken is not connected. Please connect before placing orders.</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Trading pair */}
          <div className="mb-4">
            <label htmlFor="pair" className="block text-sm font-medium mb-1">Trading Pair</label>
            <select
              id="pair"
              name="pair"
              value={formState.pair}
              onChange={handleInputChange}
              disabled={!isConnected || isSubmitting}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {availablePairs.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>
          
          {/* Order type (buy/sell) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Order Side</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="buy"
                  checked={formState.type === 'buy'}
                  onChange={handleInputChange}
                  disabled={!isConnected || isSubmitting}
                  className="mr-2"
                />
                <span className="text-green-600 dark:text-green-400">Buy</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="sell"
                  checked={formState.type === 'sell'}
                  onChange={handleInputChange}
                  disabled={!isConnected || isSubmitting}
                  className="mr-2"
                />
                <span className="text-red-600 dark:text-red-400">Sell</span>
              </label>
            </div>
          </div>
          
          {/* Order type (limit/market) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ordertype"
                  value="limit"
                  checked={formState.ordertype === 'limit'}
                  onChange={handleInputChange}
                  disabled={!isConnected || isSubmitting}
                  className="mr-2"
                />
                <span>Limit</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="ordertype"
                  value="market"
                  checked={formState.ordertype === 'market'}
                  onChange={handleInputChange}
                  disabled={!isConnected || isSubmitting}
                  className="mr-2"
                />
                <span>Market</span>
              </label>
            </div>
          </div>
          
          {/* Price (for limit orders) */}
          {formState.ordertype === 'limit' && (
            <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium mb-1">Price (USD)</label>
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formState.price}
                onChange={handleInputChange}
                disabled={!isConnected || isSubmitting}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Enter price per unit"
                required
              />
            </div>
          )}
          
          {/* Volume */}
          <div className="mb-4">
            <label htmlFor="volume" className="block text-sm font-medium mb-1">Amount</label>
            <input
              id="volume"
              name="volume"
              type="number"
              step="0.00000001"
              min="0.00000001"
              value={formState.volume}
              onChange={handleInputChange}
              disabled={!isConnected || isSubmitting}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Enter amount to trade"
              required
            />
          </div>
          
          {/* Validate only checkbox */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="validate"
                checked={formState.validate}
                onChange={handleInputChange}
                disabled={!isConnected || isSubmitting}
                className="mr-2"
              />
              <span className="text-sm">Validate only (no real order)</span>
            </label>
          </div>
          
          {/* Order preview */}
          {formState.pair && (formState.ordertype !== 'limit' || formState.price) && formState.volume && 
            renderOrderPreview()}
          
          {/* Error message */}
          {errorMessage && (
            <div className="mt-3 p-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md">
              {errorMessage}
            </div>
          )}
          
          {/* Order result */}
          {orderResult && renderOrderResult()}
          
          {/* Submit button */}
          <div className="mt-5">
            <button
              type="submit"
              disabled={!isConnected || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md text-sm font-medium"
            >
              {isSubmitting ? 'Processing...' : formState.validate ? 'Validate Order' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KrakenOrderForm;
