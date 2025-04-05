'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Modal from './Modal';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePhotonApi } from '@/lib/usePhotonApi';
import { useChessRewards } from '@/lib/useChessRewards'; 
import { WalletConnectionButton } from '@/lib/WalletProvider';

// Properly import ChessGame component with dynamic loading and no SSR
const ChessGame = dynamic(() => import('./ChessGame'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-900/80 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#9945FF] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#9945FF] font-medium">Loading 3D chess...</div>
      </div>
    </div>
  )
});

// Fallback 2D component in case 3D fails - also dynamic loaded
const ChessIsolated = dynamic(() => import('./ChessIsolated'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-900/80 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#00FFA3] font-medium">Loading 2D chess...</div>
      </div>
    </div>
  )
});

// Fallback component in case ChessGame loading fails
const ChessFallback = ({ onRetry, onSwitchTo2D }) => (
  <div className="flex items-center justify-center w-full h-full bg-gray-900/90 rounded-xl">
    <div className="flex flex-col items-center justify-center text-center max-w-md p-8">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-medium text-white mb-3">Failed to load 3D Chess</h3>
      <p className="text-gray-300 mb-6">
        There was a problem loading the 3D chess game. This could be due to WebGL not being supported in your browser, 
        or insufficient system resources.
      </p>
      <div className="space-y-3">
        <button 
          onClick={onRetry}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white rounded-lg transition transform hover:scale-105"
        >
          Try Again
        </button>
        <button
          onClick={onSwitchTo2D}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#00FFA3]/80 to-[#00FFA3] hover:opacity-90 text-gray-900 font-medium rounded-lg transition transform hover:scale-105"
        >
          Switch to 2D Mode
        </button>
      </div>
    </div>
  </div>
);

// Helper function to generate truly unique IDs
const generateUniqueId = () => {
  return `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
};

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
  const [use2DMode, setUse2DMode] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const { getWhaleActivity } = usePhotonApi();
  const { connected, publicKey } = useWallet();
  const chessRewards = useChessRewards();
  
  // For demo purposes, use these fixed values
  const _embBalance = embBalance || (connected ? 100 : 0); // Use the passed balance, wallet balance, or a default
  
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
    const id = generateUniqueId();
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
  
  // Handle switching to 2D mode
  const handleSwitchTo2D = () => {
    setLoadError(false);
    setUse2DMode(true);
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

  // Calculate premium rewards bonus
  const getPremiumBonus = (result) => {
    if (selectedMode !== 'premium') return { xpBonus: 0, tokenBonus: 0 };
    
    let xpBonus = 0;
    let tokenBonus = 0;
    
    if (result === 'win') {
      xpBonus = 0.25; // 25% bonus
      tokenBonus = 0.2; // 20% token bonus
    } else if (result === 'draw') {
      xpBonus = 0.1; // 10% bonus
      tokenBonus = 0.1; // 10% token bonus
    } else if (result === 'loss') {
      xpBonus = -0.5; // 50% protection
      tokenBonus = 0; // No token bonus for loss
    }
    
    return { xpBonus, tokenBonus };
  };

  // Handle starting a new game
  const handleStartGame = async () => {
    if (selectedMode === 'premium') {
      if (!connected) {
        showNotification('Wallet Not Connected', 'Connect your wallet to play in premium mode');
        setSelectedMode('free');
        return;
      }
      
      if (_embBalance >= 1) {
        // Burn 1 EMB token
        try {
          // In a real implementation, this would call the blockchain to burn tokens
          // Here we just update the UI and call the onTokenBurn callback
          setTokensBurned(prev => prev + 1);
          onTokenBurn(1);
          
          showNotification('Premium Game Started', 'Playing Chess in Premium Mode (1 EMB token burned)');
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
      showNotification('Game Started', 'Playing Chess (Free Mode)');
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
  const handleGameEnd = async (result) => {
    // Stop timer
    clearInterval(timerRef.current);
    
    if (result === 'error') {
      handleChessError();
      return;
    }
    
    if (result === 'restart') {
      setUse2DMode(false);
      setLoadError(false);
      setIsPlaying(false);
      return;
    }
    
    // Record game in history
    const gameRecord = {
      id: generateUniqueId(),
      date: new Date().toISOString(),
      difficulty,
      result,
      duration: timeSpent,
      tokensBurned: selectedMode === 'premium' ? 1 : 0,
      mode: selectedMode
    };
    
    setPlayHistory(prev => [gameRecord, ...prev]);
    setIsPlaying(false);
    
    // Calculate bonus percentages
    const { xpBonus, tokenBonus } = getPremiumBonus(result);
    
    // Show notification with bonus for premium mode
    const resultMessage = result === 'win' 
      ? `Congratulations! You won the chess game. ${selectedMode === 'premium' ? `Premium win bonus: +${xpBonus * 100}% XP!` : ''}` 
      : result === 'draw' 
        ? `The game ended in a draw. ${selectedMode === 'premium' ? `Premium draw bonus: +${xpBonus * 100}% XP!` : ''}`
        : `Better luck next time. The AI won this round. ${selectedMode === 'premium' ? `Premium loss protection: ${xpBonus * 100}% XP loss!` : ''}`;
    
    showNotification('Game Ended', resultMessage);
    
    // Process rewards if connected to wallet
    if (connected && publicKey && chessRewards.isInitialized) {
      try {
        let rewardResult;
        
        if (result === 'win') {
          rewardResult = await chessRewards.rewardForWin(difficulty);
          // Apply premium bonus if applicable
          if (selectedMode === 'premium' && rewardResult.success) {
            rewardResult.xpAmount = Math.floor(rewardResult.xpAmount * (1 + xpBonus));
            rewardResult.rewardAmount = rewardResult.rewardAmount * (1 + tokenBonus);
          }
        } else if (result === 'draw') {
          rewardResult = await chessRewards.rewardForDraw(difficulty);
          // Apply premium bonus if applicable
          if (selectedMode === 'premium' && rewardResult.success) {
            rewardResult.xpAmount = Math.floor(rewardResult.xpAmount * (1 + xpBonus));
            rewardResult.rewardAmount = rewardResult.rewardAmount * (1 + tokenBonus);
          }
        }
        
        if (rewardResult && rewardResult.success) {
          showNotification(
            'Rewards Earned!',
            `You earned ${rewardResult.rewardAmount.toFixed(3)} EMB tokens and ${rewardResult.xpAmount} XP`
          );
        }
      } catch (err) {
        console.error("Error processing rewards:", err);
      }
    }
    
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

    if (isPlaying && !use2DMode && !checkWebGLSupport()) {
      showNotification('WebGL Not Supported', 'Your browser does not support WebGL, which is required for 3D chess.');
      setLoadError(true);
    }
  }, [isPlaying, use2DMode]);

  return (
    <div className="relative bg-gray-900/40 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF]">3D Chess Arcade</h2>
        
        {isPlaying && (
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800/60 px-4 py-1.5 rounded-lg">
              <span className="text-gray-300">Time: </span>
              <span className="text-[#00FFA3] font-medium">{formatTime(timeSpent)}</span>
            </div>
            {selectedMode === 'premium' ? (
              <div className="bg-[#9945FF]/30 px-4 py-1.5 rounded-lg border border-[#9945FF]/30">
                <span className="text-[#9945FF] font-medium">Premium Mode</span>
              </div>
            ) : (
              <div className="bg-gray-800/50 px-4 py-1.5 rounded-lg">
                <span className="text-gray-300 font-medium">Free Mode</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Banner for Trade Signal Integration */}
      <div className="bg-gradient-to-r from-[#9945FF]/10 to-[#00FFA3]/10 p-6 rounded-xl border border-[#9945FF]/20 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 bg-[#9945FF]/20 p-3 rounded-lg mr-4">
            <svg className="w-8 h-8 text-[#9945FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[#00FFA3] font-semibold text-lg mb-2">Play Chess, Earn Trading Signals!</h3>
            <p className="text-gray-300">
              Win games to unlock exclusive AIXBT trading signals. Premium mode players get higher chance 
              of receiving whale movement alerts directly from @mobyagent.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="bg-[#9945FF]/20 px-3 py-1.5 rounded-lg text-xs text-[#9945FF]">Win in Premium = 100% Signal</div>
              <div className="bg-[#00FFA3]/20 px-3 py-1.5 rounded-lg text-xs text-[#00FFA3]">Win in Free = 30% Signal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom notification system */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-4 flex flex-col animate-fade-in"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-white">{notification.title}</h4>
              <button 
                onClick={() => dismissNotification(notification.id)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
          </div>
        ))}
      </div>
      
      {!isPlaying ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl max-w-md w-full border border-gray-700/30">
            <h3 className="text-xl font-medium text-white mb-5">Start a New Game</h3>
            
            <div className="p-5 bg-gradient-to-r from-[#9945FF]/10 to-[#00FFA3]/10 border border-[#9945FF]/20 rounded-xl mb-6">
              <p className="text-white">
                Enhance your gameplay with <span className="font-bold text-[#00FFA3]">Premium Mode</span>. Burn 1 EMB token 
                for win bonuses, loss protection, and advanced AI strategies!
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-3 font-medium">Select Mode:</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSelectedMode('free')}
                  className={`flex-1 py-3 px-4 rounded-xl transition ${
                    selectedMode === 'free' 
                      ? 'bg-gray-800 text-white border-2 border-[#00FFA3]' 
                      : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <span className="block text-sm mb-1">Free Play</span>
                  <span className="block text-xs text-gray-400">No bonuses</span>
                </button>
                <button
                  onClick={() => setSelectedMode('premium')}
                  className={`flex-1 py-3 px-4 rounded-xl transition ${
                    selectedMode === 'premium' 
                      ? 'bg-gradient-to-r from-[#9945FF]/60 to-[#9945FF]/80 text-white border border-[#9945FF]' 
                      : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <span className="block text-sm mb-1">Premium</span>
                  <span className="block text-xs text-gray-300">1 EMB token (25% bonus)</span>
                </button>
              </div>
              <div className="text-xs text-right mt-2">
                <button 
                  onClick={openPremiumModal}
                  className="text-[#00FFA3] hover:text-[#00FFA3]/80 transition-colors"
                >
                  View premium benefits
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-3 font-medium">Select Difficulty:</label>
              <div className="flex space-x-3">
                {['easy', 'medium', 'hard'].map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 py-3 px-4 rounded-lg capitalize transition ${
                      difficulty === level 
                        ? 'bg-gradient-to-r from-[#00FFA3]/80 to-[#00FFA3] text-gray-900 font-medium' 
                        : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800/90'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-3 font-medium">Rendering Mode:</label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUse2DMode(false)}
                  className={`flex-1 py-3 px-4 rounded-lg transition ${
                    !use2DMode 
                      ? 'bg-gradient-to-r from-[#9945FF]/80 to-[#9945FF] text-white' 
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800/90'
                  }`}
                >
                  <span className="block text-sm mb-1">3D Mode</span>
                  <span className="block text-xs text-gray-300">Immersive experience</span>
                </button>
                <button
                  onClick={() => setUse2DMode(true)}
                  className={`flex-1 py-3 px-4 rounded-lg transition ${
                    use2DMode 
                      ? 'bg-gradient-to-r from-[#00FFA3]/80 to-[#00FFA3] text-gray-900 font-medium' 
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800/90'
                  }`}
                >
                  <span className="block text-sm mb-1">2D Mode</span>
                  <span className="block text-xs text-gray-300">Compatibility mode</span>
                </button>
              </div>
            </div>
            
            {selectedMode === 'premium' && !connected && (
              <div className="mb-6 p-5 bg-yellow-900/20 backdrop-blur-sm border border-yellow-700/30 rounded-xl">
                <div className="flex items-center space-x-3 mb-3">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-yellow-200 font-medium">Connect your wallet to play in premium mode</p>
                </div>
                <div>
                  <WalletConnectionButton 
                    className="w-full py-3 border border-[#9945FF]/50 shadow-lg"
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={handleStartGame}
              className="w-full py-4 px-6 rounded-xl font-medium transition transform hover:scale-105 
                bg-gradient-to-r from-[#00FFA3] to-[#9945FF] hover:from-[#00FFA3]/90 hover:to-[#9945FF]/90 text-gray-900"
            >
              {selectedMode === 'premium' 
                ? `Start Premium Game (1 EMB)` 
                : 'Start Free Game'}
            </button>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              {selectedMode === 'premium' ? (
                <span>Your balance: <span className="text-[#9945FF] font-medium">{_embBalance} EMB</span></span>
              ) : (
                <span>Upgrade to premium mode for better rewards!</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Chess Game Container */}
          <div className="h-[600px] w-full bg-black/40 rounded-xl overflow-hidden border border-gray-700/30">
            {loadError ? (
              <ChessFallback 
                onRetry={handleChessRetry}
                onSwitchTo2D={handleSwitchTo2D}
              />
            ) : use2DMode ? (
              <ChessIsolated 
                difficulty={difficulty} 
                onGameEnd={handleGameEnd}
              />
            ) : (
              <ChessGame 
                difficulty={difficulty} 
                onGameEnd={handleGameEnd}
                isIsolated={true}
                isPremium={selectedMode === 'premium'} 
              />
            )}
          </div>
          
          {/* Game controls */}
          <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-700/30">
            <div className="text-sm text-gray-300 mb-3">
              Difficulty: <span className="text-[#00FFA3] capitalize">{difficulty}</span>
            </div>
            <button 
              onClick={() => {
                clearInterval(timerRef.current);
                setIsPlaying(false);
                showNotification('Game Forfeited', 'You forfeited the current game.');
              }}
              className="bg-red-600/90 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              Forfeit Game
            </button>
          </div>
        </div>
      )}
      
      {/* Premium Features Modal */}
      <Modal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        title="Premium Chess Features"
      >
        <div className="p-4">
          <div className="bg-gradient-to-r from-[#9945FF]/20 to-[#9945FF]/10 p-5 rounded-xl mb-6">
            <h3 className="text-xl font-semibold text-[#9945FF] mb-2">Premium Mode Benefits</h3>
            <p className="text-gray-300">
              Enhance your chess experience with premium mode. Burn 1 EMB token per game to unlock special features.
            </p>
          </div>
          
          <div className="space-y-5">
            <BenefitItem
              title="25% XP Bonus for Wins"
              description="Receive 25% more XP when you win a chess game in premium mode."
              icon={<svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>}
            />
            
            <BenefitItem
              title="20% EMB Token Bonus"
              description="Earn 20% more EMB tokens from game rewards when playing in premium mode."
              icon={<svg className="w-6 h-6 text-[#00FFA3]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>}
            />
            
            <BenefitItem
              title="Loss Protection"
              description="50% reduction in XP loss when losing a game in premium mode."
              icon={<svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>}
            />
            
            <BenefitItem
              title="Guaranteed Trade Signal"
              description="100% chance to receive a trading signal when winning in premium mode."
              icon={<svg className="w-6 h-6 text-[#9945FF]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>}
            />
            
            <BenefitItem
              title="Advanced AI"
              description="Experience smarter AI moves with better positional understanding."
              icon={<svg className="w-6 h-6 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>}
            />
          </div>
          
          <div className="mt-6 p-4 bg-[#00FFA3]/10 border border-[#00FFA3]/30 rounded-lg text-sm text-gray-300">
            <p className="flex items-center">
              <svg className="w-4 h-4 text-[#00FFA3] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Premium mode costs 1 EMB token per game and provides enhanced rewards and benefits.
            </p>
          </div>
          
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setShowPremiumModal(false)}
              className="px-6 py-2.5 bg-gradient-to-r from-[#9945FF] to-[#00FFA3] text-gray-900 font-medium rounded-lg transform transition hover:scale-105"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Trade Signal Modal */}
      <Modal
        isOpen={showTradeSignalModal}
        onClose={() => setShowTradeSignalModal(false)}
        title="Trading Signal Unlocked!"
      >
        {tradeSignal && (
          <div className="p-4">
            <div className="bg-gradient-to-r from-[#00FFA3]/20 to-[#9945FF]/20 p-6 rounded-xl mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-[#00FFA3]">{tradeSignal.market}</h3>
                <span className={`uppercase font-bold px-4 py-1 rounded-full text-sm ${
                  tradeSignal.direction === 'long' 
                    ? 'bg-[#00FFA3]/20 text-[#00FFA3]' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {tradeSignal.direction}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="bg-[#9945FF]/20 px-3 py-1.5 rounded-lg text-xs text-[#9945FF]">
                  Confidence: {tradeSignal.confidence}%
                </div>
                <div className="bg-gray-800/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-gray-300">
                  Generated: Just now
                </div>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-gray-300 font-medium mb-2">Signal Analysis:</h4>
                <p className="text-gray-400 bg-gray-800/40 p-4 rounded-lg">{tradeSignal.reason}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700/30">
                  <div className="text-sm text-gray-400">Entry Point</div>
                  <div className="text-xl font-semibold text-white">${tradeSignal.suggestedEntry.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700/30">
                  <div className="text-sm text-gray-400">Target Price</div>
                  <div className="text-xl font-semibold text-[#00FFA3]">${tradeSignal.target.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700/30">
                  <div className="text-sm text-gray-400">Stop Loss</div>
                  <div className="text-xl font-semibold text-red-400">${tradeSignal.stopLoss.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="p-5 bg-[#9945FF]/10 border border-[#9945FF]/20 rounded-xl">
                <h4 className="text-[#9945FF] font-medium flex items-center mb-3">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Risk Management
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <li className="bg-gray-800/30 p-3 rounded-lg text-sm">
                    <div className="text-xs text-gray-400">Potential profit</div>
                    <div className="text-[#00FFA3] font-medium">{((tradeSignal.target - tradeSignal.suggestedEntry) / tradeSignal.suggestedEntry * 100).toFixed(2)}%</div>
                  </li>
                  <li className="bg-gray-800/30 p-3 rounded-lg text-sm">
                    <div className="text-xs text-gray-400">Potential loss</div>
                    <div className="text-red-400 font-medium">{((tradeSignal.stopLoss - tradeSignal.suggestedEntry) / tradeSignal.suggestedEntry * 100).toFixed(2)}%</div>
                  </li>
                  <li className="bg-gray-800/30 p-3 rounded-lg text-sm">
                    <div className="text-xs text-gray-400">Risk-reward ratio</div>
                    <div className="text-[#9945FF] font-medium">{Math.abs((tradeSignal.target - tradeSignal.suggestedEntry) / (tradeSignal.stopLoss - tradeSignal.suggestedEntry)).toFixed(2)}</div>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowTradeSignalModal(false)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Close
              </button>
              
              <a
                href="/trade"
                className="px-5 py-2.5 bg-gradient-to-r from-[#00FFA3] to-[#00FFA3]/80 text-gray-900 font-medium rounded-lg flex items-center transform transition hover:scale-105"
              >
                <span>Open Trading Panel</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
            
            <p className="mt-4 text-xs text-gray-500 text-center">
              This signal was generated by AIXBT based on your chess game victory.
              {selectedMode === 'premium' && ' Premium mode users receive high-quality signals with every win!'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Benefit item component for Premium modal
const BenefitItem = ({ title, description, icon }) => (
  <div className="flex p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
    <div className="flex-shrink-0 w-10 h-10 bg-gray-700/40 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div className="ml-4">
      <h4 className="text-white font-medium">{title}</h4>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
    </div>
  </div>
);

export default ArcadeChess;