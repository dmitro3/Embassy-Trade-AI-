import { useState, useEffect } from 'react';

export default function Leaderboard({ walletAddress, userStats }) {
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // In production, this would be an API call
        // Mock data for demonstration
        const mockData = [
          {
            address: '0x1234...5678',
            name: 'Trading Master',
            profit: 12500,
            trades: 45,
            winRate: 0.78,
            ranking: 1
          },
          {
            address: '0x8765...4321',
            name: 'Crypto Wizard',
            profit: 8900,
            trades: 32,
            winRate: 0.72,
            ranking: 2
          },
          {
            address: '0x9876...5432',
            name: 'EMB Trader',
            profit: 6700,
            trades: 28,
            winRate: 0.68,
            ranking: 3
          },
          {
            address: walletAddress || '0x5432...9876',
            name: 'You',
            profit: userStats?.totalProfit || 5400,
            trades: userStats?.trades || 25,
            winRate: userStats?.winRate || 0.65,
            ranking: 4
          }
        ];

        setLeaderboardData(mockData);
        const userPosition = mockData.findIndex(user => user.address === walletAddress);
        setUserRank(userPosition >= 0 ? userPosition + 1 : null);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [walletAddress, timeframe, userStats]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-blue-400">Leaderboard</h2>
        <div className="flex space-x-2">
          {['day', 'week', 'month', 'all'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-full text-sm ${
                timeframe === tf ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {leaderboardData.map((trader, index) => {
          const isUser = trader.address === walletAddress;
          const rankColors = {
            1: 'text-yellow-400',
            2: 'text-gray-400',
            3: 'text-amber-600'
          };

          return (
            <div
              key={trader.address}
              className={`p-3 rounded ${
                isUser ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`text-lg font-bold ${rankColors[index + 1] || 'text-gray-400'}`}>
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium">
                      {trader.name} {isUser && '(You)'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {trader.trades} trades • {(trader.winRate * 100).toFixed(1)}% win rate
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${trader.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${trader.profit.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Profit</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {userRank && userRank > 4 && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg font-bold text-gray-400">#{userRank}</span>
              <div>
                <p className="font-medium">You</p>
                <p className="text-sm text-gray-400">
                  {userStats.trades} trades • {(userStats.winRate * 100).toFixed(1)}% win rate
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-medium ${userStats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${userStats.totalProfit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Profit</p>
            </div>
          </div>
        </div>
      )}

      {/* Competition Info */}
      <div className="mt-6 p-4 bg-gray-700/30 rounded">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Weekly Competition</h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-400">
            🏆 Prize Pool: <span className="text-yellow-400">1,000 EMB</span>
          </p>
          <p className="text-gray-400">
            ⏰ Ends in: <span className="text-blue-400">2d 14h 35m</span>
          </p>
          <p className="text-gray-400">
            👥 Participants: <span className="text-blue-400">156</span>
          </p>
        </div>
      </div>
    </div>
  );
}