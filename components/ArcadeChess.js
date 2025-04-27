'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Modal from './Modal';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePhotonApi } from '../lib/usePhotonApi';
import { useChessRewards } from '../lib/useChessRewards'; 
import { WalletConnectionButton } from '../lib/WalletProvider';
// Import Chess from chess.js with proper named export
// chess.js v1.0.0+ uses named exports instead of default exports
import { Chess } from 'chess.js/dist/esm/chess';

// Import our new ChessboardWrapper component
const ChessboardWrapper = dynamic(() => import('./ChessboardWrapper'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-900/80 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#00FFA3] font-medium">Loading chessboard...</div>
      </div>
    </div>
  )
});

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
const ArcadeChess = ({ embBalance = 0, onTokenBurn = () => {}, isSimulationMode = true, isMultiplayer = false, opponent = null, onGameEnd = null }) => {
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
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [boardWidth, setBoardWidth] = useState(500);
  const [currentMove, setCurrentMove] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(isMultiplayer);
  const [moveTimer, setMoveTimer] = useState(null);
  const [moveTimeRemaining, setMoveTimeRemaining] = useState(30);
  const [playerColor, setPlayerColor] = useState('white');
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

  // Initialize multiplayer game when in competitive mode
  useEffect(() => {
    if (isMultiplayer && opponent) {
      const timer = setTimeout(() => {
        setWaitingForOpponent(false);
        const assignedColor = Math.random() > 0.5 ? 'white' : 'black';
        setPlayerColor(assignedColor);
        
        if (assignedColor === 'black') {
          makeRandomOpponentMove();
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isMultiplayer, opponent]);

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
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
    }, 500);
  };
  
  // Handle switching to 2D mode
  const handleSwitchTo2D = () => {
    setLoadError(false);
    setUse2DMode(true);
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
    }, 500);
  };

  const onDrop = (sourceSquare, targetSquare, piece) => {
    if (waitingForOpponent) return false;
    
    if (isMultiplayer) {
      const pieceColor = piece[0] === 'w' ? 'white' : 'black';
      if (pieceColor !== playerColor) return false;
    }

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece[1].toLowerCase() === "p" && targetSquare[1] === (piece[0] === "w" ? "8" : "1") ? "q" : undefined,
      });

      if (!move) return false;

      setPosition(game.fen());
      setCurrentMove(currentMove + 1);

      const newHistory = [...moveHistory];
      newHistory.push({
        from: sourceSquare,
        to: targetSquare,
        piece,
        fen: game.fen(),
        notation: move.san,
      });
      setMoveHistory(newHistory);

      if (game.game_over()) {
        handleGameOver();
        return true;
      }

      if (isMultiplayer) {
        startMoveTimer();
        setTimeout(() => {
          makeRandomOpponentMove();
        }, 1500 + Math.random() * 3000);
        return true;
      }

      if (!isMultiplayer && !game.game_over()) {
        setIsAIThinking(true);
        setTimeout(() => {
          makeAIMove(difficulty);
        }, 500);
      }

      return true;
    } catch (e) {
      console.error("Move error:", e);
      return false;
    }
  };

  const makeRandomOpponentMove = () => {
    if (game.game_over() || waitingForOpponent) return;
    
    try {
      const possibleMoves = game.moves();
      
      if (possibleMoves.length === 0) return;
      
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      const move = game.move(randomMove);
      
      if (!move) return;
      
      setPosition(game.fen());
      setCurrentMove(currentMove + 1);
      
      const newHistory = [...moveHistory];
      newHistory.push({
        from: move.from,
        to: move.to,
        piece: move.piece,
        fen: game.fen(),
        notation: move.san,
      });
      setMoveHistory(newHistory);
      
      if (game.game_over()) {
        handleGameOver();
      }
      
      clearMoveTimer();
      
    } catch (e) {
      console.error("Opponent move error:", e);
    }
  };

  const makeAIMove = (difficultyLevel) => {
    // Placeholder for AI move logic
    setTimeout(() => {
      setIsAIThinking(false);
      makeRandomOpponentMove(); // For now, just make a random move
    }, 1000);
  };

  const startMoveTimer = () => {
    clearMoveTimer();
    setMoveTimeRemaining(30);
    
    const timer = setInterval(() => {
      setMoveTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setMoveTimer(timer);
  };

  const clearMoveTimer = () => {
    if (moveTimer) {
      clearInterval(moveTimer);
      setMoveTimer(null);
    }
  };

  const handleTimeExpired = () => {
    if (isMultiplayer) {
      handleGameOver(playerColor === 'white' ? 'black' : 'white');
    }
  };

  const handleGameOver = (winner = null) => {
    clearMoveTimer();
    
    let result = null;
    
    if (winner) {
      result = winner === 'white' ? 'White wins' : 'Black wins';
    } else if (game.isCheckmate()) {
      result = game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
    } else if (game.isDraw()) {
      result = 'Game drawn';
    } else if (game.isStalemate()) {
      result = 'Draw by stalemate';
    } else if (game.isThreefoldRepetition()) {
      result = 'Draw by repetition';
    } else {
      result = 'Game over';
    }
    
    setGameResult(result);
    
    if (isMultiplayer && onGameEnd) {
      const winnerAddress = (result.includes('White wins') && playerColor === 'white') ||
                            (result.includes('Black wins') && playerColor === 'black') ?
                            'playerWon' : 'opponentWon';
                            
      onGameEnd({
        winner: winnerAddress === 'playerWon' ? opponent : null,
        result
      });
    }
  };

  return (
    <div className="relative bg-gray-900/40 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF]">3D Chess Arcade</h2>
        
        {isPlaying && (
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800/60 px-4 py-1.5 rounded-lg">
              <span className="text-gray-300">Time: </span>
              <span className="text-[#00FFA3] font-medium">{timeSpent}</span>
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
            
            <button
              onClick={() => setIsPlaying(true)}
              className="w-full py-4 px-6 rounded-xl font-medium transition transform hover:scale-105 
                bg-gradient-to-r from-[#00FFA3] to-[#9945FF] hover:from-[#00FFA3]/90 hover:to-[#9945FF]/90 text-gray-900"
            >
              {selectedMode === 'premium' 
                ? `Start Premium Game (1 EMB)` 
                : 'Start Free Game'}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="h-[600px] w-full bg-black/40 rounded-xl overflow-hidden border border-gray-700/30">
            {loadError ? (
              <ChessFallback 
                onRetry={handleChessRetry}
                onSwitchTo2D={handleSwitchTo2D}
              />
            ) : use2DMode ? (
              <ChessIsolated 
                difficulty={difficulty} 
                onGameEnd={handleGameOver}
                isPremium={selectedMode === 'premium'}
              />
            ) : (
              <div className="relative">
                <ChessboardWrapper
                  id="ArcadeChess"
                  position={position}
                  onPieceDrop={onDrop}
                  boardWidth={boardWidth}
                  boardOrientation={playerColor}
                  difficulty={difficulty}
                  onGameEnd={handleGameOver}
                  isPremium={selectedMode === 'premium'}
                />
                {isMultiplayer && moveTimer && (
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gray-700">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000"
                      style={{ width: `${(moveTimeRemaining / 30) * 100}%` }}
                    ></div>
                  </div>
                )}
                {gameResult && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="bg-gray-900 p-6 rounded-lg text-center">
                      <h3 className="text-2xl font-bold text-white mb-4">{gameResult}</h3>
                      <button
                        onClick={() => setIsPlaying(false)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
                      >
                        New Game
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArcadeChess;
