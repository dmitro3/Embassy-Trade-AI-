// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\TokenDisplay.js
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

/**
 * TokenDisplay Component
 * 
 * Displays token information including logo, price, and market data
 */
const TokenDisplay = ({ token, onClick, showDetails = true }) => {
  const [imageError, setImageError] = useState(false);
  
  // Default fallback image for tokens
  const fallbackImage = '/assets/default-token.svg';
  
  // Handle image loading error
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Format price change with color and sign
  const formatPriceChange = (change) => {
    const value = parseFloat(change);
    if (isNaN(value)) return <span className="text-gray-400">0.00%</span>;
    
    const formattedValue = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    const colorClass = value >= 0 ? 'text-green-400' : 'text-red-400';
    
    return <span className={colorClass}>{formattedValue}</span>;
  };
  
  // Render a skeleton loader if token data is not available
  if (!token) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg animate-pulse">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 shadow-lg transition duration-200 ${onClick ? 'cursor-pointer hover:bg-gray-700' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center mb-3">
        {/* Token Logo */}
        <div className="w-12 h-12 mr-4 relative flex-shrink-0">
          {!imageError && token.logoURI ? (
            <img
              src={token.logoURI}
              alt={token.symbol}
              className="w-full h-full rounded-full"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {token.symbol?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>
        
        {/* Token Basic Info */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{token.symbol || 'Unknown'}</h3>
            {token.price !== undefined && (
              <div className="text-white font-medium">
                ${parseFloat(token.price).toFixed(4)}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="text-sm text-gray-400 truncate" style={{ maxWidth: '150px' }}>
              {token.name || token.symbol || 'Unknown Token'}
            </div>
            {token.priceChange24h !== undefined && (
              <div className="text-sm">
                {formatPriceChange(token.priceChange24h)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Additional token details */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          {token.address && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Address:</span>
              <span className="text-xs text-gray-300 truncate" style={{ maxWidth: '180px' }}>
                {token.address.substring(0, 8)}...{token.address.substring(token.address.length - 6)}
              </span>
            </div>
          )}
          
          {token.volume24h !== undefined && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400">Volume 24h:</span>
              <span className="text-xs text-gray-300">${Number(token.volume24h).toLocaleString()}</span>
            </div>
          )}
          
          {token.marketCap !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Market Cap:</span>
              <span className="text-xs text-gray-300">${Number(token.marketCap).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenDisplay;
