'use client';

import React, { useState, useEffect } from 'react';
import { useTokenService } from '../lib/tokenService';
import { EMB_TOKEN_CONFIG, convertToUsd } from '../lib/embToken';

/**
 * SwapToEMB component for swapping other coins to EMB
 * Integrates with Solana wallet and pump.fun for EMB token purchases
 */
export default function SwapToEMB({ selectedCoin, balances, onSwap }) {
  const [amount, setAmount] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('0.00');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Use our token service
  const {
    walletConnected,
    publicKey,
    balance: embBalance,
    isLoading,
    error,
    connectWallet,
    swapTokens,
    buyTokens
  } = useTokenService();

  // Don't show if EMB is already selected
  if (selectedCoin === 'EMB') return null;

  // Calculate the receive amount whenever the input amount changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setReceiveAmount('0.00');
      return;
    }
    
    const inputAmount = parseFloat(amount);
    // Apply exchange rate - this would normally come from an oracle or API
    const exchangeRate = selectedCoin === 'SOL' 
      ? 1 / EMB_TOKEN_CONFIG.exchangeRates.sol 
      : 1; // Default 1:1 for other coins
      
    setReceiveAmount((inputAmount * exchangeRate).toFixed(2));
  }, [amount, selectedCoin]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numeric input with up to 6 decimal places
    if (value === '' || /^\d+(\.\d{0,6})?$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    const swapAmount = parseFloat(amount);
    
    // Check if user has enough balance
    if (balances[selectedCoin] < swapAmount) {
      alert(`Insufficient ${selectedCoin} balance!`);
      return;
    }
    
    // Check if wallet is connected
    if (!walletConnected) {
      const connected = await connectWallet();
      if (!connected) return;
    }
    
    setIsSwapping(true);
    try {
      // Perform the swap through our token service
      const result = await swapTokens(selectedCoin, 'EMB', swapAmount);
      
      if (result.success) {
        // Call the parent component's onSwap callback
        onSwap(selectedCoin, 'EMB', swapAmount, result.receivedAmount);
        setAmount(''); // Reset input after successful swap
      } else {
        alert(`Swap failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Swap error:', error);
      alert(`Failed to swap: ${error.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  // Go to pump.fun to buy EMB directly
  const handleBuyOnPump = () => {
    buyTokens();
  };

  return (
    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span>Swap to $EMB</span>
        <span className="ml-2 px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full text-xs font-normal">
          Token: {EMB_TOKEN_CONFIG.contract.slice(0, 4)}...{EMB_TOKEN_CONFIG.contract.slice(-4)}
        </span>
      </h3>
      
      <div className="flex items-center space-x-2 mb-4">
        <p className="text-sm text-gray-300">
          Convert your ${selectedCoin} to $EMB tokens and access premium features!
        </p>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded-md"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {showDetails && (
        <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700 text-xs text-gray-300 space-y-1">
          <p>• EMB is the native utility token for Embassy AI platform</p>
          <p>• Contract: {EMB_TOKEN_CONFIG.contract}</p>
          <p>• Network: Solana {EMB_TOKEN_CONFIG.network}</p>
          <p>• Use EMB for premium features and enhanced rewards</p>
          <p>• <a href={EMB_TOKEN_CONFIG.links.explorer} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View on Solana Explorer</a></p>
        </div>
      )}

      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-1">
          <label htmlFor="swap-amount" className="block text-xs text-gray-400 mb-1">
            Amount (${selectedCoin})
          </label>
          <input
            id="swap-amount"
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder={`Enter ${selectedCoin} amount`}
            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
          />
        </div>

        <div className="flex-none flex flex-col items-center justify-center">
          <span className="text-gray-400 text-2xl">→</span>
        </div>

        <div className="flex-1">
          <label htmlFor="receive-amount" className="block text-xs text-gray-400 mb-1">
            Receive ($EMB)
          </label>
          <div className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-blue-400 font-medium">
            {receiveAmount}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
        <span>Rate: 1 ${selectedCoin} = {selectedCoin === 'SOL' ? (1 / EMB_TOKEN_CONFIG.exchangeRates.sol).toFixed(0) : '1'} $EMB</span>
        <span>Balance: {balances[selectedCoin]?.toFixed(2) || '0.00'} ${selectedCoin}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleSwap}
          disabled={!amount || parseFloat(amount) <= 0 || isSwapping || isLoading}
          className={`py-2.5 px-4 rounded-md font-medium transition-colors ${
            !amount || parseFloat(amount) <= 0 || isSwapping || isLoading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSwapping ? 'Swapping...' : `Swap ${selectedCoin} to EMB`}
        </button>
        
        <button
          onClick={handleBuyOnPump}
          className="py-2.5 px-4 rounded-md font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white"
        >
          Buy on pump.fun
        </button>
      </div>
      
      {error && (
        <div className="mt-3 text-xs text-red-400">
          Error: {error}
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-400">
        {walletConnected ? (
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"/>
            <span>Wallet connected: {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}</span>
          </div>
        ) : (
          <div>Connect wallet to swap tokens directly</div>
        )}
      </div>
    </div>
  );
}