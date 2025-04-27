'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ArcadeChess from './ArcadeChess';
import axios from 'axios';
import TradeSignals from './TradeSignals';
import Link from 'next/link';
import Image from 'next/image';
import { burnEMBTokens } from '../lib/mcpService'; // Import MCP service
import PokerGame from './PokerGame'; // Import the PokerGame component
import CompetitiveMatch from './CompetitiveMatch'; // Import the CompetitiveMatch component
import ArcadeLeaderboard from './ArcadeLeaderboard'; // Import the ArcadeLeaderboard component
import ArcadeNotification from './ArcadeNotification'; // Import the ArcadeNotification component

/**
 * Monkey patch to fix "TypeError: Cannot set property unpackAccount of #<Object> which has only a getter"
 * This is applied only once when the component mounts
 */
const monkeyPatchTokenFunctions = () => {
  try {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    // Check if the module is already loaded in window
    const SPL_TOKEN_KEY = Object.keys(window).find(key => 
      key.startsWith('__webpack_module__') && 
      window[key]?.toString().includes('unpackAccount')
    );
    
    if (SPL_TOKEN_KEY) {
      const originalModule = window[SPL_TOKEN_KEY];
      
      // If the module exists and the error might occur, apply patch
      if (originalModule && !originalModule._patched) {
        const descriptors = Object.getOwnPropertyDescriptors(originalModule);
        
        // Check if unpackAccount is a getter property
        if (descriptors.unpackAccount && descriptors.unpackAccount.get && !descriptors.unpackAccount.set) {
          // Create a safe wrapper for the getter that won't throw when trying to set
          const originalGetter = descriptors.unpackAccount.get;
          
          Object.defineProperty(originalModule, 'unpackAccount', {
            configurable: true,
            get: originalGetter,
            set: function() {} // Add empty setter to prevent error
          });
          
          originalModule._patched = true;
          console.log('Successfully applied SPL token unpackAccount patch');
        }
      }
    }
  } catch (err) {
    console.warn('Failed to apply SPL token patch:', err);
  }
};

/**
 * Arcade Component - Gaming hub for Embassy Trade AI
 * 
 * Features:
 * - Chess and Poker games with EMB token integration
 * - Competitive matches with token stakes
 * - Leaderboard and rewards system
 * - Social integration for challenging friends
 */
const Arcade = () => {
  // Core state
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState('featured');
  const [balance, setBalance] = useState(0);
  const [burnedTokens, setBurnedTokens] = useState(0);
  const [burnAmount, setBurnAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [arcadeAccess, setArcadeAccess] = useState(false);
  
  // UI feedback state
  const [notification, setNotification] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [burnSuccess, setBurnSuccess] = useState(null);
  const [burnError, setBurnError] = useState(null);
  const [showConnectWalletModal, setShowConnectWalletModal] = useState(false);
  const notificationTimeoutRef = useRef(null);
  
  // Game data state
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentBurns, setRecentBurns] = useState([]);
  const [showSignals, setShowSignals] = useState(false);
  const [userRank, setUserRank] = useState(null);
  const [dailyRewards, setDailyRewards] = useState([]);
  const [userRewards, setUserRewards] = useState([]);
  
  // Competitive matches state
  const [competitiveMatches, setCompetitiveMatches] = useState([]);
  const [showCreateMatchModal, setShowCreateMatchModal] = useState(false);
  const [matchDetails, setMatchDetails] = useState({
    gameType: 'chess',
    entryFee: 10,
    maxPlayers: 2,
    description: ''
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);

  // Leaderboard state
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState('weekly');
  
  // Current date for display
  const currentDate = new Date();
  const nextRewardDate = new Date();
  nextRewardDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()));

  // Enhanced games data with metadata
  const games = [
    {
      id: 'chess',
      name: '3D Chess',
      description: 'Play 3D Chess against AI and other players. Unlock advanced features by holding EMB tokens.',
      image: '/chess-preview.jpg',
      minTokens: 100,
      isAvailable: true,
      isPopular: true,
      comingSoon: false,
      bgGradient: 'from-blue-900 to-blue-700',
      icon: '♟️'
    },
    {
      id: 'poker',
      name: 'Texas Hold\'em',
      description: 'Play poker against AI opponents or challenge friends with EMB stakes.',
      image: '/poker-preview.jpg',
      minTokens: 150,
      isAvailable: true,
      isPopular: true,
      comingSoon: false,
      bgGradient: 'from-green-900 to-green-700',
      icon: '🃏'
    },
    {
      id: 'trading-simulator',
      name: 'Trading Simulator',
      description: 'Practice trading with simulated EMB tokens. Compete for highest returns and win real EMB.',
      image: '/trading-sim.jpg',
      minTokens: 250,
      isAvailable: true,
      isPopular: true,
      comingSoon: false,
      bgGradient: 'from-purple-900 to-purple-700',
      icon: '📈'
    },
    {
      id: 'solana-racer',
      name: 'Solana Racer',
      description: 'Race through the Solana blockchain collecting NFTs and avoiding fees.',
      image: '/solana-racer.jpg',
      minTokens: 500,
      isAvailable: false,
      isPopular: false,
      comingSoon: true,
      bgGradient: 'from-indigo-900 to-indigo-700',
      icon: '🏎️'
    },
    {
      id: 'crypto-defense',
      name: 'Crypto Defense',
      description: 'Tower defense game where you protect your crypto assets from hackers and bears.',
      image: '/crypto-defense.jpg',
      minTokens: 350,
      isAvailable: false,
      isPopular: false,
      comingSoon: true,
      bgGradient: 'from-cyan-900 to-cyan-700',
      icon: '🛡️'
    }
  ];

  // Enhanced weekly rewards schedule
  const weeklyRewards = [
    { position: 1, reward: '500 EMB', tradingSignals: 'Premium', badge: 'Whale', color: 'text-blue-400' },
    { position: 2, reward: '250 EMB', tradingSignals: 'Premium', badge: 'Shark', color: 'text-blue-300' },
    { position: 3, reward: '100 EMB', tradingSignals: 'Premium', badge: 'Dolphin', color: 'text-blue-300' },
    { position: '4-10', reward: '50 EMB', tradingSignals: 'Basic', badge: 'Fish', color: 'text-blue-200' },
    { position: '11-20', reward: '25 EMB', tradingSignals: 'Basic', badge: 'Minnow', color: 'text-blue-200' }
  ];

  // Unified notification system
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
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
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, duration);
  }, []);

  // Apply monkey patch on component mount
  useEffect(() => {
    monkeyPatchTokenFunctions();
  }, []);

  // Fetch user's EMB balance and burn statistics when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalanceAndStats();
      fetchUserRank();
      fetchRewards();
    } else {
      setBalance(0);
      setUserRank(null);
      setUserRewards([]);
    }
  }, [connected, publicKey]);

  // Fetch balance and burn statistics
  const fetchBalanceAndStats = async () => {
    try {
      // Simulate API call for now
      setBalance(Math.floor(Math.random() * 1000) + 50);
      setBurnedTokens(2547891.25);

      // Simulate leaderboard data
      const mockLeaderboard = [
        { wallet: 'GWjeBbdx4cWJvgyxRPAwbSTBoNbZ4e2Sfsv1SH5qeKU7', amount: 15420.50 },
        { wallet: 'HN7Gz168zHjUSKTcyFw2Ez6HVNm2cmAMhXnxbsF38QSS', amount: 9842.75 },
        { wallet: 'CiwS7dHiT3gC3tAFuBp2pLZ8XjvMEkWcAsH4GfKtW6yZ', amount: 6721.30 },
        { wallet: '2RPf5zjTpQQZs2LXGSknEZKYL3QQp5oVBRCrJ4BsruXB', amount: 4310.40 },
        { wallet: 'DELcMgnakiKhocZrXvgxb8GKQJxxJ2ioUyAkTUKvwpWM', amount: 2105.15 },
        { wallet: publicKey?.toString() || 'YourWalletWillShowHere', amount: 1250.75 },
        { wallet: 'GZ9nLKTmx9jtsmQQJTxBVoRZGKABCFdRAnRUvDphgJL4', amount: 950.20 },
        { wallet: '8FE27ioQh5H2e5J3yqGVxX9wgaJZ2fYXdSsVYHfWsrCH', amount: 705.10 },
        { wallet: 'AZTZLRxG3jd7pcEQzBxoUiKuT8MEUcgeu9iDJHWG8zSB', amount: 520.45 },
        { wallet: '4DTmTY4L3tQNj9V5CdJgVNNGaQmVJZ9TpFSUC2sTwUhk', amount: 320.80 }
      ];

      setLeaderboard(mockLeaderboard);

      // Simulate recent burns
      const now = Date.now();
      const mockBurns = [
        { wallet: 'CiwS7dHiT3gC3tAFuBp2pLZ8XjvMEkWcAsH4GfKtW6yZ', amount: 250, timestamp: now - 5 * 60 * 1000 },
        { wallet: 'HN7Gz168zHjUSKTcyFw2Ez6HVNm2cmAMhXnxbsF38QSS', amount: 100, timestamp: now - 15 * 60 * 1000 },
        { wallet: 'GWjeBbdx4cWJvgyxRPAwbSTBoNbZ4e2Sfsv1SH5qeKU7', amount: 500, timestamp: now - 45 * 60 * 1000 },
        { wallet: '2RPf5zjTpQQZs2LXGSknEZKYL3QQp5oVBRCrJ4BsruXB', amount: 75, timestamp: now - 2 * 3600 * 1000 },
        { wallet: publicKey?.toString() || 'YourWalletWillShowHere', amount: 25, timestamp: now - 5 * 3600 * 1000 },
        { wallet: 'DELcMgnakiKhocZrXvgxb8GKQJxxJ2ioUyAkTUKvwpWM', amount: 150, timestamp: now - 8 * 3600 * 1000 },
        { wallet: 'GZ9nLKTmx9jtsmQQJTxBVoRZGKABCFdRAnRUvDphgJL4', amount: 50, timestamp: now - 12 * 3600 * 1000 },
      ];

      setRecentBurns(mockBurns);

    } catch (error) {
      console.error('Error fetching EMB data:', error);
    }
  };

  // Fetch user rank
  const fetchUserRank = async () => {
    // In production this would be an API call
    // For now we'll simulate a rank
    if (connected) {
      setUserRank({
        position: 6,
        percentile: 92,
        burnedAmount: 1250.75,
        weeklyChange: '+320.25'
      });
    }
  };

  // Fetch rewards data
  const fetchRewards = async () => {
    // Simulate API call
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mockDailyRewards = [
      { date: today.toDateString(), rewardPool: '1,000 EMB', participants: 128, status: 'active' },
      { date: yesterday.toDateString(), rewardPool: '1,000 EMB', participants: 154, status: 'distributed', winners: ['HN7...QSS', 'GWj...KU7', 'Ciw...6yZ'] }
    ];

    const mockUserRewards = [
      { date: '2025-03-30', amount: 50, reason: 'Daily Chess Champion' },
      { date: '2025-03-25', amount: 25, reason: 'Weekly Leaderboard Top 10' },
      { date: '2025-03-20', amount: 100, reason: 'Trading Simulator High Score' }
    ];

    setDailyRewards(mockDailyRewards);
    setUserRewards(mockUserRewards);
  };

  // Handle EMB token burning
  const handleBurn = async (e) => {
    e.preventDefault();

    if (!connected) {
      setBurnError('Please connect your wallet first.');
      return;
    }

    if (!burnAmount || isNaN(burnAmount) || parseFloat(burnAmount) <= 0) {
      setBurnError('Please enter a valid amount to burn.');
      return;
    }

    const amountToBurn = parseFloat(burnAmount);
    if (amountToBurn > balance) {
      setBurnError('Insufficient EMB balance.');
      return;
    }

    setLoading(true);
    setBurnError(null);
    setBurnSuccess(null);

    try {
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setBurnSuccess(`Successfully burned ${amountToBurn} EMB tokens! 🔥`);
      setBurnAmount('');
      setBalance(prev => prev - amountToBurn);
      setBurnedTokens(prev => prev + amountToBurn);

      // Add to recent burns
      const now = Date.now();
      setRecentBurns(prev => [
        { wallet: publicKey.toString(), amount: amountToBurn, timestamp: now },
        ...prev
      ].slice(0, 10));

      // Update user rank
      if (userRank) {
        setUserRank(prev => ({
          ...prev,
          burnedAmount: prev.burnedAmount + amountToBurn,
          weeklyChange: `+${(parseFloat(prev.weeklyChange.replace('+', '')) + amountToBurn).toFixed(2)}`
        }));
      }

    } catch (error) {
      console.error('Error burning tokens:', error);
      setBurnError('Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle burning tokens from the ArcadeChess component
  const handleTokenBurn = (amount) => {
    try {
      // Update the token burn stats locally
      setBurnedTokens(prev => prev + amount);
      setBalance(prev => prev - amount);

      // Add to recent burns
      const now = Date.now();
      setRecentBurns(prev => [
        { wallet: publicKey?.toString() || 'SimulatedWallet', amount, timestamp: now },
        ...prev
      ].slice(0, 10));

      // Update user rank if available
      if (userRank) {
        setUserRank(prev => ({
          ...prev,
          burnedAmount: prev.burnedAmount + amount,
          weeklyChange: `+${(parseFloat(prev.weeklyChange.replace('+', '')) + amount).toFixed(2)}`
        }));
      }

    } catch (error) {
      console.error('Error in handleTokenBurn:', error);
    }
  };

  // Handle token burn for arcade access
  const burnTokensForArcade = async () => {
    try {
      if (!connected || !publicKey) {
        setShowConnectWalletModal(true);
        return;
      }

      setLoading(true);
      const burnAmount = 10; // Fixed amount of 10 EMB for arcade access

      // Use MCP service to automate token burn
      const tx = await burnEMBTokens(window.solana, burnAmount);

      // Update UI state based on successful burn
      setBurnSuccess('Tokens burned successfully! Arcade access granted.');
      setBurnedTokens(prev => prev + burnAmount);
      setBalance(prev => prev - burnAmount);
      setBurnError(null);
      setArcadeAccess(true);

      // Add to recent burns list
      const newBurn = {
        id: `burn_${Date.now()}`,
        amount: burnAmount,
        wallet: publicKey.toString().slice(0, 6) + '...' + publicKey.toString().slice(-4),
        timestamp: new Date().toISOString(),
        purpose: 'Arcade Access'
      };

      setRecentBurns(prev => [newBurn, ...prev].slice(0, 10));

    } catch (error) {
      console.error('Burn error:', error);
      setBurnError(`Failed to burn tokens: ${error.message}`);
      setBurnSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a competitive match
  const handleCreateMatch = async (e) => {
    e.preventDefault();

    if (!connected) {
      setJoinError('Please connect your wallet first.');
      return;
    }

    if (matchDetails.entryFee > balance) {
      setJoinError('Insufficient EMB balance to create match.');
      return;
    }

    setLoading(true);
    setJoinError(null);

    try {
      const newMatch = {
        id: `match_${Date.now()}`,
        ...matchDetails,
        creator: publicKey.toString(),
        players: [publicKey.toString()],
        createdAt: new Date().toISOString()
      };

      setCompetitiveMatches(prev => [newMatch, ...prev]);
      setShowCreateMatchModal(false);
      setBalance(prev => prev - matchDetails.entryFee);
      setActiveMatch(newMatch);

    } catch (error) {
      console.error('Error creating match:', error);
      setJoinError('Failed to create match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle joining a competitive match
  const handleJoinMatch = (matchId) => {
    if (!connected) {
      setJoinError('Please connect your wallet first.');
      return;
    }

    const matchIndex = competitiveMatches.findIndex(match => match.id === matchId);
    if (matchIndex === -1) {
      setJoinError('Match not found.');
      return;
    }

    const match = competitiveMatches[matchIndex];
    if (match.players.includes(publicKey.toString())) {
      // If player already joined, set this as active match
      setActiveMatch(match);
      return;
    }

    if (match.players.length >= match.maxPlayers) {
      setJoinError('Match is already full.');
      return;
    }

    if (match.entryFee > balance) {
      setJoinError('Insufficient EMB balance to join match.');
      return;
    }

    setLoading(true);
    setJoinError(null);

    try {
      const updatedMatch = {
        ...match,
        players: [...match.players, publicKey.toString()]
      };

      const updatedMatches = [...competitiveMatches];
      updatedMatches[matchIndex] = updatedMatch;

      setCompetitiveMatches(updatedMatches);
      setBalance(prev => prev - match.entryFee);
      setActiveMatch(updatedMatch);

    } catch (error) {
      console.error('Error joining match:', error);
      setJoinError('Failed to join match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle match end and distribute rewards
  const handleMatchEnd = (result) => {
    if (result) {
      const { matchId, winner, reward } = result;

      // Add to match history
      setMatchHistory(prev => [{
        id: matchId,
        date: new Date().toISOString(),
        winner,
        reward
      }, ...prev]);

      // Update user balance if they won
      if (winner === publicKey?.toString()) {
        setBalance(prev => prev + reward);

        // Add notification or success message
        setBurnSuccess(`You won ${reward} EMB in a competitive match!`);
      }

      // Remove the match from active matches
      setCompetitiveMatches(prev => prev.filter(match => match.id !== matchId));
    }

    setActiveMatch(null);
  };

  // Format timestamp for display
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Truncate wallet address for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  // Render game card
  const renderGameCard = (game) => {
    const hasEnoughTokens = balance >= game.minTokens;

    return (
      <div key={game.id} className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="relative h-40">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 z-10"></div>
          <div className="absolute top-2 right-2 z-20">
            {game.isPopular && (
              <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded">POPULAR</span>
            )}
            {game.comingSoon && (
              <span className="bg-purple-600 text-xs font-bold px-2 py-1 rounded">COMING SOON</span>
            )}
          </div>

          {/* Image placeholder - replace with actual images in production */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900"></div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg text-white">{game.name}</h3>
            <span className="text-xs bg-gray-700 rounded px-2 py-1">
              {game.minTokens} EMB
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {game.description}
          </p>

          {game.comingSoon ? (
            <button disabled className="w-full bg-gray-700 text-gray-400 py-2 rounded cursor-not-allowed">
              Coming Soon
            </button>
          ) : hasEnoughTokens ? (
            <Link href={`/arcade/${game.id}`}>
              <span className="w-full block text-center bg-blue-600 hover:bg-blue-500 text-white py-2 rounded cursor-pointer">
                Play Now
              </span>
            </Link>
          ) : (
            <div className="space-y-2">
              <div className="text-amber-500 text-xs">
                Need {game.minTokens - balance} more EMB to play
              </div>
              <Link href="/trade?tab=swap">
                <span className="w-full block text-center bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-2 rounded cursor-pointer">
                  Get EMB Tokens
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="container mx-auto py-8 px-4">
        {/* Hero Banner */}
        <div className="mb-8 relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900"></div>
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center z-10">
            <div className="md:w-3/5 mb-6 md:mb-0 md:pr-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Welcome to Embassy Arcade
              </h1>
              <p className="text-lg text-blue-200 mb-6">
                Play games, earn rewards, and climb the leaderboards with EMB tokens!
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/trade?tab=swap">
                  <span className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium cursor-pointer">
                    Get EMB Tokens
                  </span>
                </Link>
                <a 
                  href="https://pump.fun" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium flex items-center"
                >
                  <span>Buy on Pumpfun</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="md:w-2/5">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <h3 className="font-medium text-lg text-white mb-4">Your EMB Stats</h3>

                {connected ? (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Balance</span>
                      <span className="text-white font-medium">{balance.toFixed(2)} EMB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Leaderboard Position</span>
                      <span className="text-white font-medium">#{userRank?.position || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Rewards Earned</span>
                      <span className="text-white font-medium">
                        {userRewards.reduce((sum, reward) => sum + reward.amount, 0)} EMB
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    Connect your wallet to see your EMB stats
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left column - Games and activities */}
          <div className="md:w-2/3 pr-0 md:pr-4">
            {/* Game navigation */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Games & Activities</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSignals(!showSignals)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <span className="mr-1">{showSignals ? 'Hide' : 'Show'}</span> 
                    Trade Signals
                  </button>
                </div>
              </div>

              {/* Game tabs */}
              <div className="flex overflow-x-auto pb-2 border-b border-gray-700 mb-4">
                <button 
                  className={`px-4 py-2 whitespace-nowrap ${activeTab === 'featured' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('featured')}
                >
                  Featured Games
                </button>
                <button 
                  className={`px-4 py-2 whitespace-nowrap ${activeTab === 'chess' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('chess')}
                >
                  3D Chess
                </button>
                <button 
                  className={`px-4 py-2 whitespace-nowrap ${activeTab === 'poker' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('poker')}
                >
                  Texas Hold'em
                </button>
                <button 
                  className={`px-4 py-2 whitespace-nowrap ${activeTab === 'rewards' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('rewards')}
                >
                  Rewards Center
                </button>
                <button 
                  className={`px-4 py-2 whitespace-nowrap ${activeTab === 'burn' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('burn')}
                >
                  Burn EMB
                </button>
              </div>

              {/* Tab content */}
              <div className="min-h-[600px]">
                {activeTab === 'featured' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-lg text-white">Featured Games</h3>
                      <button
                        onClick={() => setShowCreateMatchModal(true)}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2 rounded text-sm flex items-center"
                      >
                        <span className="mr-2">+</span>Create Match
                      </button>
                    </div>
                    
                    {competitiveMatches.length > 0 && (
                      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                        <h4 className="font-medium text-white mb-3">Active Competitive Matches</h4>
                        <div className="space-y-3">
                          {competitiveMatches.map((match, index) => (
                            <div key={index} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-blue-300 font-medium">{match.gameType === 'chess' ? '♟️ Chess Match' : '🃏 Poker Game'}</div>
                                  <div className="text-sm text-gray-400">Created by {truncateAddress(match.creator)}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-amber-400 font-medium">{match.entryFee} EMB</div>
                                  <div className="text-xs text-gray-400">{match.players.length}/{match.maxPlayers} players</div>
                                </div>
                              </div>
                              <p className="text-gray-300 text-sm my-2">{match.description}</p>
                              <div className="flex justify-between items-center mt-3">
                                <div className="flex items-center space-x-1">
                                  {match.players.map((player, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center text-xs text-blue-300" title={player}>
                                      {player.substring(0, 2)}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleJoinMatch(match.id)}
                                  disabled={!connected || match.players.includes(publicKey?.toString()) || match.players.length >= match.maxPlayers}
                                  className={`px-4 py-1 rounded ${
                                    !connected || match.players.includes(publicKey?.toString()) || match.players.length >= match.maxPlayers
                                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                                  }`}
                                >
                                  {match.players.includes(publicKey?.toString()) 
                                    ? 'Joined' 
                                    : match.players.length >= match.maxPlayers
                                      ? 'Full'
                                      : 'Join Match'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {games.map(renderGameCard)}
                    </div>
                  </div>
                )}

                {activeTab === 'chess' && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    {!arcadeAccess ? (
                      <div className="my-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                        <h2 className="text-xl font-semibold text-white mb-4">Arcade Access Required</h2>
                        <p className="text-gray-300 mb-6">
                          Burn 10 $EMB tokens to access premium arcade games including Chess and Texas Hold'em Poker.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            Your balance: <span className="text-blue-400 font-medium">{balance} EMB</span>
                          </div>
                          <button 
                            onClick={burnTokensForArcade} 
                            disabled={loading || balance < 10}
                            className={`px-6 py-3 rounded-lg font-medium ${
                              balance < 10 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {loading ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              `Burn 10 EMB for Access`
                            )}
                          </button>
                        </div>
                        
                        {burnError && (
                          <ArcadeNotification
                            message={burnError}
                            type="error"
                            onClose={() => setBurnError(null)}
                            showIcon={true}
                          />
                        )}
                        
                        {burnSuccess && (
                          <ArcadeNotification
                            message={burnSuccess}
                            type="success"
                            onClose={() => setBurnSuccess(null)}
                            showIcon={true}
                          />
                        )}
                      </div>
                    ) : (
                      <ArcadeChess 
                        embBalance={balance} 
                        onTokenBurn={handleTokenBurn} 
                        isSimulationMode={!connected} 
                      />
                    )}
                  </div>
                )}

                {activeTab === 'poker' && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    {!arcadeAccess ? (
                      <div className="my-8 p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                        <h2 className="text-xl font-semibold text-white mb-4">Arcade Access Required</h2>
                        <p className="text-gray-300 mb-6">
                          Burn 10 $EMB tokens to access premium arcade games including Chess and Texas Hold'em Poker.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-400">
                            Your balance: <span className="text-blue-400 font-medium">{balance} EMB</span>
                          </div>
                          <button 
                            onClick={burnTokensForArcade} 
                            disabled={loading || balance < 10}
                            className={`px-6 py-3 rounded-lg font-medium ${
                              balance < 10 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {loading ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              `Burn 10 EMB for Access`
                            )}
                          </button>
                        </div>
                        
                        {burnError && (
                          <ArcadeNotification
                            message={burnError}
                            type="error"
                            onClose={() => setBurnError(null)}
                            showIcon={true}
                          />
                        )}
                        
                        {burnSuccess && (
                          <ArcadeNotification
                            message={burnSuccess}
                            type="success"
                            onClose={() => setBurnSuccess(null)}
                            showIcon={true}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 p-6 rounded-xl border border-green-900/30 mb-6">
                          <h2 className="text-xl font-semibold text-[#00FFA3] mb-2">Texas Hold'em Poker</h2>
                          <p className="text-gray-300 text-sm">
                            Play Texas Hold'em Poker against AI opponents. Test your poker skills and win chips!
                          </p>
                        </div>
                        <PokerGame />
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'rewards' && (
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-1/2">
                        <h3 className="text-xl font-bold text-white mb-4">Rewards Center</h3>

                        <div className="bg-gray-800 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-white mb-3">Weekly Leaderboard Rewards</h4>
                          <p className="text-gray-400 text-sm mb-4">
                            Top players on the leaderboard receive EMB rewards and trading signal access.
                            Next distribution: {formatDate(nextRewardDate)}
                          </p>

                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="text-left text-xs text-gray-400">
                                  <th className="py-2 px-2">Position</th>
                                  <th className="py-2 px-2">Reward</th>
                                  <th className="py-2 px-2">Signals</th>
                                  <th className="py-2 px-2">Badge</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                {weeklyRewards.map((tier, index) => (
                                  <tr key={index} className="border-t border-gray-700">
                                    <td className="py-2 px-2 text-white">{tier.position}</td>
                                    <td className="py-2 px-2 text-blue-400">{tier.reward}</td>
                                    <td className="py-2 px-2 text-gray-300">{tier.tradingSignals}</td>
                                    <td className="py-2 px-2 text-amber-500">{tier.badge}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium text-white mb-3">Daily Challenges</h4>

                          <div className="space-y-3">
                            {dailyRewards.map((challenge, index) => (
                              <div key={index} className="bg-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-white">{challenge.date}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    challenge.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                                  }`}>
                                    {challenge.status === 'active' ? 'Active' : 'Completed'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Reward Pool:</span>
                                  <span className="text-blue-400">{challenge.rewardPool}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-400">Participants:</span>
                                  <span className="text-white">{challenge.participants}</span>
                                </div>
                                {challenge.winners && (
                                  <div className="mt-2 pt-2 border-t border-gray-600">
                                    <div className="text-xs text-gray-400 mb-1">Winners:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {challenge.winners.map((winner, i) => (
                                        <span key={i} className="bg-gray-800 rounded px-2 py-1 text-xs text-gray-300">
                                          {winner}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-1/2">
                        <div className="bg-gray-800 rounded-lg p-4 mb-6">
                          <h4 className="font-medium text-white mb-3">Your Rewards</h4>

                          {connected ? (
                            userRewards.length > 0 ? (
                              <div className="space-y-3">
                                {userRewards.map((reward, index) => (
                                  <div key={index} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                    <div>
                                      <div className="text-sm text-gray-300">{formatDate(reward.date)}</div>
                                      <div className="text-white">{reward.reason}</div>
                                    </div>
                                    <div className="text-blue-400 font-medium">+{reward.amount} EMB</div>
                                  </div>
                                ))}

                                <div className="pt-3 mt-3 border-t border-gray-700 flex justify-between">
                                  <span className="text-gray-400">Total Rewards</span>
                                  <span className="text-blue-400 font-medium">
                                    {userRewards.reduce((sum, reward) => sum + reward.amount, 0)} EMB
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-400">
                                You haven't earned any rewards yet.
                                <div className="mt-2">
                                  <Link href="/trade?tab=swap">
                                    <span className="text-blue-400 hover:underline">Get EMB tokens</span>
                                  </Link>
                                  {' '}to start earning!
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              Connect your wallet to see your rewards
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="font-medium text-white mb-3">Your Progress</h4>

                          {connected && userRank ? (
                            <>
                              <div className="mb-4">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">Current Position</span>
                                  <span className="font-medium text-white">#{userRank.position}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                  <div 
                                    className="bg-blue-600 h-2.5 rounded-full" 
                                    style={{ width: `${userRank.percentile}%` }}
                                  ></div>
                                </div>
                                <div className="text-right text-xs text-gray-400 mt-1">
                                  Top {100 - userRank.percentile}%
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">EMB Burned (Total)</span>
                                  <span className="text-white">{userRank.burnedAmount.toFixed(2)} EMB</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Weekly Change</span>
                                  <span className="text-green-400">{userRank.weeklyChange} EMB</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Next Tier</span>
                                  <span className="text-blue-400">250 EMB more needed</span>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-gray-700">
                                <Link href="/trade?tab=swap">
                                  <span className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white py-2 rounded cursor-pointer">
                                    Get More EMB
                                  </span>
                                </Link>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              Connect your wallet to see your progress
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'burn' && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-white">
                      <h3 className="text-xl font-bold mb-4">Burn EMB Tokens</h3>

                      <div className="mb-6 p-4 bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-lg">
                        <div className="flex items-center mb-2">
                          <div className="text-2xl mr-2">🔥</div>
                          <h4 className="text-lg font-semibold">Why burn tokens?</h4>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Burning EMB tokens reduces the total supply, potentially increasing the value of remaining tokens.
                          Additionally, burning tokens helps you climb the leaderboard and earn special badges and rewards!
                        </p>
                      </div>

                      {burnSuccess && (
                        <ArcadeNotification
                          message={burnSuccess}
                          type="success"
                          onClose={() => setBurnSuccess(null)}
                          showIcon={true}
                        />
                      )}

                      {burnError && (
                        <ArcadeNotification
                          message={burnError}
                          type="error"
                          onClose={() => setBurnError(null)}
                          showIcon={true}
                        />
                      )}

                      <div className="bg-gray-800 rounded-lg p-4 mb-6">
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span>Your EMB Balance</span>
                            <span>{connected ? balance.toFixed(4) : '0'} EMB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total EMB Burned</span>
                            <span>{burnedTokens.toFixed(2)} EMB</span>
                          </div>
                        </div>

                        {connected ? (
                          <form onSubmit={handleBurn} className="space-y-4">
                            <div>
                              <label htmlFor="burnAmount" className="block text-sm mb-1">Amount to Burn</label>
                              <div className="flex">
                                <input
                                  type="number"
                                  id="burnAmount"
                                  className="bg-gray-700 rounded-l p-2 w-full text-white"
                                  placeholder="Enter amount"
                                  value={burnAmount}
                                  onChange={(e) => setBurnAmount(e.target.value)}
                                  min="0"
                                  step="0.1"
                                  max={balance}
                                />
                                <button
                                  type="button"
                                  className="bg-blue-700 px-3 rounded-r"
                                  onClick={() => setBurnAmount(balance.toString())}
                                >
                                  MAX
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 py-3 rounded font-medium flex items-center justify-center"
                              disabled={loading || !connected || !burnAmount || parseFloat(burnAmount) <= 0}
                            >
                              {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                              ) : (
                                <>
                                  <span className="mr-2">🔥</span>
                                  Burn EMB Tokens
                                </>
                              )}
                            </button>
                          </form>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-400 mb-3">Connect your wallet to burn EMB tokens</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trade signals section (conditionally shown) */}
            {showSignals && (
              <div className="mb-6">
                <TradeSignals />
              </div>
            )}
          </div>

          {/* Right column - Stats and leaderboard */}
          <div className="md:w-1/3">
            {/* Arcade Leaderboard */}
            <ArcadeLeaderboard 
              initialData={globalLeaderboard}
              timeframe={leaderboardFilter}
              showFilters={true}
              maxEntries={5}
              highlightUser={true}
              onViewMore={() => setShowLeaderboardModal(true)}
              className="mb-6"
            />

            {/* Recent burns */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Recent Burns</h3>

              {recentBurns.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentBurns.map((burn, index) => (
                    <div key={index} className={`rounded p-3 ${
                      burn.wallet === publicKey?.toString() ? 'bg-blue-900/30 border border-blue-700' : 'bg-gray-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{truncateAddress(burn.wallet)}</span>
                        <span className="text-xs text-gray-400">{formatTimeAgo(burn.timestamp)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="text-orange-500 mr-1">🔥</span>
                          <span>Burned</span>
                        </span>
                        <span className="text-orange-400 font-medium">{burn.amount.toFixed(2)} EMB</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No recent burns recorded.
                </div>
              )}
            </div>

            {/* Token statistics */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-xl font-bold text-white mb-4">EMB Token Info</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Supply</span>
                  <span className="text-white">1,000,000,000 EMB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Burned</span>
                  <span className="text-orange-400">{burnedTokens.toFixed(2)} EMB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Circulating Supply</span>
                  <span className="text-white">{(1_000_000_000 - burnedTokens).toFixed(2)} EMB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Next Reward Distribution</span>
                  <span className="text-green-400">{formatDate(nextRewardDate)}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <a 
                  href="https://pump.fun" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block w-full text-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-2 rounded"
                >
                  View on Pumpfun
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Match Modal */}
      {showCreateMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Create Competitive Match</h3>
              <button 
                onClick={() => setShowCreateMatchModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Game Type</label>
                <select 
                  value={matchDetails.gameType} 
                  onChange={(e) => setMatchDetails({...matchDetails, gameType: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                >
                  <option value="chess">Chess</option>
                  <option value="poker">Poker</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Entry Fee (EMB)</label>
                <input 
                  type="number" 
                  value={matchDetails.entryFee}
                  onChange={(e) => setMatchDetails({...matchDetails, entryFee: Math.max(1, parseInt(e.target.value) || 0)})}
                  min="1"
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Maximum Players</label>
                <input 
                  type="number" 
                  value={matchDetails.maxPlayers}
                  onChange={(e) => setMatchDetails({...matchDetails, maxPlayers: Math.max(2, parseInt(e.target.value) || 0)})}
                  min="2"
                  max={matchDetails.gameType === 'chess' ? 2 : 8}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {matchDetails.gameType === 'chess' ? 'Chess matches are limited to 2 players.' : 'Poker games can have up to 8 players.'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea 
                  value={matchDetails.description}
                  onChange={(e) => setMatchDetails({...matchDetails, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  rows="2"
                  placeholder="Add details about your match..."
                ></textarea>
              </div>
              
              {joinError && (
                <ArcadeNotification
                  message={joinError}
                  type="error"
                  onClose={() => setJoinError(null)}
                  showIcon={true}
                />
              )}
              
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-400">
                  Total pot: <span className="text-blue-400">{matchDetails.entryFee * matchDetails.maxPlayers} EMB</span>
                </div>
                <button 
                  type="submit"
                  disabled={loading || !connected || matchDetails.entryFee > balance}
                  className={`px-5 py-2 rounded ${
                    loading || !connected || matchDetails.entryFee > balance
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {loading ? 'Creating...' : 'Create Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Match */}
      {activeMatch && (
        <CompetitiveMatch 
          match={activeMatch} 
          onMatchEnd={handleMatchEnd} 
          publicKey={publicKey?.toString()} 
        />
      )}
    </div>
  );
};

export default Arcade;
