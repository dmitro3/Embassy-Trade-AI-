'use client';

import React from 'react';

// This component will enhance token displays with animations and improved visuals
const EnhancedTokenCard = ({ 
  token, 
  selected = false, 
  onClick, 
  showDetails = true,
  animationDelay = 0 
}) => {
  if (!token) return null;
  
  // Determine if price is up or down
  const priceChange = token.priceChangePercent24h || token.change24h || 0;
  const isPriceUp = priceChange > 0;
  const isPriceDown = priceChange < 0;
  
  // Format numbers properly
  const formatPrice = (price) => {
    if (typeof price !== 'number') return '—';
    
    // Format based on price magnitude
    if (price < 0.001) return price.toFixed(8);
    if (price < 0.1) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  
  const formatVolume = (volume) => {
    if (typeof volume !== 'number') return '—';
    
    // Format with K, M, B suffix
    if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };
  
  // Handle animation for cards
  const cardStyle = {
    animation: `fadeIn 0.5s ease-out forwards`,
    animationDelay: `${animationDelay * 0.05}s`,
    opacity: 0
  };
  
  return (
    <div 
      className={`rounded-lg p-4 mb-2 transition-all duration-300 
        ${selected ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/40 hover:bg-gray-700/40 border border-gray-700/50'} 
        cursor-pointer`}
      style={cardStyle}
      onClick={() => onClick && onClick(token)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* Token Icon - if available */}
          {token.logoURI && (
            <div className="w-8 h-8 mr-3 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
              <img 
                src={token.logoURI} 
                alt={token.symbol} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = token.symbol?.charAt(0) || '?';
                }} 
              />
            </div>
          )}
          
          {/* Token without icon - show symbol initial */}
          {!token.logoURI && (
            <div className="w-8 h-8 mr-3 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
              {token.symbol?.charAt(0) || '?'}
            </div>
          )}
          
          {/* Token name and symbol */}
          <div>
            <div className="font-semibold text-white flex items-center">
              {token.symbol}
              {token.isNew && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                  NEW
                </span>
              )}
            </div>
            {showDetails && (
              <div className="text-xs text-gray-400 truncate max-w-[120px]">
                {token.name}
              </div>
            )}
          </div>
        </div>
        
        {/* Price information */}
        <div className="text-right">
          <div className="text-white font-medium">
            ${formatPrice(token.price)}
          </div>
          {showDetails && (
            <div className={`text-xs ${isPriceUp ? 'text-green-400' : isPriceDown ? 'text-red-400' : 'text-gray-400'}`}>
              {isPriceUp && '+'}{priceChange?.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
      
      {/* Additional details - shown only when showDetails is true */}
      {showDetails && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>
            <div className="text-gray-500">Volume 24h</div>
            <div className="text-white">{formatVolume(token.volume24h)}</div>
          </div>
          <div>
            <div className="text-gray-500">Market Cap</div>
            <div className="text-white">{formatVolume(token.marketCap)}</div>
          </div>
        </div>
      )}
      
      {/* View details button - shown only when selected */}
      {selected && (
        <div className="mt-3 pt-2 border-t border-gray-700/50 flex justify-end">
          <button 
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Implement detailed view logic here
            }}
          >
            View Details →
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedTokenCard;
