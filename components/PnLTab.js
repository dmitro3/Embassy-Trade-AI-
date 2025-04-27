'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePhotonApi } from '../lib/usePhotonApi';

/**
 * PnL (Profit and Loss) tab showing trading performance metrics
 */
const PnLTab = () => {
  const { connected, publicKey } = useWallet();
  const { getUserTrades, isLoading } = usePhotonApi();
  const [performanceData, setPerformanceData] = useState({
    totalPnL: 0,
    winRate: 0,
    totalTrades: 0,
    bestTrade: 0,
    worstTrade: 0,
    averagePnL: 0,
    dailyPnL: []
  });

  // Mock data for chart - in production this would come from the API
  const mockChartData = [
    { date: '06/15', pnl: 120 },
    { date: '06/16', pnl: -45 },
    { date: '06/17', pnl: 78 },
    { date: '06/18', pnl: 210 },
    { date: '06/19', pnl: -32 },
    { date: '06/20', pnl: 145 },
    { date: '06/21', pnl: 67 }
  ];

  // Load trading performance data
  useEffect(() => {
    if (connected && publicKey) {
      loadPerformanceData();
    }
  }, [connected, publicKey]);

  const loadPerformanceData = async () => {
    try {
      // In a real implementation, you'd fetch this data from your API
      // const trades = await getUserTrades();
      
      // For now, set mock data
      setPerformanceData({
        totalPnL: 543.28,
        winRate: 68,
        totalTrades: 24,
        bestTrade: 210.45,
        worstTrade: -87.32,
        averagePnL: 22.64,
        dailyPnL: mockChartData
      });
    } catch (err) {
      console.error('Failed to load performance data:', err);
    }
  };

  // Find the highest absolute value in the chart data for scaling
  const maxValue = Math.max(...performanceData.dailyPnL.map(item => Math.abs(item.pnl)));

  // Calculate the bar height percentage based on the value
  const getBarHeight = (value) => {
    return Math.abs(value) / maxValue * 100;
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          PnL Performance
        </h3>
        
        {!connected ? (
          <div className="bg-gray-900/50 p-4 rounded-lg text-center">
            <p className="text-gray-400 mb-3">Connect your wallet to view your trading performance</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
              Connect Wallet
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading performance data...</p>
          </div>
        ) : (
          <>
            {/* Overall metrics */}
            <div className="bg-gray-900/70 p-3 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-gray-400 text-xs">Total PnL</div>
                  <div className={`text-xl font-bold ${performanceData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceData.totalPnL >= 0 ? '+' : ''}{performanceData.totalPnL.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-xs">Win Rate</div>
                  <div className="text-blue-400 text-xl font-bold">{performanceData.winRate}%</div>
                </div>
              </div>
            </div>
            
            {/* Performance chart */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Daily PnL</h4>
                <div className="text-xs text-gray-400">Last 7 days</div>
              </div>
              
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <div className="relative h-40">
                  {/* Y-axis labels */}
                  <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between text-xs text-gray-500">
                    <div>+{maxValue.toFixed(0)}</div>
                    <div>0</div>
                    <div>-{maxValue.toFixed(0)}</div>
                  </div>
                  
                  {/* Chart bars */}
                  <div className="ml-8 h-full flex items-center justify-around">
                    {performanceData.dailyPnL.map((item, index) => (
                      <div key={index} className="flex flex-col items-center justify-center h-full">
                        {/* Bar */}
                        <div className="relative h-[80%] flex flex-col justify-center items-center">
                          <div 
                            className={`w-6 ${item.pnl >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'} rounded-sm`}
                            style={{ 
                              height: `${getBarHeight(item.pnl)}%`,
                              marginTop: item.pnl >= 0 ? 'auto' : 0,
                              marginBottom: item.pnl >= 0 ? 0 : 'auto'
                            }}
                          ></div>
                          
                          {/* Value label */}
                          <div 
                            className={`absolute text-xs font-medium ${item.pnl >= 0 ? 'bottom-full text-green-400' : 'top-full text-red-400'} mb-1 mt-1`}
                          >
                            {item.pnl >= 0 ? '+' : ''}{item.pnl}
                          </div>
                        </div>
                        
                        {/* X-axis label */}
                        <div className="text-xs text-gray-500 mt-1">
                          {item.date}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* More metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Total Trades</div>
                <div className="text-white font-bold text-lg">{performanceData.totalTrades}</div>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Best Trade</div>
                <div className="text-green-400 font-bold text-lg">+{performanceData.bestTrade}</div>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <div className="text-xs text-gray-400">Worst Trade</div>
                <div className="text-red-400 font-bold text-lg">{performanceData.worstTrade}</div>
              </div>
            </div>
            
            {/* EMB integration teaser */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-3 rounded-lg border border-blue-900/30">
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-blue-400 font-medium text-sm">Boost your trading performance</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    Stake EMB tokens to unlock advanced trading features and reduced fees. Enhance your PnL with premium signals and higher leverage.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PnLTab;
