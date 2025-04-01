import React from 'react';

/**
 * CoinSelector component for selecting coins for mock trading
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedCoin - Currently selected coin
 * @param {Function} props.onCoinChange - Function to call when coin selection changes
 * @param {Array} props.coins - Array of available coins to select from
 */
export default function CoinSelector({ selectedCoin, onCoinChange, coins = ['SOL', 'USDC', 'JITO', 'EMB'] }) {
  return (
    <div className="mb-4">
      <label htmlFor="coin-select" className="block mb-2 text-sm font-medium text-gray-300">
        Select Trading Coin
      </label>
      <div className="relative">
        <select
          id="coin-select"
          value={selectedCoin}
          onChange={(e) => onCoinChange(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {coins.map(coin => (
            <option key={coin} value={coin}>
              ${coin}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {selectedCoin !== 'EMB' && (
        <div className="mt-2 text-xs text-blue-400">
          <span role="img" aria-label="info">ℹ️</span> Trading with $EMB earns you additional rewards!
        </div>
      )}
    </div>
  );
}