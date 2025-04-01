"use client";

import { XP_LEVELS, RANKS, ACHIEVEMENTS, TUTORIALS } from '../content/tutorials';

const STORAGE_KEY = 'userStats';

export class GamificationSystem {
  static XP_RULES = {
    TRADE_COMPLETE: 10,
    AUTO_TRADING_DAILY: 50,
    TUTORIAL_COMPLETE: 100,
    PROFIT_PERCENTAGE: 0.1, // 10% of profit as XP
    EMB_TOKEN_TRADE_BONUS: 5, // Extra XP for trading with $EMB
    EMB_LOCK_DAILY_BONUS: 10, // Daily bonus for locking EMB tokens
    SWAP_TO_EMB_BONUS: 15 // Bonus for swapping to EMB
  };

  static LEVELS = XP_LEVELS;
  static RANKS = RANKS;
  static ACHIEVEMENTS = ACHIEVEMENTS;

  constructor() {
    // Initialize storage if needed
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    }
  }

  loadUserStats() {
    try {
      const data = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : '{}';
      return JSON.parse(data || '{}');
    } catch (err) {
      console.error('Error loading user stats:', err);
      return {};
    }
  }

  saveUserStats(stats) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      }
    } catch (err) {
      console.error('Error saving user stats:', err);
    }
  }

  getUserStats(userId) {
    const stats = this.loadUserStats();
    return stats[userId] || {
      xp: 0,
      level: 1,
      rank: RANKS[0].name,
      badges: [],
      achievements: [],
      totalTrades: 0,
      profitableTrades: 0,
      autoTradeDays: 0,
      lastAutoTradeDate: null,
      completedTutorials: [],
      quizScores: {},
      embTokensUsed: 0,
      embTradeCount: 0,
      lockedEmb: 0,
      lastEmbLockReward: null
    };
  }

  calculateLevel(xp) {
    let level = 1;
    for (const [lvl, requiredXP] of Object.entries(XP_LEVELS)) {
      if (xp >= requiredXP) {
        level = parseInt(lvl);
      } else {
        break;
      }
    }
    return level;
  }

  calculateRank(level) {
    let rank = RANKS[0];
    for (const rankData of RANKS) {
      if (level >= rankData.minLevel) {
        rank = rankData;
      } else {
        break;
      }
    }
    return rank;
  }

  async awardXP(userId, amount) {
    const stats = this.loadUserStats();
    if (!stats[userId]) stats[userId] = this.getUserStats(userId);
    
    const prevLevel = this.calculateLevel(stats[userId].xp);
    const prevRank = this.calculateRank(prevLevel);
    
    stats[userId].xp += amount;
    
    const newLevel = this.calculateLevel(stats[userId].xp);
    const newRank = this.calculateRank(newLevel);
    
    this.saveUserStats(stats);
    
    return {
      leveledUp: newLevel > prevLevel,
      rankUp: newRank.name !== prevRank.name,
      newLevel,
      newRank: newRank.name,
      currentXP: stats[userId].xp,
      rewards: newLevel > prevLevel ? {
        title: `Level ${newLevel}`,
        embTokens: newLevel * 5 // 5 EMB tokens per level
      } : null
    };
  }

  async checkAchievements(userId) {
    const stats = this.getUserStats(userId);
    const newAchievements = [];

    // Check tutorial-based achievements
    if (stats.completedTutorials.length === TUTORIALS.length) {
      if (!stats.achievements.includes('tutorial-completion')) {
        newAchievements.push(ACHIEVEMENTS['tutorial-completion']);
      }
    }

    // Check quiz mastery
    const allPerfectScores = Object.values(stats.quizScores).every(score => score === 100);
    if (allPerfectScores && stats.completedTutorials.length > 0) {
      if (!stats.achievements.includes('quiz-master')) {
        newAchievements.push(ACHIEVEMENTS['quiz-master']);
      }
    }

    // Check fast learner achievement
    const today = new Date().toDateString();
    const todayTutorials = stats.completedTutorials.filter(t => 
      new Date(t.timestamp).toDateString() === today
    ).length;
    
    if (todayTutorials >= 3 && !stats.achievements.includes('fast-learner')) {
      newAchievements.push(ACHIEVEMENTS['fast-learner']);
    }

    // Check trading achievements
    if (stats.totalTrades >= 1 && !stats.badges.includes('first_trade')) {
      stats.badges.push('first_trade');
    }
    if (stats.profitableTrades >= 10 && !stats.badges.includes('profit_pro')) {
      stats.badges.push('profit_pro');
    }
    if (stats.autoTradeDays >= 30 && !stats.badges.includes('auto_master')) {
      stats.badges.push('auto_master');
    }

    // New EMB-specific achievements
    if (stats.embTradeCount >= 10 && !stats.badges.includes('emb_trader')) {
      stats.badges.push('emb_trader');
    }
    if (stats.embTokensUsed >= 100 && !stats.badges.includes('emb_supporter')) {
      stats.badges.push('emb_supporter');
    }
    if (stats.lockedEmb >= 50 && !stats.badges.includes('emb_hodler')) {
      stats.badges.push('emb_hodler');
    }

    if (newAchievements.length > 0 || stats.badges.length > 0) {
      const allStats = this.loadUserStats();
      stats.achievements = [...(stats.achievements || []), ...newAchievements.map(a => a.id)];
      allStats[userId] = stats;
      this.saveUserStats(allStats);

      // Award XP for new achievements
      for (const achievement of newAchievements) {
        await this.awardXP(userId, achievement.xpReward);
      }
    }

    return { newAchievements, badges: stats.badges };
  }

  async updateTradeStats(userId, tradeResult) {
    const stats = this.getUserStats(userId);
    const allStats = this.loadUserStats();
    
    stats.totalTrades++;
    if (tradeResult.profit > 0) {
      stats.profitableTrades++;
    }

    // Award XP for trade completion
    let totalXP = GamificationSystem.XP_RULES.TRADE_COMPLETE;
    
    // Add bonus XP for profitable trades
    if (tradeResult.profit > 0) {
      totalXP += Math.floor(tradeResult.profit * GamificationSystem.XP_RULES.PROFIT_PERCENTAGE);
    }

    // Add bonus XP for using $EMB token in trading
    let bonusXp = 0;
    let bonusReason = '';
    
    if (tradeResult.usedEmbToken) {
      bonusXp = GamificationSystem.XP_RULES.EMB_TOKEN_TRADE_BONUS;
      bonusReason = 'Trading with $EMB';
      stats.embTradeCount++;
      stats.embTokensUsed += tradeResult.embAmount || 1;
    }

    allStats[userId] = stats;
    this.saveUserStats(allStats);

    // Award base XP
    const xpResult = await this.awardXP(userId, totalXP);
    
    // Award bonus XP if applicable
    let bonusXpResult = null;
    if (bonusXp > 0) {
      bonusXpResult = await this.awardXP(userId, bonusXp);
    }
    
    const achievementResult = await this.checkAchievements(userId);

    return {
      xp: {
        ...xpResult,
        bonusXp,
        bonusReason,
        bonusXpResult
      },
      ...achievementResult,
      stats
    };
  }

  async updateAutoTradeDay(userId) {
    const stats = this.getUserStats(userId);
    const allStats = this.loadUserStats();
    const today = new Date().toISOString().split('T')[0];

    if (stats.lastAutoTradeDate !== today) {
      stats.autoTradeDays++;
      stats.lastAutoTradeDate = today;
      
      // Award XP for daily auto-trading
      await this.awardXP(userId, GamificationSystem.XP_RULES.AUTO_TRADING_DAILY);
      
      allStats[userId] = stats;
      this.saveUserStats(allStats);
      
      // Check for new achievements
      return this.checkAchievements(userId);
    }
    
    return [];
  }

  async completeTutorial(userId, tutorialId, score) {
    const stats = this.getUserStats(userId);
    const tutorial = TUTORIALS.find(t => t.id === tutorialId);
    
    if (!tutorial) return null;

    if (!stats.completedTutorials.includes(tutorialId)) {
      stats.completedTutorials.push(tutorialId);
      stats.quizScores[tutorialId] = score;

      const allStats = this.loadUserStats();
      allStats[userId] = stats;
      this.saveUserStats(allStats);

      // Award XP for tutorial completion
      const xpResult = await this.awardXP(userId, tutorial.xpReward);
      
      // Check for achievements
      const achievementResult = await this.checkAchievements(userId);

      return {
        xpResult,
        ...achievementResult
      };
    }

    return null;
  }

  // New method for handling token swaps to EMB
  async recordSwapToEmb(userId, amount) {
    const stats = this.getUserStats(userId);
    const allStats = this.loadUserStats();
    
    // Increase EMB tokens used stats
    stats.embTokensUsed = (stats.embTokensUsed || 0) + amount;
    
    allStats[userId] = stats;
    this.saveUserStats(allStats);
    
    // Award bonus XP for swapping to EMB
    const xpResult = await this.awardXP(userId, GamificationSystem.XP_RULES.SWAP_TO_EMB_BONUS);
    
    // Check for new achievements
    const achievementResult = await this.checkAchievements(userId);
    
    return {
      xpResult,
      bonusXp: GamificationSystem.XP_RULES.SWAP_TO_EMB_BONUS,
      bonusReason: 'Swapping to $EMB',
      ...achievementResult
    };
  }
  
  // New method for locking EMB tokens
  async lockEmbTokens(userId, amount) {
    const stats = this.getUserStats(userId);
    const allStats = this.loadUserStats();
    const today = new Date().toISOString().split('T')[0];
    
    // Update locked EMB amount
    stats.lockedEmb = (stats.lockedEmb || 0) + amount;
    
    let bonusXp = 0;
    let bonusReason = '';
    
    // Award daily bonus for locked tokens if not already awarded today
    if (stats.lastEmbLockReward !== today) {
      bonusXp = GamificationSystem.XP_RULES.EMB_LOCK_DAILY_BONUS;
      bonusReason = 'Locking $EMB tokens';
      stats.lastEmbLockReward = today;
    }
    
    allStats[userId] = stats;
    this.saveUserStats(allStats);
    
    let xpResult = null;
    if (bonusXp > 0) {
      xpResult = await this.awardXP(userId, bonusXp);
    }
    
    // Check for new achievements
    const achievementResult = await this.checkAchievements(userId);
    
    return {
      xpResult,
      bonusXp,
      bonusReason,
      ...achievementResult,
      lockedAmount: stats.lockedEmb
    };
  }
}

// Create singleton instance
const gamificationSystem = new GamificationSystem();
export default gamificationSystem;

// Named exports
export const updateTradeStats = (userId, tradeResult) => gamificationSystem.updateTradeStats(userId, tradeResult);
export const recordSwapToEmb = (userId, amount) => gamificationSystem.recordSwapToEmb(userId, amount);
export const lockEmbTokens = (userId, amount) => gamificationSystem.lockEmbTokens(userId, amount);