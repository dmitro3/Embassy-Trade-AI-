import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Modal from './Modal'; // Import our custom Modal component
import { usePhotonApi } from '@/lib/usePhotonApi';

// Properly import ChessGame component with dynamic loading and no SSR
const ChessGame = dynamic(() => import('./ChessGame'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-800 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-blue-400">Loading 3D chess...</div>
      </div>
    </div>
  )
});

// Fallback component in case ChessGame loading fails
const ChessFallback = ({ onRetry }) => (
  <div className="flex items-center justify-center w-full h-full bg-gray-800/90 rounded-xl">
    <div className="flex flex-col items-center justify-center text-center max-w-md p-6">
      <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 className="text-xl font-medium text-white mb-2">Failed to load 3D Chess</h3>
      <p className="text-gray-300 mb-4">
        There was a problem loading the 3D chess game. This could be due to WebGL not being supported in your browser, 
        or insufficient system resources.
      </p>
      <div className="space-y-3">
        <button 
          onClick={onRetry}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

/**
 * ArcadeChess component for the Embassy AI platform
 * Allows users to play 3D chess while waiting for trades
 */
const ArcadeChess = ({ embBalance = 0, onTokenBurn = () => {}, isSimulationMode = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState('medium'); // easy, medium, hard
  const [playHistory, setPlayHistory] = useState([]);
  const [tokensBurned, setTokensBurned] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showTradeSignalModal, setShowTradeSignalModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState('free'); // 'free' or 'premium'
  const [tradeSignal, setTradeSignal] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const { getWhaleActivity } = usePhotonApi();
  
  // For demo purposes, use these fixed values
  const _embBalance = embBalance || 100; // Use the passed balance or a default of 100
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Custom notification system that we can fully control
  const showNotification = (title, message) => {
    const id = Date.now();
    const notification = { id, title, message };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(id);
    }, 5000);
    
    return id;
  };
  
  // Dismiss a notification by its id
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Handle chess game error
  const handleChessError = () => {
    setLoadError(true);
    showNotification('Chess Game Error', 'There was a problem loading the 3D chess game. Try reloading the page.');
  };

  // Handle chess game retry
  const handleChessRetry = () => {
    setLoadError(false);
    // Force remount of the component
    setIsPlaying(false);
    setTimeout(() => {
      handleStartGame();
    }, 500);
  };

  // Mock trade signals for the game rewards
  const mockTradeSignals = [
    {
      id: 'signal-chess-1',
      market: 'SOL-USD',
      direction: 'long',
      confidence: 82,
      reason: 'Breaking resistance with strong momentum after whale accumulation',
      suggestedEntry: 106.45,
      target: 125.80,
      stopLoss: 98.20
    },
    {
      id: 'signal-chess-2',
      market: 'BTC-USD',
      direction: 'long',
      confidence: 78,
      reason: 'Technical breakout confirmed by on-chain whale activity',
      suggestedEntry: 58260.50,
      target: 62500.00,
      stopLoss: 55800.00
    },
    {
      id: 'signal-chess-3',
      market: 'ETH-USD',
      direction: 'short',
      confidence: 76,
      reason: 'Bearish divergence at resistance with declining volume',
      suggestedEntry: 3387.25,
      target: 3050.00,
      stopLoss: 3520.00
    }
  ];

  // Handle starting a new game
  const handleStartGame = () => {
    if (selectedMode === 'premium') {
      if (_embBalance >= 1) {
        // Burn 1 EMB token
        try {
          // In a real implementation, this would call the blockchain to burn tokens
          // Here we just update the UI and call the onTokenBurn callback
          setTokensBurned(prev => prev + 1);
          onTokenBurn(1);
          
          showNotification('Premium Game Started', 'Playing 3D Chess in Premium Mode (1 EMB token burned)');
        } catch (error) {
          console.error("Error burning token:", error);
          showNotification('Error', 'Failed to burn EMB token. Switching to free mode.');
          setSelectedMode('free');
        }
      } else {
        showNotification('Insufficient Balance', 'Not enough EMB tokens. Switching to free mode.');
        setSelectedMode('free');
      }
    } else {
      // Free mode notification
      showNotification('Game Started', 'Playing 3D Chess (Free Mode)');
    }
    
    // Start the game
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    
    // Start timer to track time spent
    timerRef.current = setInterval(() => {
      const secondsElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(secondsElapsed);
    }, 1000);
  };

  // Open premium features modal
  const openPremiumModal = () => {
    setShowPremiumModal(true);
  };

  // Handle ending a game
  const handleGameEnd = (result) => {
    // Stop timer
    clearInterval(timerRef.current);
    
    if (result === 'error') {
      handleChessError();
      return;
    }
    
    // Record game in history
    const gameRecord = {
      id: `game-${Date.now()}`,
      date: new Date().toISOString(),
      difficulty,
      result,
      duration: timeSpent,
      tokensBurned: selectedMode === 'premium' ? 1 : 0,
      mode: selectedMode
    };
    
    setPlayHistory(prev => [gameRecord, ...prev]);
    setIsPlaying(false);
    
    // Show notification with bonus for premium mode
    const resultMessage = result === 'win' 
      ? `Congratulations! You won the chess game. ${selectedMode === 'premium' ? 'Premium win bonus: +25% XP!' : ''}` 
      : result === 'draw' 
        ? `The game ended in a draw. ${selectedMode === 'premium' ? 'Premium draw bonus: +10% XP!' : ''}`
        : `Better luck next time. The AI won this round. ${selectedMode === 'premium' ? 'Premium loss protection: -50% XP loss!' : ''}`;
    
    showNotification('Game Ended', resultMessage);
    
    // Generate trading signal for winning in premium mode or sometimes in free mode
    if (result === 'win' && (selectedMode === 'premium' || Math.random() < 0.3)) {
      // Select a random trade signal
      const signal = mockTradeSignals[Math.floor(Math.random() * mockTradeSignals.length)];
      setTradeSignal(signal);
      
      // Show trade signal modal
      setTimeout(() => {
        setShowTradeSignalModal(true);
      }, 1000);
      
      // Notification about trade signal
      showNotification(
        'Trading Signal Unlocked!', 
        `Your chess victory has earned you a premium trading signal for ${signal.market}!`
      );
    }
  };

  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check for WebGL support
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        return (
          !!window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch (e) {
        return false;
      }
    };

    if (isPlaying && !checkWebGLSupport()) {
      showNotification('WebGL Not Supported', 'Your browser does not support WebGL, which is required for 3D chess.');
      setLoadError(true);
    }
  }, [isPlaying]);

  return (
    <div className="bg-gray-800 rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">3D Chess Arcade</h2>
        
        {isPlaying && (
          <div className="flex items-center space-x-4">
            <div className="bg-gray-700 px-3 py-1 rounded-md">
              <span className="text-gray-300">Time: </span>
              <span className="text-blue-400 font-medium">{formatTime(timeSpent)}</span>
            </div>
            {selectedMode === 'premium' ? (
              <div className="bg-purple-700/30 px-3 py-1 rounded-md">
                <span className="text-purple-400 font-medium">Premium Mode</span>
              </div>
            ) : (
              <div className="bg-gray-700/50 px-3 py-1 rounded-md">
                <span className="text-gray-400 font-medium">Free Mode</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Banner for Trade Signal Integration */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-xl border border-blue-800/30 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 bg-blue-800/30 p-2 rounded-lg mr-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-blue-300 font-semibold text-lg mb-1">Play Chess, Earn Trading Signals!</h3>
            <p className="text-gray-300 text-sm">
              Win games to unlock exclusive AIXBT trading signals. Premium mode players get higher chance 
              of receiving whale movement alerts directly from @mobyagent.
            </p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="bg-blue-800/40 px-2 py-1 rounded text-xs text-blue-300">Win in Premium = 100% Signal</div>
              <div className="bg-blue-800/40 px-2 py-1 rounded text-xs text-blue-300">Win in Free = 30% Signal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom notification system */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 flex flex-col animate-fade-in"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-white">{notification.title}</h4>
              <button 
                onClick={() => dismissNotification(notification.id)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
          </div>
        ))}
      </div>
      
      {!isPlaying ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="bg-gray-700/50 p-6 rounded-xl max-w-md w-full">
            <h3 className="text-xl font-medium text-white mb-4">Start a New Game</h3>
            
            <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg mb-6">
              <p className="text-blue-100">
                Enhance your gameplay with <span className="font-bold">Premium Mode</span>. Burn 1 EMB token 
                for win bonuses, loss protection, and advanced AI strategies!
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Select Mode:</label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedMode('free')}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    selectedMode === 'free' 
                      ? 'bg-gray-600 text-white border border-gray-500' 
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <span className="block text-sm mb-1">Free Play</span>
                  <span className="block text-xs text-gray-400">No bonuses</span>
                </button>
                <button
                  onClick={() => setSelectedMode('premium')}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    selectedMode === 'premium' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border border-purple-500' 
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <span className="block text-sm mb-1">Premium</span>
                  <span className="block text-xs text-gray-300">1 EMB token (25% bonus)</span>
                </button>
              </div>
              <div className="text-xs text-right mt-1">
                <button 
                  onClick={openPremiumModal}
                  className="text-blue-400 hover:text-blue-300"
                >
                  View premium benefits
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Select Difficulty:</label>
              <div className="flex space-x-3">
                {['easy', 'medium', 'hard'].map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-2 px-4 rounded-md capitalize transition-colors ${
                      difficulty === level 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleStartGame}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
            >
              {selectedMode === 'premium' 
                ? `Start Premium Game (1 EMB)` 
                : 'Start Free Game'}
            </button>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              {selectedMode === 'premium' ? (
                <span>Your balance: <span className="text-purple-400 font-medium">{_embBalance} EMB</span></span>
              ) : (
                <span>Upgrade to premium mode for better rewards!</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Contain our ChessGame component in a fixed height container */}
          <div className="h-[600px] w-full bg-black/20 rounded-xl overflow-hidden">
            {loadError ? (
              <ChessFallback onRetry={handleChessRetry} />
            ) : (
              <ChessGame 
                difficulty={difficulty} 
                onGameEnd={handleGameEnd}
                isIsolated={true} 
              />
            )}
          </div>
          
          {/* Game controls */}
          <div className="absolute top-4 right-4 bg-gray-800/80 p-3 rounded-lg backdrop-blur-sm">
            <div className="text-sm text-gray-300 mb-2">Difficulty: <span className="text-blue-400 capitalize">{difficulty}</span></div>
            <button 
              onClick={() => {
                clearInterval(timerRef.current);
                setIsPlaying(false);
                showNotification('Game Forfeited', 'You forfeited the current game.');
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
            >
              Forfeit Game
            </button>
          </div>
          
          {/* Premium badge */}
          {selectedMode === 'premium' && !loadError && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-indigo-700 px-3 py-1 rounded-lg text-white text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Premium Mode
            </div>
          )}
        </div>
      )}
      
      {/* Game history */}
      {playHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-medium text-white mb-4">Game History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-left">Difficulty</th>
                  <th className="pb-2 text-left">Result</th>
                  <th className="pb-2 text-left">Duration</th>
                  <th className="pb-2 text-right">Mode</th>
                </tr>
              </thead>
              <tbody>
                {playHistory.map(game => (
                  <tr key={game.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                    <td className="py-2">{new Date(game.date).toLocaleDateString()}</td>
                    <td className="py-2 capitalize">{game.difficulty}</td>
                    <td className={`py-2 ${
                      game.result === 'win' ? 'text-green-500' : 
                      game.result === 'draw' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {game.result === 'win' ? 'Victory' : 
                       game.result === 'draw' ? 'Draw' : 'Defeat'}
                    </td>
                    <td className="py-2">{formatTime(game.duration)}</td>
                    <td className="py-2 text-right">
                      {game.mode === 'premium' ? (
                        <span className="text-purple-400">Premium</span>
                      ) : (
                        <span className="text-gray-400">Free</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Premium Benefits Modal */}
      <Modal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        title="Premium Chess Benefits"
        primaryAction={{
          label: "Get Premium",
          onClick: () => {
            setSelectedMode('premium');
            setShowPremiumModal(false);
          }
        }}
        secondaryAction={{
          label: "Maybe Later",
          onClick: () => setShowPremiumModal(false)
        }}
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-purple-900/30 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Enhanced XP Rewards</h4>
              <p className="text-gray-300 text-sm">Earn 25% more XP when you win games in premium mode.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-purple-900/30 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Advanced AI Strategies</h4>
              <p className="text-gray-300 text-sm">Premium mode AI uses enhanced opening book strategies.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-purple-900/30 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.625 2.655A9 9 0 0119 11a1 1 0 11-2 0 7 7 0 00-9.625-6.492 1 1 0 11-.75-1.853zM4.662 4.959A1 1 0 014.75 6.37 6.97 6.97 0 003 11a1 1 0 11-2 0 8.97 8.97 0 012.25-5.953 1 1 0 011.412-.088z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M5 11a5 5 0 1110 0 1 1 0 11-2 0 3 3 0 10-6 0c0 1.677-.345 3.276-.968 4.729a1 1 0 11-1.838-.789A9.964 9.964 0 005 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Loss Protection</h4>
              <p className="text-gray-300 text-sm">When you lose in premium mode, you only lose 50% of the normal XP.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-purple-900/30 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Support Development</h4>
              <p className="text-gray-300 text-sm">Your EMB tokens help us improve Embassy AI's trading algorithms.</p>
            </div>
          </div>
          
          {/* New benefit section for trading signals */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 bg-blue-900/30 p-2 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Premium Trading Signals</h4>
              <p className="text-gray-300 text-sm">100% chance to receive an AIXBT trading signal when you win in premium mode.</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-white font-medium mb-1">Premium cost:</h4>
            <div className="flex items-center">
              <span className="text-purple-400 font-bold text-2xl">1</span>
              <span className="text-purple-300 ml-2">EMB token per game</span>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              EMB tokens are used to access premium features across the Embassy AI platform.
            </p>
          </div>
        </div>
      </Modal>
      
      {/* New Trade Signal Modal */}
      <Modal
        isOpen={showTradeSignalModal}
        onClose={() => setShowTradeSignalModal(false)}
        title="Trading Signal Unlocked!"
        primaryAction={{
          label: "View in Trade Tab",
          onClick: () => {
            window.location.href = '/trade';
            setShowTradeSignalModal(false);
          }
        }}
        secondaryAction={{
          label: "Close",
          onClick: () => setShowTradeSignalModal(false)
        }}
      >
        {tradeSignal && (
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-900/30 p-3 rounded-lg mr-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-blue-300 font-semibold text-lg mb-1">
                  AIXBT Trading Signal
                </h3>
                <p className="text-gray-300 text-sm">
                  Your chess victory has unlocked a high-confidence trading opportunity!
                </p>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              tradeSignal.direction === 'long' 
                ? 'bg-green-900/20 border-green-700/30' 
                : 'bg-red-900/20 border-red-700/30'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className={`w-2 h-10 rounded-full mr-3 ${
                    tradeSignal.direction === 'long' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <h4 className="text-white font-medium">{tradeSignal.market} {tradeSignal.direction.toUpperCase()}</h4>
                    <p className="text-xs text-gray-400">
                      {tradeSignal.confidence}% confidence • Generated now
                    </p>
                  </div>
                </div>
                <div className={`text-sm font-mono px-2 py-1 rounded ${
                  tradeSignal.direction === 'long' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                }`}>
                  {tradeSignal.direction === 'long' ? '↗ BUY' : '↘ SELL'}
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-3">{tradeSignal.reason}</p>
              
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div className="bg-gray-800/60 p-2 rounded">
                  <div className="text-gray-400">Entry</div>
                  <div className="text-white font-medium">${tradeSignal.suggestedEntry.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800/60 p-2 rounded">
                  <div className="text-gray-400">Target</div>
                  <div className={`font-medium ${tradeSignal.direction === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                    ${tradeSignal.target.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-800/60 p-2 rounded">
                  <div className="text-gray-400">Stop Loss</div>
                  <div className="text-red-400 font-medium">${tradeSignal.stopLoss.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/60 p-3 rounded-lg">
              <p className="text-sm text-gray-300">
                This signal has been added to your Trade Tab. Visit the trading section to execute this trade 
                through Photon or set up auto-trading.
              </p>
            </div>
            
            <div className="p-3 border border-blue-900/30 rounded-lg bg-gradient-to-r from-blue-900/20 to-indigo-900/20">
              <div className="flex items-center text-sm">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-300">
                  Win more chess games in premium mode to unlock more trading signals!
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ArcadeChess;