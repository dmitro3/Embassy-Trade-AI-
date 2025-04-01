import React, { useState, useEffect } from 'react';
import { useWallet } from '../lib/WalletProvider';
import gamificationSystem from '../lib/gamification';
import { TUTORIALS } from '../content/tutorials';

export default function InteractiveTutorial() {
  const [currentTutorial, setCurrentTutorial] = useState(null);
  const [userProgress, setUserProgress] = useState({
    completedTutorials: new Set(),
    quizScores: new Map(),
    dailyTutorials: []
  });
  const [achievements, setAchievements] = useState([]);
  const { walletAddress } = useWallet();

  const handleTutorialComplete = async (tutorialId, score) => {
    if (!walletAddress) return;

    const updatedProgress = {
      completedTutorials: new Set([...userProgress.completedTutorials, tutorialId]),
      quizScores: new Map(userProgress.quizScores.set(tutorialId, score)),
      dailyTutorials: [
        ...userProgress.dailyTutorials,
        { tutorialId, timestamp: Date.now() }
      ]
    };
    setUserProgress(updatedProgress);

    // Award XP and check for achievements
    const result = await gamificationSystem.completeTutorial(walletAddress);

    if (result.xpResult.leveledUp) {
      alert(`Level Up! You are now level ${result.xpResult.newLevel}`);
    }

    if (result.newBadges.length > 0) {
      setAchievements(prev => [...prev, ...result.newBadges]);
      alert(`Achievement unlocked: ${result.newBadges.map(b => b.name).join(', ')}`);
    }

    // Perfect score bonus
    if (score === 100) {
      await gamificationSystem.awardXP(walletAddress, 50);
      alert('Perfect Score! +50 XP Bonus');
    }

    setCurrentTutorial(null);
  };

  return (
    <div className="space-y-6">
      {/* Tutorial List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TUTORIALS.map((tutorial) => (
          <div
            key={tutorial.id}
            className={`p-4 rounded-lg shadow-md cursor-pointer transition-all ${
              userProgress.completedTutorials.has(tutorial.id)
                ? 'bg-green-50 hover:bg-green-100'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => setCurrentTutorial(tutorial)}
          >
            <h3 className="font-semibold text-lg mb-2">{tutorial.title}</h3>
            <p className="text-sm text-gray-600">{tutorial.description}</p>
            {userProgress.completedTutorials.has(tutorial.id) && (
              <div className="mt-2 text-green-600 text-sm">
                Completed - Score: {userProgress.quizScores.get(tutorial.id)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Achievements Display */}
      {achievements.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">Recent Achievements</h3>
          <div className="flex flex-wrap gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm"
              >
                <div className="font-semibold text-yellow-800">{achievement.name}</div>
                <div className="text-yellow-600">{achievement.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Tutorial Modal */}
      {currentTutorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">{currentTutorial.title}</h2>
            <div className="prose max-w-none mb-6">
              {currentTutorial.content}
            </div>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setCurrentTutorial(null)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => handleTutorialComplete(currentTutorial.id, 100)} // Simulated perfect score
              >
                Complete Tutorial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}