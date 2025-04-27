'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ArcadeChess from './ArcadeChess';
import PokerGame from './PokerGame';
import ArcadeNotification from './ArcadeNotification';

const CompetitiveMatch = ({ match, onMatchEnd }) => {
  const { publicKey } = useWallet();
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, completed
  const [winner, setWinner] = useState(null);
  const [players, setPlayers] = useState(match?.players || []);
  const [matchTimer, setMatchTimer] = useState(600); // 10 minutes in seconds
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);
  
  // Handle match timer countdown
  useEffect(() => {
    if (gameState === 'playing' && matchTimer > 0) {
      const timer = setTimeout(() => {
        setMatchTimer(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && matchTimer === 0) {
      // Handle timeout
      setGameState('completed');
      setWinner('timeout');
    }
  }, [gameState, matchTimer]);
  
  // Start the match when all players have joined
  useEffect(() => {
    if (players.length === match.maxPlayers && gameState === 'waiting') {
      // Wait 5 seconds and then start the game
      const startTimer = setTimeout(() => {
        setGameState('playing');
      }, 5000);
      
      return () => clearTimeout(startTimer);
    }
  }, [players, match.maxPlayers, gameState]);
  
  // Show notification
  const showNotification = (message, type = 'info', duration = 5000) => {
    // Clear any existing notification timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    setNotification({
      message,
      type, // 'info', 'success', 'error', 'warning'
      id: Date.now()
    });
    
    // Auto-dismiss after duration
    if (duration > 0) {
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    try {
      const newMessage = {
        id: `msg_${Date.now()}`,
        sender: publicKey ? publicKey.toString() : 'Anonymous',
        senderShort: publicKey ? `${publicKey.toString().substring(0, 4)}...${publicKey.toString().substring(publicKey.toString().length - 4)}` : 'Anon',
        content: messageInput.trim(),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };
  
  const handleGameEnd = (result) => {
    try {
      setGameState('completed');
      setWinner(result.winner);
      
      // Show winner notification
      if (result.winner && result.winner !== 'timeout') {
        const isCurrentUser = result.winner === publicKey?.toString();
        showNotification(
          isCurrentUser 
            ? `Congratulations! You won ${match.entryFee * match.players.length} EMB!` 
            : `Game over! ${truncateAddress(result.winner)} won the match.`,
          isCurrentUser ? 'success' : 'info',
          6000
        );
      } else {
        showNotification(
          `Match ended in a ${result.winner === 'timeout' ? 'timeout' : 'draw'}. Funds returned to players.`,
          'warning',
          6000
        );
      }
      
      // Simulate distributing rewards
      setTimeout(() => {
        onMatchEnd({
          matchId: match.id,
          winner: result.winner,
          reward: match.entryFee * match.players.length
        });
      }, 3000);
    } catch (error) {
      console.error('Error ending game:', error);
      setError('An error occurred while ending the game. Your funds are safe and will be returned.');
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  return (
    <div className="bg-gray-900 rounded-lg">
      {/* Match header with info */}
      <div className="bg-gray-800 p-4 rounded-t-lg border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white">
              {match.gameType === 'chess' ? '♟️ Chess Match' : '🃏 Poker Game'}
            </h3>
            <p className="text-sm text-gray-400">Created by {truncateAddress(match.creator)}</p>
          </div>
          <div className="text-right">
            <div className="text-amber-400 font-medium">{match.entryFee * match.players.length} EMB pot</div>
            <div className="text-xs text-gray-400">
              {gameState === 'waiting' ? 'Waiting for players' : 
               gameState === 'playing' ? `Match in progress: ${formatTime(matchTimer)}` : 
               'Match completed'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main game area */}
      <div className="p-4">
        {gameState === 'waiting' && (
          <div className="text-center py-12">
            <div className="inline-block p-4 rounded-full bg-blue-900/30 mb-4">
              <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h4 className="text-xl font-medium text-white mb-2">Waiting for players to join...</h4>
            <p className="text-gray-400">
              {players.length} of {match.maxPlayers} players have joined
            </p>
            
            <div className="flex justify-center space-x-2 mt-6">
              {players.map((player, i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-300"
                  title={player}
                >
                  {player.substring(0, 2)}
                </div>
              ))}
              {Array(match.maxPlayers - players.length).fill(0).map((_, i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 border border-gray-700"
                >
                  ?
                </div>
              ))}
            </div>
            
            {players.length === match.maxPlayers && (
              <div className="mt-6 text-green-400">
                All players joined! Starting soon...
              </div>
            )}
          </div>
        )}
        
        {gameState === 'playing' && (
          <div>
            {match.gameType === 'chess' ? (
              <div className="mt-2">
                <ArcadeChess 
                  isMultiplayer={true}
                  opponent={players.find(p => p !== publicKey?.toString())}
                  onGameEnd={handleGameEnd}
                />
              </div>
            ) : (
              <div className="mt-2">
                <PokerGame 
                  isCompetitive={true}
                  players={players}
                  onGameEnd={handleGameEnd}
                />
              </div>
            )}
          </div>
        )}
        
        {gameState === 'completed' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-4">Match Completed!</h3>
            
            {winner && winner !== 'timeout' ? (
              <div>
                <p className="text-lg text-blue-300 mb-2">
                  Winner: {truncateAddress(winner)}
                </p>
                <p className="text-amber-400 text-xl font-bold mb-6">
                  Reward: {match.entryFee * match.players.length} EMB
                </p>
              </div>
            ) : (
              <p className="text-lg text-gray-400 mb-6">
                Match ended in a {winner === 'timeout' ? 'timeout' : 'draw'}. Funds returned to players.
              </p>
            )}
            
            <button
              onClick={() => onMatchEnd(null)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded"
            >
              Back to Arcade
            </button>
          </div>
        )}
      </div>
      
      {/* Error notification */}
      {error && (
        <div className="p-4">
          <ArcadeNotification
            message={error}
            type="error"
            onClose={() => setError(null)}
            showIcon={true}
          />
        </div>
      )}
      
      {/* Success/info notification */}
      {notification && (
        <div className="p-4">
          <ArcadeNotification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
            showIcon={true}
          />
        </div>
      )}
      
      {/* Match chat */}
      <div className="mt-4 border-t border-gray-700 p-4">
        <h4 className="text-md font-medium text-white mb-2">Match Chat</h4>
        
        <div className="bg-gray-800 rounded-lg p-2 h-36 overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {chatMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No messages yet. Be the first to chat!
            </div>
          ) : (
            <div className="space-y-2">
              {chatMessages.map(msg => (
                <div key={msg.id} className="flex text-sm">
                  <span className="text-blue-400 font-medium mr-2">{msg.senderShort}:</span>
                  <span className="text-gray-300">{msg.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSendMessage} className="flex">
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-l p-2 text-white"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-r"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompetitiveMatch;
