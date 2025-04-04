'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

const Leaderboard = () => {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [traders, setTraders] = useState([]);
  const [timeframe, setTimeframe] = useState('week'); // day, week, month, all
  const [category, setCategory] = useState('pnl'); // pnl, winRate, volume
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch data from an API
        // For now, generate mock data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Create mock trader data with different performance metrics
        const mockTraders = Array(20).fill().map((_, i) => {
          const winRate = Math.floor(Math.random() * 30) + 50; // 50-80%
          const trades = Math.floor(Math.random() * 100) + 20; // 20-120 trades
          const wins = Math.floor(trades * (winRate / 100));
          const pnl = Math.random() > 0.8 ? 
            Math.floor(Math.random() * 50000) + 10000 : // Outlier high performers 
            Math.floor(Math.random() * 5000) + 500; // Normal performers
            
          return {
            id: `user_${i + 1}`,
            rank: i + 1,
            name: `Trader${i + 1}`,
            avatar: `/images/avatar-${(i % 5) + 1}.png`,
            pnl,
            pnlChange: Math.random() > 0.5 ? 
              Math.floor(Math.random() * 20) + 1 : // Positive change
              -1 * (Math.floor(Math.random() * 15) + 1), // Negative change
            winRate,
            trades,
            wins,
            losses: trades - wins,
            volume: Math.floor(Math.random() * 1000000) + 100000,
            hasGraduated: Math.random() > 0.3,
            badges: [
              Math.random() > 0.7 ? 'Top Trader' : null,
              Math.random() > 0.8 ? 'Veteran' : null,
              Math.random() > 0.9 ? 'Whale' : null,
              Math.random() > 0.9 ? 'Diamond Hands' : null,
            ].filter(Boolean),
            isCurrentUser: false,
          };
        });
        
        // Sort traders based on category
        let sortedTraders;
        if (category === 'pnl') {
          sortedTraders = mockTraders.sort((a, b) => b.pnl - a.pnl);
        } else if (category === 'winRate') {
          sortedTraders = mockTraders.sort((a, b) => b.winRate - a.winRate);
        } else if (category === 'volume') {
          sortedTraders = mockTraders.sort((a, b) => b.volume - a.volume);
        }
        
        // Assign ranks after sorting
        sortedTraders = sortedTraders.map((trader, index) => ({
          ...trader,
          rank: index + 1,
        }));
        
        // If user is connected, mark their entry
        if (publicKey) {
          const userAddress = publicKey.toString();
          // In a real implementation, we'd check if the user is in the leaderboard
          // For now, randomly select one trader to represent the current user
          const userIndex = Math.floor(Math.random() * sortedTraders.length);
          sortedTraders[userIndex] = {
            ...sortedTraders[userIndex],
            isCurrentUser: true,
            name: userAddress.slice(0, 4) + '...' + userAddress.slice(-4),
          };
        }
        
        setTraders(sortedTraders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [publicKey, timeframe, category]);
  
  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Leaderboard</h2>
        
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 w-full md:w-auto">
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeframe('day')}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Time
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCategory('pnl')}
              className={`px-3 py-1 rounded text-sm ${
                category === 'pnl' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              PnL
            </button>
            <button
              onClick={() => setCategory('winRate')}
              className={`px-3 py-1 rounded text-sm ${
                category === 'winRate' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Win Rate
            </button>
            <button
              onClick={() => setCategory('volume')}
              className={`px-3 py-1 rounded text-sm ${
                category === 'volume' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Volume
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-left text-sm">
                <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                <th className="px-4 py-3">Trader</th>
                <th className="px-4 py-3 text-right">
                  {category === 'pnl' && 'PnL'}
                  {category === 'winRate' && 'Win Rate'}
                  {category === 'volume' && 'Volume'}
                </th>
                <th className="px-4 py-3 text-right">Trades</th>
                <th className="px-4 py-3 text-right rounded-tr-lg">W/L</th>
              </tr>
            </thead>
            <tbody>
              {traders.map((trader, index) => (
                <tr 
                  key={trader.id} 
                  className={`
                    ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/30'} 
                    ${trader.isCurrentUser ? 'bg-blue-900/30 border border-blue-600/30' : ''}
                    ${trader.rank <= 3 ? 'bg-gradient-to-r from-gray-800 to-gray-800/30' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {trader.rank <= 3 ? (
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center mr-2
                          ${trader.rank === 1 ? 'bg-yellow-500' : ''}
                          ${trader.rank === 2 ? 'bg-gray-400' : ''}
                          ${trader.rank === 3 ? 'bg-amber-700' : ''}
                          text-black font-bold
                        `}>
                          {trader.rank}
                        </div>
                      ) : (
                        <span className="w-6 text-center mr-2">{trader.rank}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/profile/${trader.id}`} className="flex items-center hover:opacity-80">
                      <img 
                        src={trader.avatar} 
                        alt={trader.name}
                        className="h-8 w-8 rounded-full mr-3"
                      />
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">
                            {trader.name} {trader.isCurrentUser && '(You)'}
                          </span>
                          {trader.hasGraduated && (
                            <span className="ml-2 w-3 h-3 rounded-full bg-purple-500"></span>
                          )}
                        </div>
                        {trader.badges.length > 0 && (
                          <div className="flex space-x-1 mt-1">
                            {trader.badges.map((badge, i) => (
                              <span 
                                key={i} 
                                className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 rounded-sm"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {category === 'pnl' && (
                      <div>
                        <span className={trader.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ${formatNumber(trader.pnl)}
                        </span>
                        <div className="text-xs flex items-center justify-end">
                          <span className={trader.pnlChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {trader.pnlChange >= 0 ? '+' : ''}{trader.pnlChange}%
                          </span>
                          <span className="text-gray-500 ml-1">{timeframe}</span>
                        </div>
                      </div>
                    )}
                    {category === 'winRate' && (
                      <span className="font-medium">{trader.winRate}%</span>
                    )}
                    {category === 'volume' && (
                      <span>${formatNumber(trader.volume)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {trader.trades}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400">{trader.wins}</span>
                    {' / '}
                    <span className="text-red-400">{trader.losses}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;