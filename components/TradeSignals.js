'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Mock data for trade signals
const mockSignals = [
  {
    id: 1,
    source: 'AIXBT',
    type: 'whale_movement',
    asset: 'SOL',
    action: 'buy',
    amount: 23500,
    price: 138.42,
    confidence: 0.89,
    timestamp: new Date().getTime() - 1000 * 60 * 5, // 5 minutes ago
    description: 'Large accumulation detected at key support level',
    potentialReturn: '12-15%'
  },
  {
    id: 2,
    source: '@mobyagent',
    type: 'whale_alert',
    asset: '$FARTCOIN',
    action: 'buy',
    amount: 4130000,
    marketCap: 7500000,
    confidence: 0.76,
    timestamp: new Date().getTime() - 1000 * 60 * 12, // 12 minutes ago
    description: 'Whale bought $4.13M of $FARTCOIN at $7.5M MC',
    potentialReturn: '50-100%',
    riskLevel: 'High'
  },
  {
    id: 3,
    source: 'AIXBT',
    type: 'momentum',
    asset: 'ETH',
    action: 'buy',
    price: 3291.14,
    confidence: 0.82,
    timestamp: new Date().getTime() - 1000 * 60 * 18, // 18 minutes ago
    description: 'Momentum building with increasing volume',
    potentialReturn: '8-10%'
  },
  {
    id: 4,
    source: '@mobyagent',
    type: 'early_detection',
    asset: '$MOBY',
    action: 'buy',
    amount: 1850000,
    marketCap: 3200000,
    confidence: 0.91,
    timestamp: new Date().getTime() - 1000 * 60 * 25, // 25 minutes ago
    description: 'Early momentum detected on $MOBY, increasing inflows',
    potentialReturn: '80-120%',
    riskLevel: 'Medium-High',
    note: 'Top tier alpha'
  },
  {
    id: 5, 
    source: '@mobyagent',
    type: 'early_detection',
    asset: '$prometheus',
    action: 'buy',
    marketCap: 950000,
    confidence: 0.85,
    timestamp: new Date().getTime() - 1000 * 60 * 40, // 40 minutes ago
    description: 'Catching $prometheus very early, active developers',
    potentialReturn: '200-300%',
    riskLevel: 'High',
    note: 'Early runner opportunity'
  }
];

const TradeSignals = ({ onTrade, isPaperTrading = true }) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'aixbt', 'mobyagent'
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'confidence', 'potential'
  const { publicKey } = useWallet();

  useEffect(() => {
    // In a real implementation, this would fetch from a backend API
    // that integrates with AIXBT and @mobyagent
    const fetchSignals = async () => {
      setLoading(true);
      try {
        // Mock API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sort and filter mock data
        let filteredSignals = [...mockSignals];
        
        if (filter !== 'all') {
          const sourceFilter = filter === 'aixbt' ? 'AIXBT' : '@mobyagent';
          filteredSignals = filteredSignals.filter(signal => signal.source === sourceFilter);
        }
        
        // Sort signals
        switch (sortBy) {
          case 'confidence':
            filteredSignals.sort((a, b) => b.confidence - a.confidence);
            break;
          case 'potential':
            // Extract numeric values from potentialReturn strings for sorting
            filteredSignals.sort((a, b) => {
              const aReturn = parseFloat(a.potentialReturn.match(/\d+/)[0]);
              const bReturn = parseFloat(b.potentialReturn.match(/\d+/)[0]);
              return bReturn - aReturn;
            });
            break;
          case 'timestamp':
          default:
            filteredSignals.sort((a, b) => b.timestamp - a.timestamp);
            break;
        }
        
        setSignals(filteredSignals);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching trade signals:', error);
        setLoading(false);
      }
    };

    fetchSignals();
    
    // Poll for new signals every minute
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, [filter, sortBy]);

  const handleTrade = (signal) => {
    if (!publicKey) {
      alert('Please connect your wallet to trade');
      return;
    }
    
    // Calculate a simulated profit/loss based on confidence score
    // In a real implementation, this would be handled by Photon API
    const tradeData = {
      asset: signal.asset,
      action: signal.action,
      confidence: signal.confidence,
      amount: signal.amount || 1000, // Default amount if not specified
      potentialReturn: signal.potentialReturn,
      source: signal.source,
      timestamp: signal.timestamp,
    };
    
    onTrade(tradeData);
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const SignalCard = ({ signal }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <div className={`mb-4 rounded-lg p-4 cursor-pointer transition-all duration-300 ${
        signal.source === 'AIXBT' ? 'bg-blue-900 bg-opacity-20 border border-blue-500' : 'bg-purple-900 bg-opacity-20 border border-purple-500'
      }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                signal.source === 'AIXBT' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
              }`}>
                {signal.source}
              </span>
              <span className="ml-2 text-xs text-gray-400">{formatTimeAgo(signal.timestamp)}</span>
            </div>
            <h3 className="text-lg font-bold mt-2">{signal.asset}</h3>
            <p className="text-sm text-gray-300 mt-1">{signal.description}</p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold ${signal.action === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {signal.action.toUpperCase()}
            </div>
            <div className="text-sm mt-1">
              Confidence: <span className={`font-bold ${
                signal.confidence > 0.8 ? 'text-green-400' : signal.confidence > 0.6 ? 'text-yellow-400' : 'text-red-400'
              }`}>{(signal.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {signal.price && (
                <div>
                  <span className="text-gray-400">Price:</span> ${signal.price.toLocaleString()}
                </div>
              )}
              {signal.amount && (
                <div>
                  <span className="text-gray-400">Amount:</span> ${signal.amount.toLocaleString()}
                </div>
              )}
              {signal.marketCap && (
                <div>
                  <span className="text-gray-400">Market Cap:</span> ${signal.marketCap.toLocaleString()}
                </div>
              )}
              <div>
                <span className="text-gray-400">Potential Return:</span> <span className="text-green-400">{signal.potentialReturn}</span>
              </div>
              {signal.riskLevel && (
                <div>
                  <span className="text-gray-400">Risk Level:</span> <span className={`font-bold ${
                    signal.riskLevel.includes('High') ? 'text-red-400' : 
                    signal.riskLevel.includes('Medium') ? 'text-yellow-400' : 'text-green-400'
                  }`}>{signal.riskLevel}</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTrade(signal);
                }}
                className={`w-full py-2 rounded-lg font-bold ${
                  isPaperTrading 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white'
                }`}
              >
                {isPaperTrading ? 'Paper Trade' : 'Live Trade'} with {signal.action === 'buy' ? 'BUY' : 'SELL'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="trade-signals">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Trade Signals</h2>
        <div className="flex space-x-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white text-sm p-1 rounded border border-gray-700"
          >
            <option value="all">All Sources</option>
            <option value="aixbt">AIXBT</option>
            <option value="mobyagent">@mobyagent</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-800 text-white text-sm p-1 rounded border border-gray-700"
          >
            <option value="timestamp">Most Recent</option>
            <option value="confidence">Highest Confidence</option>
            <option value="potential">Highest Potential</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : signals.length > 0 ? (
        <div>
          {signals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No trade signals found. Check back soon!
        </div>
      )}
      
      <div className="mt-6 text-xs text-gray-400">
        <p>
          <span className="font-bold">Note:</span> These signals are provided for informational purposes only and should not be considered financial advice.
          Always do your own research before making any investment decisions.
        </p>
        {isPaperTrading && (
          <p className="mt-2">
            You are in paper trading mode using $EMB tokens. Graduate to live trading to access full features.
          </p>
        )}
      </div>
    </div>
  );
};

export default TradeSignals;