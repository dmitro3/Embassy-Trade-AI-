'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';

const StakingOptions = [
  { days: 30, label: '30 Days', apr: 5 },
  { days: 90, label: '90 Days', apr: 6 },
  { days: 180, label: '180 Days', apr: 7 },
  { days: 365, label: '365 Days', apr: 8 }
];

const Staking = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [stakingPeriod, setStakingPeriod] = useState(StakingOptions[0]);
  const [stakedTokens, setStakedTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [stakedTotal, setStakedTotal] = useState(0);
  const [rewardsTotal, setRewardsTotal] = useState(0);

  // Fetch user balance and staked tokens on load or wallet change
  useEffect(() => {
    if (!connected || !publicKey) return;

    const fetchBalanceAndStakes = async () => {
      setLoading(true);
      try {
        // Fetch EMBAI balance
        const balanceResponse = await axios.get(`/api/embai/balance?wallet=${publicKey.toString()}`);
        if (balanceResponse.data.success) {
          setBalance(balanceResponse.data.balance);
        }

        // Fetch staking information
        const stakingResponse = await axios.get(`/api/embai/staking?wallet=${publicKey.toString()}`);
        if (stakingResponse.data.success) {
          setStakedTokens(stakingResponse.data.stakes || []);
          setStakedTotal(stakingResponse.data.totalStaked || 0);
          setRewardsTotal(stakingResponse.data.totalRewards || 0);
        }
      } catch (err) {
        console.error("Failed to fetch balance or staking info", err);
        setError("Failed to load your balance and staking information.");
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceAndStakes();
  }, [connected, publicKey]);

  // Calculate estimated rewards
  const calculateEstimatedRewards = () => {
    if (!amount || isNaN(amount) || amount <= 0) return "0";
    const principal = parseFloat(amount);
    const apr = stakingPeriod.apr / 100;
    const days = stakingPeriod.days;
    const rewards = principal * (apr * days / 365);
    return rewards.toFixed(4);
  };

  // Handle staking submission
  const handleStake = async (e) => {
    e.preventDefault();
    
    if (!connected) {
      setError("Please connect your wallet first.");
      return;
    }
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount to stake.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.post('/api/embai/stake', {
        wallet: publicKey.toString(),
        amount: parseFloat(amount),
        days: stakingPeriod.days
      });
      
      if (response.data.success) {
        setSuccess(`Successfully staked ${amount} EMBAI tokens for ${stakingPeriod.label}.`);
        setAmount(''); // Reset the form
        
        // Refresh staking data
        const stakingResponse = await axios.get(`/api/embai/staking?wallet=${publicKey.toString()}`);
        if (stakingResponse.data.success) {
          setStakedTokens(stakingResponse.data.stakes || []);
          setStakedTotal(stakingResponse.data.totalStaked || 0);
          setRewardsTotal(stakingResponse.data.totalRewards || 0);
        }
        
        // Refresh balance
        const balanceResponse = await axios.get(`/api/embai/balance?wallet=${publicKey.toString()}`);
        if (balanceResponse.data.success) {
          setBalance(balanceResponse.data.balance);
        }
      } else {
        setError(response.data.error || "Failed to stake tokens.");
      }
    } catch (err) {
      console.error("Error staking tokens", err);
      setError(err.response?.data?.error || "Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle unstaking
  const handleUnstake = async (stakingId) => {
    if (!connected) {
      setError("Please connect your wallet first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.post('/api/embai/unstake', {
        wallet: publicKey.toString(),
        stakingId
      });
      
      if (response.data.success) {
        setSuccess(`Successfully unstaked ${response.data.unstakedAmount} EMBAI tokens with ${response.data.rewards} EMBAI in rewards.`);
        
        // Refresh staking data
        const stakingResponse = await axios.get(`/api/embai/staking?wallet=${publicKey.toString()}`);
        if (stakingResponse.data.success) {
          setStakedTokens(stakingResponse.data.stakes || []);
          setStakedTotal(stakingResponse.data.totalStaked || 0);
          setRewardsTotal(stakingResponse.data.totalRewards || 0);
        }
        
        // Refresh balance
        const balanceResponse = await axios.get(`/api/embai/balance?wallet=${publicKey.toString()}`);
        if (balanceResponse.data.success) {
          setBalance(balanceResponse.data.balance);
        }
      } else {
        setError(response.data.error || "Failed to unstake tokens.");
      }
    } catch (err) {
      console.error("Error unstaking tokens", err);
      setError(err.response?.data?.error || "Transaction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format date to readable format
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days remaining for a stake
  const calculateDaysRemaining = (unlockTime) => {
    const now = Date.now();
    const diff = unlockTime - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">EMBAI Staking</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staking Form */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Stake Your EMBAI</h3>
          
          {!connected ? (
            <div className="text-center py-6">
              <p className="text-gray-400 mb-3">Connect your wallet to start staking EMBAI tokens</p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
                onClick={() => {/* Wallet connect handled by wallet adapter */}}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <form onSubmit={handleStake}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Available: {balance.toFixed(4)} EMBAI</label>
                <div className="flex">
                  <input
                    type="number"
                    className="bg-gray-700 rounded-l p-2 w-full text-white"
                    placeholder="Amount to stake"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.1"
                    max={balance}
                  />
                  <button
                    type="button"
                    className="bg-blue-700 px-3 rounded-r"
                    onClick={() => setAmount(balance.toString())}
                  >
                    MAX
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Staking Period</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {StakingOptions.map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      className={`p-2 rounded text-center transition-colors ${
                        stakingPeriod.days === option.days 
                          ? 'bg-blue-600' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => setStakingPeriod(option)}
                    >
                      <div>{option.label}</div>
                      <div className="text-sm text-blue-300">{option.apr}% APR</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <div className="flex justify-between">
                  <span>Estimated Rewards:</span>
                  <span className="text-green-400">{calculateEstimatedRewards()} EMBAI</span>
                </div>
                <div className="flex justify-between">
                  <span>Unlock Date:</span>
                  <span>
                    {amount && parseFloat(amount) > 0 
                      ? formatDate(Date.now() + (stakingPeriod.days * 24 * 60 * 60 * 1000)) 
                      : '-'}
                  </span>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-900/50 text-green-200 rounded">
                  {success}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded font-medium"
                disabled={loading || !connected || !amount || parseFloat(amount) <= 0}
              >
                {loading ? 'Processing...' : 'Stake EMBAI'}
              </button>
            </form>
          )}
        </div>
        
        {/* Staking Information */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Your Staked EMBAI</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-700 p-3 rounded text-center">
              <div className="text-gray-400 text-sm">Total Staked</div>
              <div className="text-xl font-bold">{stakedTotal.toFixed(4)} EMBAI</div>
            </div>
            <div className="bg-gray-700 p-3 rounded text-center">
              <div className="text-gray-400 text-sm">Total Rewards</div>
              <div className="text-xl font-bold text-green-400">{rewardsTotal.toFixed(4)} EMBAI</div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-lg font-medium mb-2">Active Stakes</h4>
            
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : stakedTokens.length === 0 ? (
              <div className="text-center p-6 text-gray-400">
                No staked tokens found. Start staking to earn rewards!
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stakedTokens.map((stake) => (
                  <div key={stake.id} className="bg-gray-700 p-3 rounded">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">Amount:</span>
                      <span>{stake.amount.toFixed(4)} EMBAI</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">Rewards:</span>
                      <span className="text-green-400">{stake.accruedReward.toFixed(4)} EMBAI</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">Unlock Date:</span>
                      <span>{formatDate(stake.unlockTime)}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span className="text-gray-300">Status:</span>
                      <span className={stake.canUnstake ? "text-green-400" : "text-yellow-400"}>
                        {stake.canUnstake 
                          ? "Unlocked" 
                          : `Locked (${calculateDaysRemaining(stake.unlockTime)} days remaining)`}
                      </span>
                    </div>
                    
                    {stake.canUnstake && (
                      <button
                        onClick={() => handleUnstake(stake.id)}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-2 rounded font-medium hover:opacity-90"
                      >
                        Unstake & Claim Rewards
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-gradient-to-r from-blue-900 to-purple-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Benefits of Staking EMBAI</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Earn up to 8% APR on your EMBAI tokens</li>
          <li>Gain enhanced voting power in Embassy DAO governance</li>
          <li>Access premium trading features and AI analytics</li>
          <li>Reduced trading fees on the Embassy Trade platform</li>
        </ul>
      </div>
    </div>
  );
};

export default Staking;