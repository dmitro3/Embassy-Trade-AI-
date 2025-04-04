'use client';

import React, { useState } from 'react';
import Modal from './Modal';

/**
 * Trade Prompt Modal Component for Embassy Trade AI
 * This modal allows users to enter trade parameters and execute trades
 */
const TradePromptModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isProcessing = false,
  defaultValues = {}
}) => {
  const [formData, setFormData] = useState({
    symbol: defaultValues.symbol || '',
    amount: defaultValues.amount || '',
    leverage: defaultValues.leverage || '1',
    stopLoss: defaultValues.stopLoss || '',
    takeProfit: defaultValues.takeProfit || '',
    ...defaultValues
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Execute Trade"
      primaryAction={{
        label: isProcessing ? "Processing..." : "Execute Trade",
        onClick: handleSubmit,
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
      }}
      size="lg"
    >
      <div className="space-y-6">
        <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
          <p className="text-blue-200 font-medium">
            Embassy AI's trade scanner has detected a potentially profitable opportunity.
            Review the details and execute the trade if you wish to proceed.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm text-gray-300">Trading Pair</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
              placeholder="SOL/USD"
            />
          </div>
          
          <div>
            <label className="block mb-1 text-sm text-gray-300">Amount (SOL)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
              placeholder="1.0"
              min="0.1"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="block mb-1 text-sm text-gray-300">Leverage</label>
            <select
              name="leverage"
              value={formData.leverage}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
            >
              <option value="1">1x (No Leverage)</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-1 text-sm text-gray-300">Trade Direction</label>
            <select
              name="direction"
              value={formData.direction}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-1 text-sm text-gray-300">Stop Loss (%)</label>
            <input
              type="number"
              name="stopLoss"
              value={formData.stopLoss}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
              placeholder="5"
              min="0"
            />
          </div>
          
          <div>
            <label className="block mb-1 text-sm text-gray-300">Take Profit (%)</label>
            <input
              type="number"
              name="takeProfit"
              value={formData.takeProfit}
              onChange={handleChange}
              className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white"
              placeholder="15"
              min="0"
            />
          </div>
        </div>
        
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Trade Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-400">Entry Price:</div>
            <div className="text-white">$20.45 (estimated)</div>
            
            <div className="text-gray-400">Trading Fee:</div>
            <div className="text-white">0.05 SOL</div>
            
            <div className="text-gray-400">Network Fee:</div>
            <div className="text-white">~0.000005 SOL</div>
            
            <div className="text-gray-400">Max Profit:</div>
            <div className="text-green-400">+${formData.takeProfit ? (Number(formData.amount) * Number(formData.takeProfit) / 100).toFixed(2) : '0.00'}</div>
            
            <div className="text-gray-400">Max Loss:</div>
            <div className="text-red-400">-${formData.stopLoss ? (Number(formData.amount) * Number(formData.stopLoss) / 100).toFixed(2) : '0.00'}</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          All trades are executed through the Solana blockchain. Embassy AI will never have access to your funds. 
          Trading cryptocurrency carries significant risk. Only trade with funds you can afford to lose.
        </div>
      </div>
    </Modal>
  );
};

export default TradePromptModal;