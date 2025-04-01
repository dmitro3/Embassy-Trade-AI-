import { useState, useEffect } from 'react';
import { GamificationSystem } from '../lib/gamification';

export default function UserProfile({ userId, walletAddress }) {
  const [userStats, setUserStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gamification] = useState(() => new GamificationSystem(userId));

  useEffect(() => {
    if (walletAddress) {
      loadUserProfile();
    }
  }, [walletAddress]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      // In production, this would fetch from API/database
      const levelInfo = gamification.calculateLevel();
      const mockStats = {
        totalTrades: 156,
        successfulTrades: 112,
        profitableTrades: 98,
        consecutiveProfits: 4,
        monthlyProfit: 18.5,
        winRate: 0.72,
        maxDrawdown: 0.015,
        volatilityTrades: 45,
        volatilityWinRate: 0.65,
        totalVolume: 125000,
        totalProfit: 8500,
        strategyStats: {
          threebar: { successfulTrades: 42 },
          momentum: { successfulTrades: 38 },
          macrossover: { successfulTrades: 32 }
        }
      };

      const achievementsList = await gamification.checkAchievements(mockStats);
      
      setUserStats({
        ...mockStats,
        level: levelInfo.level,
        xp: levelInfo.currentXP,
        xpToNextLevel: levelInfo.nextLevelXP,
        rank: levelInfo.title,
        progress: levelInfo.progress
      });
      
      setAchievements(achievementsList);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="text-center p-8">
        <p>Connect your wallet to view your profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold truncate">{walletAddress}</h2>
            <p className="text-gray-400">Level {userStats.level} {userStats.rank}</p>
          </div>
        </div>
        
        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{userStats.xp} XP</span>
            <span>{userStats.xpToNextLevel} XP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${userStats.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Trading Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Trades</span>
              <span>{userStats.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Win Rate</span>
              <span className="text-green-500">{(userStats.winRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Profit</span>
              <span className="text-green-500">${userStats.totalProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Monthly Profit</span>
              <span className={userStats.monthlyProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                {userStats.monthlyProfit}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Risk Management</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Max Drawdown</span>
              <span className="text-red-500">{(userStats.maxDrawdown * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Volatility Trades</span>
              <span>{userStats.volatilityTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Volatility Win Rate</span>
              <span className="text-green-500">
                {(userStats.volatilityWinRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Strategy Performance</h3>
          <div className="space-y-2">
            {Object.entries(userStats.strategyStats).map(([strategy, stats]) => (
              <div key={strategy} className="flex justify-between">
                <span className="text-gray-400">{strategy}</span>
                <span>{stats.successfulTrades} successful</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className="bg-gray-700 p-4 rounded-lg border border-purple-500"
            >
              <h4 className="font-bold text-purple-400">{achievement.name}</h4>
              <p className="text-sm text-gray-400">{achievement.description}</p>
              <p className="text-sm text-yellow-400 mt-2">+{achievement.reward} XP</p>
            </div>
          ))}
          {achievements.length === 0 && (
            <p className="text-gray-400 col-span-full text-center py-4">
              Complete trades and challenges to earn achievements!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}