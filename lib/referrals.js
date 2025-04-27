import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import logger from './logger.js';

const REFERRAL_REWARD = 20; // EMB tokens
const MIN_TRADE_VOLUME = 100; // Minimum volume required for referral reward

/**
 * Generate a unique referral link for a user
 */
export const generateReferralLink = (userId) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://embassy.ai';
  const referralCode = Buffer.from(userId).toString('base64');
  return `${baseUrl}/join?ref=${referralCode}`;
};

/**
 * Store referral relationship in local storage (replace with backend storage in production)
 */
const storeReferral = (referrerId, newUserId) => {
  const referrals = JSON.parse(localStorage.getItem('referrals') || '{}');
  if (!referrals[referrerId]) {
    referrals[referrerId] = [];
  }
  referrals[referrerId].push({
    userId: newUserId,
    timestamp: new Date().toISOString(),
    rewardClaimed: false
  });
  localStorage.setItem('referrals', JSON.stringify(referrals));
};

/**
 * Track a new referral
 */
export const trackReferral = async (referrerId, newUserId) => {
  try {
    // Store the referral relationship
    storeReferral(referrerId, newUserId);

    // In production, this would make an API call to track the referral
    console.log(`User ${newUserId} joined via referral from ${referrerId}`);

    return {
      success: true,
      referrerId,
      newUserId,
      reward: REFERRAL_REWARD,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Referral Tracking Error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Get all referrals for a user
 */
export const getUserReferrals = (userId) => {
  const referrals = JSON.parse(localStorage.getItem('referrals') || '{}');
  return referrals[userId] || [];
};

/**
 * Calculate total rewards earned from referrals
 */
export const calculateReferralRewards = (userId) => {
  const referrals = getUserReferrals(userId);
  const unclaimedReferrals = referrals.filter(ref => !ref.rewardClaimed);
  
  return {
    totalReferrals: referrals.length,
    pendingRewards: unclaimedReferrals.length * REFERRAL_REWARD,
    unclaimedReferrals
  };
};

/**
 * Claim referral rewards
 */
export const claimReferralRewards = async (userId, walletAddress) => {
  try {
    const { pendingRewards, unclaimedReferrals } = calculateReferralRewards(userId);
    if (pendingRewards === 0) {
      throw new Error('No pending rewards to claim');
    }

    // In production, this would interact with a smart contract to distribute rewards
    console.log(`Claiming ${pendingRewards} EMB tokens for user ${userId}`);

    // Mark referrals as claimed
    const referrals = JSON.parse(localStorage.getItem('referrals') || '{}');
    referrals[userId] = referrals[userId].map(ref => ({
      ...ref,
      rewardClaimed: true,
      claimedAt: new Date().toISOString()
    }));
    localStorage.setItem('referrals', JSON.stringify(referrals));

    return {
      success: true,
      amount: pendingRewards,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Reward Claim Error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Check if a user is eligible for referral rewards
 */
export const checkReferralEligibility = async (userId, referrerId) => {
  try {
    // In production, this would check trade volume and other requirements
    const tradeVolume = 150; // Mock trade volume
    const isEligible = tradeVolume >= MIN_TRADE_VOLUME;

    return {
      isEligible,
      requiredVolume: MIN_TRADE_VOLUME,
      currentVolume: tradeVolume,
      remainingVolume: Math.max(0, MIN_TRADE_VOLUME - tradeVolume)
    };
  } catch (err) {
    console.error('Eligibility Check Error:', err);
    return {
      isEligible: false,
      error: err.message
    };
  }
};

/**
 * Generate referral statistics and analytics
 */
export const getReferralStats = async (userId) => {
  const referrals = getUserReferrals(userId);
  const currentMonth = new Date().getMonth();
  
  const monthlyReferrals = referrals.filter(ref => {
    const refMonth = new Date(ref.timestamp).getMonth();
    return refMonth === currentMonth;
  });

  return {
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter(ref => {
      const refDate = new Date(ref.timestamp);
      const daysSinceReferral = (Date.now() - refDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceReferral <= 30;
    }).length,
    monthlyReferrals: monthlyReferrals.length,
    totalRewardsEarned: referrals.filter(ref => ref.rewardClaimed).length * REFERRAL_REWARD,
    conversionRate: (referrals.length / 100).toFixed(2) // Mock conversion rate
  };
};