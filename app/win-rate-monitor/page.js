'use client';

import React from 'react';
import WinRateMonitor from '../../components/WinRateMonitor';

/**
 * Win-Rate Monitor Page
 * 
 * This page displays the Win-Rate Monitor component, which provides a comprehensive
 * dashboard for tracking trading performance with a focus on win rate and profitability metrics.
 */
const WinRateMonitorPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Win-Rate Monitor</h1>
          <p className="text-gray-400 mt-2">
            Track your trading performance across all platforms with comprehensive metrics and visualizations.
          </p>
        </div>
        
        <WinRateMonitor />
      </div>
    </div>
  );
};

export default WinRateMonitorPage;
