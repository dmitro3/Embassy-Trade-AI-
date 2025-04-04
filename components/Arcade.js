'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ArcadeChess from './ArcadeChess';
import axios from 'axios';
import TradeSignals from './TradeSignals';

const Arcade = () => {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState('chess');
  const [balance, setBalance] = useState(0);
  const [burnedTokens, setBurnedTokens] = useState(0);
  const [burnAmount, setBurnAmount] = useState('');
  const [burnSuccess, setBurnSuccess] = useState(null);
  const [burnError, setBurnError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentBurns, setRecentBurns] = useState([]);
  const [showSignals, setShowSignals] = useState(false);

  // Fetch user's EMBAI balance and burn statistics when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalanceAndStats();
    } else {
      setBalance(0);
    }
  }, [connected, publicKey]);

  // Fetch balance and burn statistics
  const fetchBalanceAndStats = async () => {
    try {
      // Fetch EMBAI balance
      const balanceResponse = await axios.get(`/api/embai/balance?wallet=${publicKey.toString()}`);
      if (balanceResponse.data.success) {
        setBalance(balanceResponse.data.balance);
      }

      // Fetch burn statistics
      const statsResponse = await axios.get('/api/embai/burn-stats');
      if (statsResponse.data.success) {
        setBurnedTokens(statsResponse.data.totalBurned || 0);
        setLeaderboard(statsResponse.data.topBurners || []);
        setRecentBurns(statsResponse.data.recentBurns || []);
      }
    } catch (error) {
      console.error('Error fetching EMBAI data:', error);
    }
  };

  // Handle EMBAI token burning
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
      setBurnError('Insufficient EMBAI balance.');
      return;
    }
    
    setLoading(true);
    setBurnError(null);
    setBurnSuccess(null);
    
    try {
      const response = await axios.post('/api/embai/burn', {
        wallet: publicKey.toString(),
        amount: amountToBurn
      });
      
      if (response.data.success) {
        setBurnSuccess(`Successfully burned ${amountToBurn} EMBAI tokens! 🔥`);
        setBurnAmount('');
        fetchBalanceAndStats(); // Refresh data
      } else {
        setBurnError(response.data.error || 'Failed to burn tokens.');
      }
    } catch (error) {
      console.error('Error burning tokens:', error);
      setBurnError(error.response?.data?.error || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle burning tokens from the ArcadeChess component
  const handleTokenBurn = (amount) => {
    try {
      // Update the token burn stats locally first
      setBurnedTokens(prev => prev + amount);
      setBalance(prev => prev - amount);
      
      // Then perform the API call to actually burn the tokens
      if (publicKey) {
        axios.post('/api/embai/burn', {
          wallet: publicKey.toString(),
          amount: amount,
          source: 'chess_game'
        })
        .then(response => {
          if (!response.data.success) {
            console.error('API burn failed:', response.data.error);
            // Revert the optimistic update if API call fails
            setBurnedTokens(prev => prev - amount);
            setBalance(prev => prev + amount);
          }
        })
        .catch(error => {
          console.error('Error burning tokens:', error);
          // Revert the optimistic update if API call fails
          setBurnedTokens(prev => prev - amount);
          setBalance(prev => prev + amount);
        });
      }
    } catch (error) {
      console.error('Error in handleTokenBurn:', error);
    }
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

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row">
          {/* Left column - Games and activities */}
          <div className="md:w-2/3 pr-0 md:pr-4">
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Embassy Arcade</h2>
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
              <div className="flex border-b border-gray-700 mb-4">
                <button 
                  className={`px-4 py-2 ${activeTab === 'chess' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('chess')}
                >
                  Chess
                </button>
                <button 
                  className={`px-4 py-2 ${activeTab === 'coming-soon' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('coming-soon')}
                >
                  Coming Soon
                </button>
                <button 
                  className={`px-4 py-2 ${activeTab === 'burn' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}
                  onClick={() => setActiveTab('burn')}
                >
                  Burn EMBAI
                </button>
              </div>
              
              {/* Tab content */}
              <div className="min-h-[600px]">
                {activeTab === 'chess' && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <ArcadeChess 
                      embBalance={balance} 
                      onTokenBurn={handleTokenBurn} 
                      isSimulationMode={!connected} 
                    />
                  </div>
                )}
                
                {activeTab === 'coming-soon' && (
                  <div className="flex flex-col items-center justify-center h-96 bg-gray-900 rounded-lg p-4">
                    <div className="text-5xl mb-4">🎮</div>
                    <h3 className="text-2xl font-bold text-white mb-2">More Games Coming Soon!</h3>
                    <p className="text-gray-400 text-center">
                      We're developing more exciting games where you can earn rewards and compete with other traders.
                      Stay tuned!
                    </p>
                  </div>
                )}
                
                {activeTab === 'burn' && (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-white">
                      <h3 className="text-xl font-bold mb-4">Burn $EMBAI Tokens</h3>
                      
                      <div className="mb-6 p-4 bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-lg">
                        <div className="flex items-center mb-2">
                          <div className="text-2xl mr-2">🔥</div>
                          <h4 className="text-lg font-semibold">Why burn tokens?</h4>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Burning EMBAI tokens reduces the total supply, potentially increasing the value of remaining tokens.
                          Additionally, burning tokens helps you climb the leaderboard and earn special badges and rewards!
                        </p>
                      </div>
                      
                      {burnSuccess && (
                        <div className="mb-4 p-3 bg-green-900/50 text-green-200 rounded flex items-center">
                          <span className="text-xl mr-2">🔥</span>
                          {burnSuccess}
                        </div>
                      )}
                      
                      {burnError && (
                        <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded">
                          {burnError}
                        </div>
                      )}
                      
                      <div className="bg-gray-800 rounded-lg p-4 mb-6">
                        <div className="mb-4">
                          <div className="flex justify-between mb-1">
                            <span>Your EMBAI Balance</span>
                            <span>{connected ? balance.toFixed(4) : '0'} EMBAI</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total EMBAI Burned</span>
                            <span>{burnedTokens.toFixed(2)} EMBAI</span>
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
                                  Burn EMBAI Tokens
                                </>
                              )}
                            </button>
                          </form>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-400 mb-3">Connect your wallet to burn EMBAI tokens</p>
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
            {/* Burn statistics */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Top Token Burners</h3>
              
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((burner, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 rounded p-3">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-300' :
                          index === 2 ? 'bg-amber-700' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-white">{truncateAddress(burner.wallet)}</span>
                      </div>
                      <span className="text-orange-400 font-medium">{burner.amount.toFixed(2)} EMBAI</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No burns recorded yet. Be the first!
                </div>
              )}
            </div>
            
            {/* Recent burns */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-xl font-bold text-white mb-4">Recent Burns</h3>
              
              {recentBurns.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentBurns.map((burn, index) => (
                    <div key={index} className="bg-gray-700 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{truncateAddress(burn.wallet)}</span>
                        <span className="text-xs text-gray-400">{formatTimeAgo(burn.timestamp)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="text-orange-500 mr-1">🔥</span>
                          <span>Burned</span>
                        </span>
                        <span className="text-orange-400 font-medium">{burn.amount.toFixed(2)} EMBAI</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  No recent burns recorded.
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Supply</span>
                  <span className="text-white">1,000,000,000 EMBAI</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Total Burned</span>
                  <span className="text-orange-400">{burnedTokens.toFixed(2)} EMBAI</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Circulating Supply</span>
                  <span className="text-white">{(1_000_000_000 - burnedTokens).toFixed(2)} EMBAI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Arcade;