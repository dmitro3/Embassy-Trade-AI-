import React, { useState } from 'react';

/**
 * SwapToEMB component for swapping other coins to EMB
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedCoin - Currently selected coin for trading
 * @param {Object} props.balances - User's coin balances
 * @param {Function} props.onSwap - Function to call when swap is executed
 */
export default function SwapToEMB({ selectedCoin, balances, onSwap }) {
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  // Don't show if EMB is already selected
  if (selectedCoin === 'EMB') return null;

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow numeric input with up to 2 decimal places
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
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
    
    setIsSwapping(true);
    try {
      await onSwap(selectedCoin, 'EMB', swapAmount);
      setAmount(''); // Reset input after successful swap
    } catch (error) {
      console.error('Swap error:', error);
      alert(`Failed to swap: ${error.message}`);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
      <h3 className="text-lg font-semibold mb-3">Swap to $EMB</h3>
      <p className="text-sm text-gray-300 mb-4">
        Convert your ${selectedCoin} to $EMB tokens and earn additional rewards!
      </p>

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
            {amount ? parseFloat(amount).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
        <span>Rate: 1 ${selectedCoin} = 1 $EMB</span>
        <span>Balance: {balances[selectedCoin]?.toFixed(2) || '0.00'} ${selectedCoin}</span>
      </div>

      <button
        onClick={handleSwap}
        disabled={!amount || parseFloat(amount) <= 0 || isSwapping}
        className={`w-full py-2.5 px-4 rounded-md font-medium transition-colors ${
          !amount || parseFloat(amount) <= 0 || isSwapping
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isSwapping ? 'Swapping...' : 'Swap to $EMB'}
      </button>
      
      <div className="mt-3 text-xs text-gray-400">
        <span role="img" aria-label="note">📝</span> Swap is simulated for paper trading purposes.
      </div>
    </div>
  );
}