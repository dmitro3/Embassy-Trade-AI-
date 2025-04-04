'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { EMB_TOKEN_CONFIG } from './embToken';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as token from '@solana/spl-token';

export function useChessRewards() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the hook
  useEffect(() => {
    setIsInitialized(!!publicKey && !!signTransaction);
  }, [publicKey, signTransaction]);

  // Calculate reward based on difficulty
  const calculateReward = (difficulty, isWin = true) => {
    // Base rewards in EMB tokens (these are small amounts for demonstration)
    const baseRewards = {
      easy: 0.01,
      medium: 0.05,
      hard: 0.1
    };
    
    // Base XP rewards
    const baseXP = {
      easy: 10,
      medium: 25,
      hard: 50
    };
    
    // Adjust rewards for draws (50% of win reward)
    const multiplier = isWin ? 1 : 0.5;
    
    return {
      tokenAmount: baseRewards[difficulty] * multiplier,
      xpAmount: Math.floor(baseXP[difficulty] * multiplier)
    };
  };
  
  // Reward player for winning a chess game
  const rewardForWin = async (difficulty) => {
    if (!isInitialized) {
      console.log('Chess rewards not initialized. User not connected.');
      return { success: false, reason: 'Wallet not connected' };
    }
    
    try {
      const { tokenAmount, xpAmount } = calculateReward(difficulty, true);
      
      // Log for demonstration purposes
      console.log(`Rewarding ${tokenAmount} EMB tokens and ${xpAmount} XP for winning on ${difficulty}`);
      
      // In a production environment, this would call the backend to process the reward
      // Here we'll simulate a successful reward for demonstration
      
      // Make a call to your backend service to record the reward
      await fetch('/api/chess-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          rewardAmount: tokenAmount,
          xpAmount,
          reason: `Chess win on ${difficulty}`,
          difficulty
        }),
      });
      
      return {
        success: true,
        rewardAmount: tokenAmount,
        xpAmount,
        reason: `Chess win on ${difficulty}`
      };
    } catch (error) {
      console.error('Error rewarding for chess win:', error);
      return { success: false, reason: error.message };
    }
  };
  
  // Reward player for a draw
  const rewardForDraw = async (difficulty) => {
    if (!isInitialized) {
      console.log('Chess rewards not initialized. User not connected.');
      return { success: false, reason: 'Wallet not connected' };
    }
    
    try {
      const { tokenAmount, xpAmount } = calculateReward(difficulty, false);
      
      // Log for demonstration purposes
      console.log(`Rewarding ${tokenAmount} EMB tokens and ${xpAmount} XP for draw on ${difficulty}`);
      
      // Make a call to your backend service to record the reward
      await fetch('/api/chess-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          rewardAmount: tokenAmount,
          xpAmount,
          reason: `Chess draw on ${difficulty}`,
          difficulty
        }),
      });
      
      return {
        success: true,
        rewardAmount: tokenAmount,
        xpAmount,
        reason: `Chess draw on ${difficulty}`
      };
    } catch (error) {
      console.error('Error rewarding for chess draw:', error);
      return { success: false, reason: error.message };
    }
  };
  
  // Reward for special chess moves (en passant, castling, etc.)
  const rewardForSpecialMove = async (moveType) => {
    if (!isInitialized) {
      console.log('Chess rewards not initialized. User not connected.');
      return { success: false, reason: 'Wallet not connected' };
    }
    
    try {
      // Special move rewards are smaller
      const specialMoveRewards = {
        en_passant: 0.01,
        castle: 0.005,
        promotion: 0.02,
        check: 0.002,
      };
      
      const specialMoveXP = {
        en_passant: 5,
        castle: 3,
        promotion: 7,
        check: 1,
      };
      
      const tokenAmount = specialMoveRewards[moveType] || 0.001;
      const xpAmount = specialMoveXP[moveType] || 1;
      
      // Log for demonstration purposes
      console.log(`Rewarding ${tokenAmount} EMB tokens and ${xpAmount} XP for ${moveType} move`);
      
      // Make a call to your backend service to record the reward
      await fetch('/api/chess-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          rewardAmount: tokenAmount,
          xpAmount,
          reason: `Special chess move: ${moveType}`,
          moveType
        }),
      });
      
      return {
        success: true,
        rewardAmount: tokenAmount,
        xpAmount,
        reason: `Special chess move: ${moveType}`
      };
    } catch (error) {
      console.error('Error rewarding for special move:', error);
      return { success: false, reason: error.message };
    }
  };
  
  // Function to check available EMB token balance
  const getEMBBalance = async () => {
    if (!isInitialized) {
      return 0;
    }
    
    try {
      const response = await fetch(`https://api.shyft.to/sol/v1/token/balance?network=devnet&token_address=${EMB_TOKEN_CONFIG.tokenAddress}&wallet=${publicKey.toString()}`, {
        method: 'GET',
        headers: {
          'x-api-key': EMB_TOKEN_CONFIG.shyftApiKey
        }
      });
      
      const data = await response.json();
      if (data.success) {
        return parseFloat(data.result.balance);
      }
      return 0;
    } catch (error) {
      console.error('Error fetching EMB balance:', error);
      return 0;
    }
  };
  
  return {
    isInitialized,
    rewardForWin,
    rewardForDraw,
    rewardForSpecialMove,
    getEMBBalance
  };
}