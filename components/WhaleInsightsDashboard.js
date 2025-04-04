import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import WhaleTracker from './WhaleTracker';
import TradeInsights from './TradeInsights';
import EMBAITokenManager from '../lib/embaiToken';
import { Connection, clusterApiUrl } from '@solana/web3.js';

/**
 * WhaleInsightsDashboard - Combines whale tracking with actionable trading insights
 * Premium features unlocked for users with EMBAI tokens
 */
const WhaleInsightsDashboard = () => {
  const { publicKey } = useWallet();
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  const [graduationStatus, setGraduationStatus] = useState(null);
  const [whaleData, setWhaleData] = useState([]);
  const [tokenManager, setTokenManager] = useState(null);
  const [selectedTab, setSelectedTab] = useState('whaleTracker');
  const [selectedWhale, setSelectedWhale] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize token manager
  useEffect(() => {
    setTokenManager(new EMBAITokenManager(new Connection(clusterApiUrl('devnet'))));
  }, []);

  // Check if user has graduated to live trading (has EMBAI tokens)
  useEffect(() => {
    const checkGraduationStatus = async () => {
      if (!publicKey || !tokenManager) return;
      
      try {
        setLoading(true);
        const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
        setGraduationStatus(status);
        setIsLiveTrading(status.hasGraduated);
        setLoading(false);
      } catch (err) {
        console.error('Error checking graduation status:', err);
        setLoading(false);
      }
    };
    
    checkGraduationStatus();
  }, [publicKey, tokenManager]);

  // Handle whale selection for deeper analysis
  const handleSelectWhale = (walletAddress) => {
    setSelectedWhale(walletAddress);
    // Automatically switch to insights tab when a whale is selected
    setSelectedTab('insights');
  };

  // Share whale data between components
  const handleWhaleDataUpdate = (data) => {
    setWhaleData(data);
  };

  if (loading && !graduationStatus) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg shadow-lg text-white">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3">Loading your whale insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white">
      {/* Status banner for paper vs live trading */}
      <div className={`px-4 py-2 text-sm flex items-center justify-between ${
        isLiveTrading ? 'bg-green-900 bg-opacity-30' : 'bg-yellow-900 bg-opacity-30'
      }`}>
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isLiveTrading ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span>
            {isLiveTrading 
              ? 'Live Trading: Full access to premium whale tracking features' 
              : 'Paper Trading: Limited access to whale data (delayed and simplified)'}
          </span>
        </div>
        {!isLiveTrading && (
          <button className="text-blue-400 hover:text-blue-300 text-sm">
            Upgrade to EMBAI
          </button>
        )}
      </div>
      
      {/* Tab navigation */}
      <div className="border-b border-gray-800">
        <nav className="flex">
          <button
            className={`py-3 px-6 focus:outline-none ${
              selectedTab === 'whaleTracker' 
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setSelectedTab('whaleTracker')}
          >
            Whale Tracker
          </button>
          <button
            className={`py-3 px-6 focus:outline-none ${
              selectedTab === 'insights' 
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setSelectedTab('insights')}
          >
            Trading Insights
          </button>
          <button
            className={`py-3 px-6 focus:outline-none ${
              selectedTab === 'watchlist' 
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setSelectedTab('watchlist')}
          >
            Whale Watchlist
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="p-4">
        {selectedTab === 'whaleTracker' && (
          <WhaleTracker 
            onSelectWhale={handleSelectWhale} 
            isLiveTrading={isLiveTrading}
            onDataUpdate={handleWhaleDataUpdate}
          />
        )}
        
        {selectedTab === 'insights' && (
          <TradeInsights 
            whaleData={whaleData} 
            isLiveTrading={isLiveTrading} 
            selectedWhale={selectedWhale}
          />
        )}
        
        {selectedTab === 'watchlist' && (
          <div className="p-6 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Whale Watchlist</h2>
            {isLiveTrading ? (
              <div className="space-y-4">
                <p className="text-gray-400 mb-4">
                  Monitor specific whale wallets and receive alerts when they make significant moves.
                </p>
                
                {selectedWhale ? (
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono">{selectedWhale}</span>
                      <div className="px-2 py-1 bg-blue-900 bg-opacity-30 rounded text-blue-400 text-sm">
                        Watching
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-800 p-3 rounded">
                        <div className="text-sm text-gray-400">Last Activity</div>
                        <div className="font-medium">2 hours ago</div>
                      </div>
                      <div className="bg-gray-800 p-3 rounded">
                        <div className="text-sm text-gray-400">Holdings Tracked</div>
                        <div className="font-medium">5 tokens</div>
                      </div>
                      <div className="bg-gray-800 p-3 rounded">
                        <div className="text-sm text-gray-400">Last Transaction</div>
                        <div className="font-medium text-green-400">BUY 24,500 SOL</div>
                      </div>
                      <div className="bg-gray-800 p-3 rounded">
                        <div className="text-sm text-gray-400">Portfolio Est.</div>
                        <div className="font-medium">$14.2M</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        Set Custom Alerts
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No whale wallets in your watchlist yet.</p>
                    <p className="mt-2 text-sm">Select a wallet from the Whale Tracker to add it here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">
                  Whale watchlist features are only available to live traders with EMBAI tokens.
                </p>
                <div className="p-6 border border-dashed border-gray-700 rounded-lg">
                  <p className="font-medium mb-2">Premium Features:</p>
                  <ul className="text-sm text-gray-400 space-y-1 mb-4">
                    <li>• Track up to 50 whale wallets</li>
                    <li>• Real-time alerts on wallet movements</li>
                    <li>• Wallet clustering analysis</li>
                    <li>• Historical wallet activity</li>
                    <li>• Token flow visualization</li>
                  </ul>
                  <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg">
                    Migrate to EMBAI
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhaleInsightsDashboard;