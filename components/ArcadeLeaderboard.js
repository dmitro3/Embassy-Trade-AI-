'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * ArcadeLeaderboard Component
 * 
 * Displays a leaderboard of top players in the Arcade with various filtering options
 * and visual indicators for the current user's position.
 */
const ArcadeLeaderboard = ({ 
  initialData = [], 
  timeframe = 'weekly',
  showFilters = true,
  maxEntries = 10,
  highlightUser = true,
  onViewMore = null,
  className = ''
}) => {
  const { publicKey } = useWallet();
  const [leaderboardData, setLeaderboardData] = useState(initialData);
  const [activeTimeframe, setActiveTimeframe] = useState(timeframe);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch leaderboard data when timeframe changes
  useEffect(() => {
    if (initialData.length === 0) {
      fetchLeaderboardData(activeTimeframe);
    }
  }, [activeTimeframe, initialData]);
  
  // Simulate fetching leaderboard data
  const fetchLeaderboardData = async (timeframe) => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would be an API call
      // For now, we'll simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockData = generateMockLeaderboardData(timeframe);
      setLeaderboardData(mockData);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock leaderboard data based on timeframe
  const generateMockLeaderboardData = (timeframe) => {
    const baseData = [
      { rank: 1, wallet: 'GWjeBbdx4cWJvgyxRPAwbSTBoNbZ4e2Sfsv1SH5qeKU7', username: 'CryptoWhale', score: 15420, embBurned: 2500, wins: 42, badge: 'Whale' },
      { rank: 2, wallet: 'HN7Gz168zHjUSKTcyFw2Ez6HVNm2cmAMhXnxbsF38QSS', username: 'SolanaKing', score: 9842, embBurned: 1800, wins: 36, badge: 'Shark' },
      { rank: 3, wallet: 'CiwS7dHiT3gC3tAFuBp2pLZ8XjvMEkWcAsH4GfKtW6yZ', username: 'BlockchainBaron', score: 6721, embBurned: 1200, wins: 28, badge: 'Dolphin' },
      { rank: 4, wallet: '2RPf5zjTpQQZs2LXGSknEZKYL3QQp5oVBRCrJ4BsruXB', username: 'TokenTitan', score: 4310, embBurned: 950, wins: 22, badge: 'Fish' },
      { rank: 5, wallet: 'DELcMgnakiKhocZrXvgxb8GKQJxxJ2ioUyAkTUKvwpWM', username: 'SolanaSage', score: 2105, embBurned: 720, wins: 18, badge: 'Fish' },
      { rank: 6, wallet: publicKey?.toString() || 'YourWalletWillShowHere', username: 'You', score: 1250, embBurned: 500, wins: 12, badge: 'Minnow' },
      { rank: 7, wallet: 'GZ9nLKTmx9jtsmQQJTxBVoRZGKABCFdRAnRUvDphgJL4', username: 'CryptoChampion', score: 950, embBurned: 320, wins: 8, badge: 'Minnow' },
      { rank: 8, wallet: '8FE27ioQh5H2e5J3yqGVxX9wgaJZ2fYXdSsVYHfWsrCH', username: 'BlockMaster', score: 705, embBurned: 280, wins: 6, badge: 'Minnow' },
      { rank: 9, wallet: 'AZTZLRxG3jd7pcEQzBxoUiKuT8MEUcgeu9iDJHWG8zSB', username: 'TokenTrader', score: 520, embBurned: 210, wins: 5, badge: 'Minnow' },
      { rank: 10, wallet: '4DTmTY4L3tQNj9V5CdJgVNNGaQmVJZ9TpFSUC2sTwUhk', username: 'SolanaStrategist', score: 320, embBurned: 150, wins: 3, badge: 'Minnow' }
    ];
    
    // Adjust data based on timeframe
    if (timeframe === 'daily') {
      return baseData.map(entry => ({
        ...entry,
        score: Math.floor(entry.score / 7),
        embBurned: Math.floor(entry.embBurned / 7),
        wins: Math.floor(entry.wins / 7)
      }));
    } else if (timeframe === 'monthly') {
      return baseData.map(entry => ({
        ...entry,
        score: entry.score * 4,
        embBurned: entry.embBurned * 4,
        wins: entry.wins * 4
      }));
    } else if (timeframe === 'allTime') {
      return baseData.map(entry => ({
        ...entry,
        score: entry.score * 12,
        embBurned: entry.embBurned * 12,
        wins: entry.wins * 12
      }));
    }
    
    // Default to weekly
    return baseData;
  };
  
  // Truncate wallet address for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  // Get badge color based on rank
  const getBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-900';
    if (rank === 2) return 'bg-gray-300 text-gray-800';
    if (rank === 3) return 'bg-amber-700 text-amber-100';
    return 'bg-blue-600 text-white';
  };
  
  // Get badge icon based on badge name
  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'Whale': return '🐋';
      case 'Shark': return '🦈';
      case 'Dolphin': return '🐬';
      case 'Fish': return '🐠';
      case 'Minnow': return '🐟';
      default: return '🏆';
    }
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold text-white">Arcade Leaderboard</h3>
        
        {showFilters && (
          <div className="flex space-x-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTimeframe('daily')}
              className={`px-3 py-1 rounded-full text-sm ${
                activeTimeframe === 'daily' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setActiveTimeframe('weekly')}
              className={`px-3 py-1 rounded-full text-sm ${
                activeTimeframe === 'weekly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setActiveTimeframe('monthly')}
              className={`px-3 py-1 rounded-full text-sm ${
                activeTimeframe === 'monthly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setActiveTimeframe('allTime')}
              className={`px-3 py-1 rounded-full text-sm ${
                activeTimeframe === 'allTime' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Time
            </button>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rank</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">EMB Burned</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Wins</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Badge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {isLoading ? (
              // Loading state
              Array(5).fill(0).map((_, index) => (
                <tr key={`loading-${index}`} className="bg-gray-800">
                  <td colSpan={6} className="py-4 px-4">
                    <div className="animate-pulse flex items-center space-x-4">
                      <div className="h-4 w-4 bg-gray-700 rounded-full"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/6"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              // Actual leaderboard data
              leaderboardData.slice(0, maxEntries).map((entry, index) => {
                const isCurrentUser = highlightUser && publicKey && entry.wallet === publicKey.toString();
                
                return (
                  <tr 
                    key={index} 
                    className={`${
                      isCurrentUser 
                        ? 'bg-blue-900/30 border-l-4 border-blue-500' 
                        : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'
                    } hover:bg-gray-700/50 transition-colors`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full ${getBadgeColor(entry.rank)} text-xs font-bold`}>
                        {entry.rank}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {entry.username.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${isCurrentUser ? 'text-blue-300' : 'text-white'}`}>
                            {entry.username}
                          </p>
                          <p className="text-xs text-gray-400">{truncateAddress(entry.wallet)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-white">{entry.score.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-orange-400">{entry.embBurned.toLocaleString()} EMB</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm text-green-400">{entry.wins}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                        <span className="mr-1">{getBadgeIcon(entry.badge)}</span>
                        {entry.badge}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {onViewMore && (
        <div className="p-4 border-t border-gray-700 text-center">
          <button
            onClick={onViewMore}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            View Full Leaderboard
          </button>
        </div>
      )}
    </div>
  );
};

export default ArcadeLeaderboard;
