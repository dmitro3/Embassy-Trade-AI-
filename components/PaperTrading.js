'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/lib/WalletProvider';
import useAlpacaService from '@/lib/alpacaService';
import { useTokenService } from '@/lib/tokenService';
import Image from 'next/image';

export default function PaperTrading() {
  const { connected, publicKey } = useWallet();
  const { 
    account, 
    positions, 
    orders, 
    isLoading, 
    error, 
    getAccount, 
    getPositions, 
    getOrders, 
    placeOrder, 
    cancelOrder,
    getPortfolioHistory 
  } = useAlpacaService();
  
  const { balance: embBalance, burnTokens } = useTokenService();
  
  // Component state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('buy');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [portfolioHistory, setPortfolioHistory] = useState(null);
  const [showEmbBurnModal, setShowEmbBurnModal] = useState(false);
  const [burnAmount, setBurnAmount] = useState(10);
  const [embBurnSuccess, setEmbBurnSuccess] = useState(false);
  const [orderFormError, setOrderFormError] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Popular stock symbols for trading
  const popularSymbols = [
    { symbol: 'AAPL', name: 'Apple Inc.', logo: '/images/stocks/apple.png' },
    { symbol: 'MSFT', name: 'Microsoft', logo: '/images/stocks/microsoft.png' },
    { symbol: 'GOOGL', name: 'Alphabet (Google)', logo: '/images/stocks/google.png' },
    { symbol: 'AMZN', name: 'Amazon', logo: '/images/stocks/amazon.png' },
    { symbol: 'TSLA', name: 'Tesla', logo: '/images/stocks/tesla.png' },
    { symbol: 'META', name: 'Meta Platforms', logo: '/images/stocks/meta.png' },
    { symbol: 'NVDA', name: 'NVIDIA', logo: '/images/stocks/nvidia.png' },
    { symbol: 'JPM', name: 'JPMorgan Chase', logo: '/images/stocks/jpmorgan.png' },
  ];
  
  // Load initial data when component mounts and wallet is connected
  useEffect(() => {
    if (connected) {
      const loadInitialData = async () => {
        try {
          await getAccount();
          await getPositions();
          await getOrders();
          await fetchPortfolioHistory();
        } catch (err) {
          console.error("Error loading paper trading data:", err);
        }
      };
      
      loadInitialData();
    }
  }, [connected]);
  
  // Fetch portfolio performance history
  const fetchPortfolioHistory = async () => {
    try {
      const history = await getPortfolioHistory('1M', '1D');
      setPortfolioHistory(history);
    } catch (err) {
      console.error("Error fetching portfolio history:", err);
    }
  };
  
  // Handle order form submission
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setOrderFormError('');
    setSubmissionResult(null);
    setIsSubmittingOrder(true);
    
    try {
      // Validate form before submitting
      if (!selectedSymbol) {
        throw new Error("Please select a symbol");
      }
      
      if (orderType === 'limit' && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
        throw new Error("Please enter a valid price for limit order");
      }
      
      if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
        throw new Error("Please enter a valid quantity");
      }
      
      // Create order parameters
      const orderParams = {
        symbol: selectedSymbol,
        qty: parseInt(quantity),
        side: orderSide,
        type: orderType,
        time_in_force: 'day'
      };
      
      // Add limit price if order type is limit
      if (orderType === 'limit') {
        orderParams.limit_price = parseFloat(price);
      }
      
      // Submit order to Alpaca API
      const result = await placeOrder(orderParams);
      
      // Handle successful order
      setSubmissionResult({
        success: true,
        message: `${orderSide.toUpperCase()} order placed for ${quantity} ${selectedSymbol} shares`,
        orderId: result.id,
        status: result.status
      });
      
      // Clear form
      setQuantity(1);
      setPrice('');
      
      // Refresh orders list
      await getOrders();
      
      // Add EMB token rewards if order is filled
      if (result.status === 'filled') {
        // Simulate EMB token reward based on order size
        const rewardAmount = Math.round(parseInt(quantity) * 0.5);
        console.log(`User would earn ${rewardAmount} EMB tokens for filled order`);
      }
    } catch (err) {
      console.error("Error placing order:", err);
      setOrderFormError(err.message || "Failed to place order");
      setSubmissionResult({
        success: false,
        message: err.message || "Failed to place order"
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };
  
  // Handle burning EMB tokens for premium features
  const handleBurnEmb = async () => {
    if (!connected || embBalance < burnAmount) {
      return;
    }
    
    try {
      const result = await burnTokens(burnAmount);
      if (result.success) {
        setEmbBurnSuccess(true);
        setTimeout(() => {
          setShowEmbBurnModal(false);
          setEmbBurnSuccess(false);
        }, 3000);
        
        // Enhanced features would be activated here
        console.log(`Successfully burned ${burnAmount} EMB tokens`);
      }
    } catch (err) {
      console.error("Error burning EMB tokens:", err);
    }
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  // Format number with commas
  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };
  
  // Calculate color based on value (positive or negative)
  const getValueColor = (value) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-300';
  };
  
  // Render portfolio summary
  const renderPortfolioSummary = () => {
    if (!account) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2 mb-6 mx-auto"></div>
            <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Paper Trading Account</h3>
          <button 
            onClick={() => getAccount()}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
          >
            Refresh
          </button>
        </div>
        
        <div className="mb-6">
          <div className="text-gray-400 text-sm">Portfolio Value</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(parseFloat(account.portfolio_value))}</div>
          
          <div className="mt-1 flex items-center">
            <span className={`text-sm ${getValueColor(parseFloat(account.profit_loss))}`}>
              {formatCurrency(parseFloat(account.profit_loss))} Today
            </span>
            {parseFloat(account.profit_loss) !== 0 && (
              <span className={`ml-2 text-xs ${getValueColor(parseFloat(account.profit_loss_pct) * 100)}`}>
                ({(parseFloat(account.profit_loss_pct) * 100).toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-xs">Cash Balance</div>
            <div className="text-white font-medium">{formatCurrency(parseFloat(account.cash))}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Buying Power</div>
            <div className="text-white font-medium">{formatCurrency(parseFloat(account.buying_power))}</div>
          </div>
        </div>
        
        {/* EMB Token Integration */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-800/30">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-300">EMB Balance</div>
              <div className="text-lg font-medium text-white">{embBalance || 0} EMB</div>
            </div>
            <button
              onClick={() => setShowEmbBurnModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1.5 px-3 rounded"
              disabled={!connected || embBalance < 10}
            >
              Boost Trading
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Burn EMB tokens to unlock advanced trading features and higher profit opportunities
          </div>
        </div>
      </div>
    );
  };
  
  // Render positions table
  const renderPositions = () => {
    if (isLoading && !positions.length) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (positions.length === 0) {
      return (
        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Open Positions</h3>
          <p className="text-gray-400 mb-6">Start trading to build your portfolio</p>
          <button
            onClick={() => setActiveTab('trade')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Place First Trade
          </button>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Avg. Price</th>
              <th className="px-4 py-3">Current Price</th>
              <th className="px-4 py-3">Market Value</th>
              <th className="px-4 py-3">Profit/Loss</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.asset_id} className="border-b border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-3 font-medium text-white">
                  {position.symbol}
                </td>
                <td className="px-4 py-3">
                  {formatNumber(position.qty)}
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(parseFloat(position.avg_entry_price))}
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(parseFloat(position.current_price))}
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(parseFloat(position.market_value))}
                </td>
                <td className={`px-4 py-3 ${getValueColor(parseFloat(position.unrealized_pl))}`}>
                  {formatCurrency(parseFloat(position.unrealized_pl))}
                  <span className="text-xs ml-1">
                    ({(parseFloat(position.unrealized_plpc) * 100).toFixed(2)}%)
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSymbol(position.symbol);
                        setOrderSide('sell');
                        setQuantity(position.qty);
                        setActiveTab('trade');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
                    >
                      Close
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render orders table
  const renderOrders = () => {
    if (isLoading && !orders.length) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (orders.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <p>No open orders</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-3 font-medium text-white">
                  {order.symbol}
                </td>
                <td className="px-4 py-3 capitalize">
                  {order.type}
                </td>
                <td className={`px-4 py-3 capitalize ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {order.side}
                </td>
                <td className="px-4 py-3">
                  {formatNumber(order.qty)}
                </td>
                <td className="px-4 py-3">
                  {order.type === 'market' ? 'Market' : formatCurrency(parseFloat(order.limit_price))}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.status === 'filled' ? 'bg-green-900/30 text-green-400' : 
                    order.status === 'partially_filled' ? 'bg-blue-900/30 text-blue-400' :
                    order.status === 'canceled' ? 'bg-gray-700/50 text-gray-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {['new', 'accepted', 'pending_new'].includes(order.status) && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-xs py-1 px-2 rounded"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render trade form
  const renderTradeForm = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Place Order</h3>
        
        <form onSubmit={handleSubmitOrder}>
          {/* Symbol Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {popularSymbols.map(stock => (
                <div
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={`cursor-pointer p-3 rounded-lg flex items-center ${
                    selectedSymbol === stock.symbol
                      ? 'bg-blue-900/40 border border-blue-600'
                      : 'bg-gray-700/40 border border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                    <img 
                      src={stock.logo} 
                      alt={stock.symbol}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/stocks/default.png';
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-white">{stock.symbol}</div>
                    <div className="text-xs text-gray-400">{stock.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOrderType('market')}
                className={`py-2 rounded-md ${
                  orderType === 'market'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType('limit')}
                className={`py-2 rounded-md ${
                  orderType === 'limit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Limit
              </button>
            </div>
          </div>
          
          {/* Order Side Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Side</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOrderSide('buy')}
                className={`py-2 rounded-md ${
                  orderSide === 'buy'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('sell')}
                className={`py-2 rounded-md ${
                  orderSide === 'sell'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Sell
              </button>
            </div>
          </div>
          
          {/* Quantity Input */}
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md py-2 px-3"
              required
            />
          </div>
          
          {/* Price Input (for limit orders) */}
          {orderType === 'limit' && (
            <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                Limit Price
              </label>
              <input
                type="text"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md py-2 px-3"
                required
              />
            </div>
          )}
          
          {/* Error Messages */}
          {orderFormError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
              {orderFormError}
            </div>
          )}
          
          {/* Order Submission Result */}
          {submissionResult && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              submissionResult.success 
                ? 'bg-green-900/30 border border-green-800 text-green-400' 
                : 'bg-red-900/30 border border-red-800 text-red-400'
            }`}>
              {submissionResult.message}
              {submissionResult.orderId && (
                <div className="mt-1 text-xs">Order ID: {submissionResult.orderId}</div>
              )}
            </div>
          )}
          
          {/* Submit Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmittingOrder}
              className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                orderSide === 'buy'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } ${isSubmittingOrder ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmittingOrder ? (
                <span className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedSymbol}`
              )}
            </button>
          </div>
          
          {/* EMB Rewards Note */}
          <div className="mt-4 text-xs text-gray-400 text-center">
            Trade to earn EMB tokens - successful trades earn rewards!
          </div>
        </form>
      </div>
    );
  };
  
  // Main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {renderPortfolioSummary()}
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Positions</h3>
              {renderPositions()}
            </div>
          </div>
        );
      
      case 'positions':
        return (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Positions</h3>
              <button 
                onClick={() => getPositions()}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
              >
                Refresh
              </button>
            </div>
            {renderPositions()}
          </div>
        );
      
      case 'orders':
        return (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Orders</h3>
              <button 
                onClick={() => getOrders()}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
              >
                Refresh
              </button>
            </div>
            {renderOrders()}
          </div>
        );
      
      case 'trade':
        return renderTradeForm();
      
      default:
        return <div>Invalid tab selection</div>;
    }
  };
  
  // EMB Token Burn Modal
  const renderEmbBurnModal = () => {
    if (!showEmbBurnModal) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-xl font-semibold text-white mb-4">
            Boost Your Trading Experience
          </h3>
          
          {embBurnSuccess ? (
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-900/30 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 mb-2">Success! Your trading experience is now boosted.</p>
              <p className="text-gray-400 text-sm">
                You've unlocked premium trading features for the next 24 hours.
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-300 mb-4">
                Burn EMB tokens to enhance your paper trading experience with:
              </p>
              
              <ul className="mb-6 space-y-2 text-sm">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300">Advanced market analysis tools</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300">Real-time trade signals and alerts</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-300">2x EMB token rewards for profitable trades</span>
                </li>
              </ul>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount of EMB to burn
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none"
                />
                <div className="flex justify-between mt-2">
                  <div className="text-sm text-gray-400">10 EMB</div>
                  <div className="text-sm font-medium text-white">{burnAmount} EMB</div>
                  <div className="text-sm text-gray-400">100 EMB</div>
                </div>
                <div className="text-center mt-2 text-xs text-gray-400">
                  Higher amounts unlock better features and longer durations
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEmbBurnModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBurnEmb}
                  disabled={!connected || embBalance < burnAmount}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    connected && embBalance >= burnAmount
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Burn {burnAmount} EMB
                </button>
              </div>
              
              {(!connected || embBalance < burnAmount) && (
                <div className="mt-3 text-xs text-center text-red-400">
                  {!connected 
                    ? 'Please connect your wallet first'
                    : `Insufficient EMB balance (${embBalance} EMB available)`
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  // If user isn't connected, show connection prompt
  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Paper Trading with EMB</h2>
          <p className="text-gray-300 mb-8">
            Connect your wallet to access paper trading features and earn EMB token rewards
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={() => window.walletConnectionModal?.show()}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Connect Wallet
            </button>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Why connect your wallet?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="p-4 bg-gray-700/40 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">Practice Trading</h4>
                <p className="text-sm text-gray-300">
                  Hone your skills with paper trading before risking real funds
                </p>
              </div>
              <div className="p-4 bg-gray-700/40 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">Earn EMB Tokens</h4>
                <p className="text-sm text-gray-300">
                  Get EMB token rewards for successful paper trades
                </p>
              </div>
              <div className="p-4 bg-gray-700/40 rounded-lg">
                <h4 className="font-medium text-blue-400 mb-2">Unlock Features</h4>
                <p className="text-sm text-gray-300">
                  Burn EMB tokens to unlock premium trading features
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-800">
        <nav className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 mr-4 font-medium whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-3 mr-4 font-medium whitespace-nowrap ${
              activeTab === 'positions'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 mr-4 font-medium whitespace-nowrap ${
              activeTab === 'orders'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('trade')}
            className={`px-4 py-3 mr-4 font-medium whitespace-nowrap ${
              activeTab === 'trade'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Trade
          </button>
        </nav>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-800/40 text-red-400 px-4 py-3 rounded">
          <div className="font-medium">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      
      {/* Main Content */}
      {renderContent()}
      
      {/* EMB Token Burn Modal */}
      {renderEmbBurnModal()}
    </div>
  );
}