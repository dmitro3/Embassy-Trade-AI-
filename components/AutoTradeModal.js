'use client';

import React, { useState } from 'react';
import Modal from './Modal';

/**
 * Modal to confirm auto-trading signals from AI agents
 */
const AutoTradeModal = ({ isOpen, onClose, onAccept, tradeSignal = {} }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Default values for when no trade signal is provided
  const {
    market = 'SOL-USD',
    direction = 'long',
    entryPrice = '0.00',
    size = 1,
    stopLoss = '0.00',
    takeProfit = '0.00',
    confidence = 85,
    source = 'AIXBT'
  } = tradeSignal;
  
  // Handle accepting the trade
  const handleAcceptTrade = async () => {
    setIsProcessing(true);
    
    try {
      // Call the accept function provided by the parent component
      if (onAccept) {
        await onAccept(tradeSignal);
      }
      
      // Close the modal on success
      onClose();
    } catch (err) {
      console.error('Error executing trade:', err);
      // You could set an error state here and display it in the UI
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Trade"
      primaryAction={{
        label: isProcessing ? "Processing..." : "Execute Trade",
        onClick: handleAcceptTrade,
        disabled: isProcessing
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
        disabled: isProcessing
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>AI-generated trade signal from {source}</span>
        </div>
        
        <div className={`flex items-center p-3 rounded-lg ${
          direction === 'long' 
            ? 'bg-green-900/20 border border-green-700/30' 
            : 'bg-red-900/20 border border-red-700/30'
        }`}>
          <div className={`h-10 w-1.5 rounded-full mr-3 ${
            direction === 'long' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <div>
            <h3 className="text-white font-medium text-lg">
              {market} {direction.toUpperCase()}
            </h3>
            <p className="text-gray-400 text-sm">
              {confidence}% confidence • Entry: ${entryPrice}
            </p>
          </div>
          <div className="ml-auto">
            <div className={`text-sm font-mono px-3 py-1 rounded ${
              direction === 'long' ? 'bg-green-700/30 text-green-400' : 'bg-red-700/30 text-red-400'
            }`}>
              {direction === 'long' ? 'BUY' : 'SELL'}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/60 p-4 rounded-lg">
          <h3 className="text-sm text-gray-300 mb-3 font-medium">Trade Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Market</div>
              <div className="text-white">{market}</div>
            </div>
            <div>
              <div className="text-gray-500">Position Size</div>
              <div className="text-white">{size} {market.split('-')[0]}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Price</div>
              <div className="text-white">${entryPrice}</div>
            </div>
            <div>
              <div className="text-gray-500">Direction</div>
              <div className={direction === 'long' ? 'text-green-400' : 'text-red-400'}>
                {direction.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Take Profit</div>
              <div className="text-green-400">${takeProfit}</div>
            </div>
            <div>
              <div className="text-gray-500">Stop Loss</div>
              <div className="text-red-400">${stopLoss}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-700/30 text-sm">
          <h3 className="text-blue-400 font-medium mb-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Trade Information
          </h3>
          <p className="text-gray-300">
            By executing this trade, your wallet will be connected to Photon for seamless trading. 
            Performance metrics will be tracked in your PnL dashboard.
          </p>
        </div>
        
        <div className="bg-gray-900/50 p-3 rounded-lg text-xs text-gray-400">
          <p>You can enable auto-accept in settings to automatically execute trades with confidence levels above 80%.</p>
        </div>
      </div>
    </Modal>
  );
};

export default AutoTradeModal;