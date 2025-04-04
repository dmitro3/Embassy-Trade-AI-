"use client";

import { useState, useEffect } from 'react';

// Simple UUID generator for client-side use
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Hook to simulate trade signals for testing purposes
 * @param {number} intervalSeconds - How often to generate a new signal (in seconds)
 * @param {boolean} enabled - Whether simulation is enabled
 * @returns {object} The simulated trade signal
 */
export function useTradeSignalSimulator(intervalSeconds = 10, enabled = true) {
  const [tradeSignal, setTradeSignal] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setTradeSignal(null);
      return;
    }

    // Initial signal on mount
    generateSignal();

    // Set up interval for periodic signals
    const interval = setInterval(() => {
      generateSignal();
    }, intervalSeconds * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [intervalSeconds, enabled]);

  // Generate a random trade signal
  const generateSignal = () => {
    const coinOptions = ['SOL', 'BTC', 'ETH', 'JITO', 'BONK', 'JUP'];
    const selectedCoin = coinOptions[Math.floor(Math.random() * coinOptions.length)];
    
    const riskLevels = ['Low', 'Medium', 'High'];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    const profit = Math.floor(Math.random() * 30 + 20);
    
    // Use a true UUID for guaranteed unique IDs across all instances
    const uuid = generateUUID();
    
    const signal = {
      id: `sim-${uuid}`,
      tradePair: `${selectedCoin}/USDC`,
      profitPotential: `${profit}%`,
      riskLevel: riskLevel,
      action: Math.random() > 0.5 ? 'buy' : 'sell',
      price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
      timestamp: Date.now()
    };
    
    setTradeSignal(signal);
  };

  return tradeSignal;
}

export default useTradeSignalSimulator;