import { useState, useEffect } from 'react';

const CHALLENGES = [
  {
    id: 'profitable-week',
    title: 'Profitable Week',
    description: 'Maintain positive returns for 5 consecutive trading days',
    reward: 50,
    duration: '7 days',
    type: 'performance',
    difficulty: 'medium'
  },
  {
    id: 'volume-master',
    title: 'Volume Master',
    description: 'Execute trades totaling over 10,000 EMB in volume',
    reward: 100,
    duration: '30 days',
    type: 'volume',
    difficulty: 'hard'
  },
  {
    id: 'winning-streak',
    title: 'Winning Streak',
    description: 'Achieve 3 profitable trades in a row',
    reward: 25,
    duration: '24 hours',
    type: 'streak',
    difficulty: 'easy'
  },
  {
    id: 'risk-manager',
    title: 'Risk Manager',
    description: 'Complete 10 trades with proper stop-loss placement',
    reward: 75,
    duration: '14 days',
    type: 'risk',
    difficulty: 'medium'
  }
];

export default function Challenges({ walletAddress, mockTradeResults, onRewardEarned }) {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChallenges = async () => {
      setLoading(true);
      try {
        // In production, this would fetch from an API
        // Mock active challenges
        const mockActive = CHALLENGES.map(challenge => ({
          ...challenge,
          progress: Math.random(),
          startedAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
          endAt: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString()
        }));

        // Mock completed challenges
        const mockCompleted = [
          {
            ...CHALLENGES[0],
            completedAt: new Date(Date.now() - 86400000).toISOString(),
            reward: 50
          }
        ];

        setActiveChallenges(mockActive);
        setCompletedChallenges(mockCompleted);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      loadChallenges();
    }
  }, [walletAddress]);

  useEffect(() => {
    // Check for challenge completions when new trade results come in
    if (mockTradeResults && mockTradeResults.length > 0) {
      const latestTrade = mockTradeResults[mockTradeResults.length - 1];
      
      // Check winning streak challenge
      const lastThreeTrades = mockTradeResults.slice(-3);
      if (lastThreeTrades.length === 3 && 
          lastThreeTrades.every(trade => trade.signal === 'buy')) {
        const challenge = activeChallenges.find(c => c.id === 'winning-streak');
        if (challenge) {
          handleChallengeComplete(challenge);
        }
      }

      // Update challenge progress
      setActiveChallenges(current => 
        current.map(challenge => {
          let progress = challenge.progress;

          switch (challenge.type) {
            case 'volume':
              progress = Math.min(1, progress + (latestTrade.amount / 10000));
              break;
            case 'streak':
              progress = latestTrade.signal === 'buy' ? progress + 0.33 : 0;
              break;
            case 'risk':
              progress = latestTrade.stopLoss ? progress + 0.1 : progress;
              break;
          }

          return { ...challenge, progress };
        })
      );
    }
  }, [mockTradeResults]);

  const handleChallengeComplete = (challenge) => {
    setActiveChallenges(current => 
      current.filter(c => c.id !== challenge.id)
    );
    setCompletedChallenges(current => [
      ...current,
      { ...challenge, completedAt: new Date().toISOString() }
    ]);
    onRewardEarned?.(challenge.reward);
  };

  if (!walletAddress) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Connect your wallet to participate in challenges</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-blue-400 mb-6">Trading Challenges</h2>

      {/* Active Challenges */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-medium text-gray-300">Active Challenges</h3>
        {activeChallenges.map((challenge) => (
          <div
            key={challenge.id}
            className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/20"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-white">{challenge.title}</h4>
                <p className="text-sm text-gray-400">{challenge.description}</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                {challenge.difficulty}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-700 rounded-full mb-2">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${challenge.progress * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">
                {(challenge.progress * 100).toFixed(0)}% Complete
              </span>
              <span className="text-yellow-400">
                Reward: {challenge.reward} EMB
              </span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Ends {new Date(challenge.endAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-300 mb-4">Completed</h3>
          <div className="space-y-3">
            {completedChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-green-400">{challenge.title}</h4>
                    <p className="text-sm text-gray-400">
                      Completed {new Date(challenge.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-yellow-400">+{challenge.reward} EMB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Competition */}
      <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <h3 className="text-lg font-medium text-blue-400 mb-3">Monthly Challenge</h3>
        <p className="text-gray-300 mb-4">
          Top 3 traders with highest profit percentage this month win special rewards!
        </p>
        <div className="space-y-2 text-sm">
          <p className="flex justify-between">
            <span className="text-gray-400">🥇 1st Place:</span>
            <span className="text-yellow-400">1,000 EMB</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-400">🥈 2nd Place:</span>
            <span className="text-yellow-400">500 EMB</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-400">🥉 3rd Place:</span>
            <span className="text-yellow-400">250 EMB</span>
          </p>
        </div>
      </div>
    </div>
  );
}