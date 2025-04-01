import React, { useEffect, useState } from 'react';

export default function TradePromptModal({ trade, onAccept, onDecline, autoTimeout = 10000, autoAccept, onAutoAcceptToggle }) {
  const [timeLeft, setTimeLeft] = useState(autoTimeout / 1000);

  useEffect(() => {
    // Reset timer when new trade comes in
    setTimeLeft(autoTimeout / 1000);
    
    // Start countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-decline after timeout
    const declineTimer = setTimeout(() => {
      onDecline();
    }, autoTimeout);

    return () => {
      clearInterval(timer);
      clearTimeout(declineTimer);
    };
  }, [trade, onAccept, onDecline, autoTimeout]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Trade Opportunity</h2>
          <div className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {timeLeft}s
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Asset:</span>
            <span className="font-medium">{trade.asset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{trade.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Quantity:</span>
            <span className="font-medium">{trade.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">${trade.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium">{(trade.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Auto Accept Toggle */}
        <div className="flex items-center justify-between px-2 py-3 mb-4 bg-gray-100 rounded-lg">
          <label htmlFor="autoAcceptToggle" className="text-sm font-medium text-gray-700">
            Auto-accept future trades (24/7 trading)
          </label>
          <div className="relative inline-block w-12 align-middle select-none">
            <input 
              type="checkbox" 
              name="autoAcceptToggle" 
              id="autoAcceptToggle" 
              className="sr-only"
              checked={autoAccept}
              onChange={() => onAutoAcceptToggle(!autoAccept)} 
            />
            <div className={`block w-12 h-6 rounded-full ${autoAccept ? 'bg-green-500' : 'bg-gray-300'} transition-colors`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoAccept ? 'transform translate-x-6' : ''}`}></div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}