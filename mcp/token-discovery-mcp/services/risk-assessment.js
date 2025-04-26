/**
 * Advanced Risk Assessment Service for Token Discovery MCP
 * 
 * This service provides sophisticated risk analysis for crypto tokens,
 * combining multiple metrics to generate holistic risk scores and recommendations.
 */

class RiskAssessment {
  constructor(config = {}) {
    this.config = {
      // Default weight coefficients for different risk factors
      riskFactorWeights: {
        liquidity: 0.20,           // Liquidity is a critical factor
        holders: 0.15,             // Number of token holders
        transactions: 0.15,        // Transaction patterns
        contract: 0.15,            // Contract analysis
        priceAction: 0.10,         // Price action patterns
        social: 0.05,              // Social signals
        team: 0.10,                // Team transparency
        marketTiming: 0.05,        // Market timing
        tokenomics: 0.05           // Tokenomics structure
      },
      // Risk tolerance adjustment multipliers
      riskToleranceMultipliers: {
        low: 1.5,                  // Amplifies risk factors for low risk tolerance
        moderate: 1.0,             // Neutral multiplier
        high: 0.7                  // Reduces risk factors for high risk tolerance
      },
      // Potential ROI score weights
      potentialFactorWeights: {
        priceMovement: 0.25,       // Recent price movement
        marketCap: 0.20,           // Current market cap (lower = higher potential)
        liquidity: 0.15,           // Liquidity (moderate is best)
        momentum: 0.15,            // Market momentum indicators
        uniqueness: 0.10,          // Uniqueness of project/token
        community: 0.10,           // Community engagement
        utility: 0.05              // Actual utility of token
      },
      ...config
    };
    
    // Initialize cache for token risk assessments
    this.assessmentCache = new Map();
  }
  
  /**
   * Assess a token's risk profile
   * 
   * @param {Object} tokenData - Normalized token data
   * @param {string} riskTolerance - Risk tolerance ('low', 'moderate', 'high')
   * @returns {Object} - Risk assessment results
   */
  assessTokenRisk(tokenData, riskTolerance = 'moderate') {
    // Check cache first
    const cacheKey = `${tokenData.address || ''}-${riskTolerance}`;
    if (this.assessmentCache.has(cacheKey)) {
      return this.assessmentCache.get(cacheKey);
    }
    
    // Normalize all input data for consistent scoring
    const normalizedData = this.normalizeTokenData(tokenData);
    
    // Calculate individual risk factor scores (0-100, higher = riskier)
    const riskFactors = {
      liquidity: this.assessLiquidityRisk(normalizedData),
      holders: this.assessHoldersRisk(normalizedData),
      transactions: this.assessTransactionRisk(normalizedData),
      contract: this.assessContractRisk(normalizedData),
      priceAction: this.assessPriceActionRisk(normalizedData),
      social: this.assessSocialRisk(normalizedData),
      team: this.assessTeamRisk(normalizedData),
      marketTiming: this.assessMarketTimingRisk(normalizedData),
      tokenomics: this.assessTokenomicsRisk(normalizedData)
    };
    
    // Apply risk tolerance adjustment
    const multiplier = this.config.riskToleranceMultipliers[riskTolerance] || 1.0;
    
    // Calculate weighted risk score (0-100, higher = riskier)
    let totalWeight = 0;
    let weightedRiskScore = 0;
    
    for (const [factor, score] of Object.entries(riskFactors)) {
      const weight = this.config.riskFactorWeights[factor] || 0;
      weightedRiskScore += score * weight * multiplier;
      totalWeight += weight;
    }
    
    // Normalize to 0-100 scale
    const riskScore = totalWeight > 0 
      ? Math.min(100, Math.max(0, weightedRiskScore / totalWeight)) 
      : 50;
    
    // Calculate opportunity score (inverse of risk with additional factors)
    const potentialScore = this.calculatePotentialScore(normalizedData, riskScore);
    
    // Generate report
    const assessment = {
      riskScore: Math.round(riskScore),
      riskLevel: this.getRiskLevel(riskScore),
      potentialScore: Math.round(potentialScore),
      potentialLevel: this.getPotentialLevel(potentialScore),
      riskToRewardRatio: potentialScore > 0 ? riskScore / potentialScore : Infinity,
      riskFactors,
      recommendations: this.generateRecommendations(riskScore, potentialScore, normalizedData),
      timestamp: new Date().toISOString()
    };
    
    // Cache result
    this.assessmentCache.set(cacheKey, assessment);
    
    return assessment;
  }
  
  /**
   * Calculate potential score for a token
   * 
   * @param {Object} data - Normalized token data
   * @param {number} riskScore - Calculated risk score
   * @returns {number} - Potential score (0-100)
   */
  calculatePotentialScore(data, riskScore) {
    // Calculate potential factors (0-100, higher = better potential)
    const potentialFactors = {
      priceMovement: this.calculatePriceMovementScore(data),
      marketCap: this.calculateMarketCapScore(data),
      liquidity: this.calculateLiquidityScore(data),
      momentum: this.calculateMomentumScore(data),
      uniqueness: this.calculateUniquenessScore(data),
      community: this.calculateCommunityScore(data),
      utility: this.calculateUtilityScore(data)
    };
    
    // Calculate weighted potential score
    let totalWeight = 0;
    let weightedPotentialScore = 0;
    
    for (const [factor, score] of Object.entries(potentialFactors)) {
      const weight = this.config.potentialFactorWeights[factor] || 0;
      weightedPotentialScore += score * weight;
      totalWeight += weight;
    }
    
    // Normalize potential score
    const rawPotentialScore = totalWeight > 0 
      ? Math.min(100, Math.max(0, weightedPotentialScore / totalWeight)) 
      : 50;
    
    // Risk-adjusted potential (higher risk reduces potential score)
    const riskAdjustment = Math.max(0, 100 - riskScore) / 100;
    const potentialScore = rawPotentialScore * riskAdjustment;
    
    return potentialScore;
  }
  
  /**
   * Normalize token data for consistent scoring
   * 
   * @param {Object} tokenData - Raw token data
   * @returns {Object} - Normalized token data
   */
  normalizeTokenData(tokenData) {
    // Extract and normalize common fields from different sources
    const source = tokenData.source || 'unknown';
    
    // Different sources might have different field names
    // We normalize them to a common structure
    return {
      address: tokenData.address || '',
      symbol: tokenData.symbol || '',
      name: tokenData.name || '',
      decimals: parseInt(tokenData.decimals || 9),
      liquidity: parseFloat(tokenData.liquidityUsd || tokenData.liquidity?.usd || 0),
      volume24h: parseFloat(tokenData.volume24h || tokenData.volume?.h24 || 0),
      priceUsd: parseFloat(tokenData.priceUsd || tokenData.price || 0),
      priceChange24h: parseFloat(tokenData.priceChange24h || tokenData.priceChange?.h24 || 0),
      holders: parseInt(tokenData.holders || 0),
      buyCount24h: parseInt(tokenData.buyCount24h || tokenData.txns?.h24?.buys || 0),
      sellCount24h: parseInt(tokenData.sellCount24h || tokenData.txns?.h24?.sells || 0),
      marketCap: parseFloat(tokenData.marketCap || tokenData.mcap || 0),
      launchTime: tokenData.launchTime || tokenData.launchTimestamp || null,
      age: tokenData.age || this.calculateTokenAge(tokenData),
      socialPresence: this.normalizeSocialData(tokenData),
      contractVerified: tokenData.contractVerified || false,
      hasWebsite: !!tokenData.website,
      source,
      rawData: tokenData // Keep raw data for reference
    };
  }
  
  /**
   * Calculate token age in hours
   * 
   * @param {Object} tokenData - Token data
   * @returns {number} - Token age in hours
   */
  calculateTokenAge(tokenData) {
    const launchTime = tokenData.launchTime || tokenData.launchTimestamp || tokenData.createdAt;
    
    if (!launchTime) return 720; // Default to 30 days if no launch time provided
    
    const launchDate = new Date(launchTime);
    const now = new Date();
    const ageHours = (now - launchDate) / (1000 * 60 * 60);
    
    return ageHours;
  }
  
  /**
   * Normalize social data from different sources
   * 
   * @param {Object} tokenData - Token data
   * @returns {Object} - Normalized social data
   */
  normalizeSocialData(tokenData) {
    return {
      twitter: tokenData.twitter || tokenData.twitterUsername || null,
      twitterFollowers: parseInt(tokenData.twitterFollowers || 0),
      telegram: tokenData.telegram || tokenData.telegramUrl || null,
      telegramMembers: parseInt(tokenData.telegramMembers || 0),
      discord: tokenData.discord || tokenData.discordUrl || null,
      website: tokenData.website || tokenData.websiteUrl || null
    };
  }
  
  // Individual risk assessment functions
  
  assessLiquidityRisk(data) {
    // Lower liquidity = higher risk
    const liquidity = data.liquidity;
    
    if (liquidity === 0) return 100;
    if (liquidity < 1000) return 95;
    if (liquidity < 5000) return 85;
    if (liquidity < 10000) return 75;
    if (liquidity < 25000) return 65;
    if (liquidity < 50000) return 50;
    if (liquidity < 100000) return 35;
    if (liquidity < 200000) return 25;
    if (liquidity < 500000) return 15;
    return 10;
  }
  
  assessHoldersRisk(data) {
    // Fewer holders = higher risk
    const holders = data.holders;
    
    if (holders === 0) return 100;
    if (holders < 10) return 95;
    if (holders < 30) return 85;
    if (holders < 50) return 75;
    if (holders < 100) return 65;
    if (holders < 200) return 50;
    if (holders < 500) return 40;
    if (holders < 1000) return 30;
    if (holders < 5000) return 20;
    return 10;
  }
  
  assessTransactionRisk(data) {
    // Analyze buy/sell patterns
    const { buyCount24h, sellCount24h, volume24h } = data;
    const totalTxs = buyCount24h + sellCount24h;
    
    // No transactions is high risk
    if (totalTxs === 0) return 90;
    
    // Very few transactions is high risk
    if (totalTxs < 5) return 80;
    
    // Calculate buy/sell ratio risk
    let ratioRisk;
    if (buyCount24h === 0 && sellCount24h > 0) {
      // Only sells, no buys is very high risk
      ratioRisk = 100;
    } else if (sellCount24h === 0 && buyCount24h > 0) {
      // Only buys, no sells is moderate risk
      ratioRisk = 40;
    } else if (sellCount24h > 0) {
      // More sells than buys is higher risk
      const ratio = buyCount24h / sellCount24h;
      if (ratio < 0.3) ratioRisk = 90;
      else if (ratio < 0.5) ratioRisk = 80;
      else if (ratio < 0.8) ratioRisk = 70;
      else if (ratio < 1.0) ratioRisk = 60;
      else if (ratio < 1.5) ratioRisk = 40;
      else if (ratio < 2.0) ratioRisk = 30;
      else if (ratio < 3.0) ratioRisk = 25;
      else ratioRisk = 20;
    } else {
      ratioRisk = 50; // Neutral if can't calculate ratio
    }
    
    // Volume risk - low volume is higher risk
    let volumeRisk;
    if (volume24h < 100) volumeRisk = 90;
    else if (volume24h < 500) volumeRisk = 80;
    else if (volume24h < 1000) volumeRisk = 70;
    else if (volume24h < 5000) volumeRisk = 60;
    else if (volume24h < 10000) volumeRisk = 50;
    else if (volume24h < 50000) volumeRisk = 40;
    else if (volume24h < 100000) volumeRisk = 30;
    else volumeRisk = 20;
    
    // Combined transaction risk (weighted average)
    return (ratioRisk * 0.6) + (volumeRisk * 0.4);
  }
  
  assessContractRisk(data) {
    // Only basic contract assessment without code analysis
    if (data.contractVerified) {
      return 40; // Still some risk even with verified contracts
    }
    return 85; // Unverified contracts are high risk
  }
  
  assessPriceActionRisk(data) {
    const priceChange = data.priceChange24h;
    
    // Extreme price movements (up or down) indicate volatility/risk
    const absChange = Math.abs(priceChange);
    if (absChange > 100) return 90; // Extreme volatility
    if (absChange > 50) return 80;
    if (absChange > 30) return 70;
    if (absChange > 20) return 60;
    if (absChange > 10) return 50;
    if (absChange > 5) return 40;
    return 30; // Stable price has lower risk
  }
  
  assessSocialRisk(data) {
    const social = data.socialPresence;
    let score = 50; // Default moderate risk
    
    // Lower risk for tokens with established social presence
    if (social.website) score -= 10;
    if (social.twitter) score -= 10;
    if (social.telegram) score -= 10;
    if (social.discord) score -= 5;
    
    // Lower risk for tokens with significant followers
    if (social.twitterFollowers > 10000) score -= 10;
    else if (social.twitterFollowers > 5000) score -= 8;
    else if (social.twitterFollowers > 1000) score -= 5;
    
    if (social.telegramMembers > 10000) score -= 10;
    else if (social.telegramMembers > 5000) score -= 8;
    else if (social.telegramMembers > 1000) score -= 5;
    
    // Ensure score is within bounds
    return Math.min(100, Math.max(0, score));
  }
  
  assessTeamRisk(data) {
    // Without detailed team info, we use proxy indicators
    // This is simplified for the example
    const social = data.socialPresence;
    const hasWebsite = !!social.website;
    const hasTwitter = !!social.twitter;
    const hasTelegram = !!social.telegram;
    
    if (!hasWebsite && !hasTwitter && !hasTelegram) {
      return 90; // Very high risk with no online presence
    }
    
    if (hasWebsite && hasTwitter && hasTelegram) {
      return 50; // Moderate risk with basic online presence
    }
    
    return 70; // High risk with limited online presence
  }
  
  assessMarketTimingRisk(data) {
    // This would ideally account for market conditions
    // Simplified implementation
    return 50; // Neutral risk for market timing
  }
  
  assessTokenomicsRisk(data) {
    // Without detailed tokenomics info, return moderate risk
    return 50;
  }
  
  // Potential score calculation functions
  
  calculatePriceMovementScore(data) {
    const priceChange = data.priceChange24h;
    
    // Higher positive price movement = higher potential
    if (priceChange > 100) return 90;
    if (priceChange > 50) return 80;
    if (priceChange > 30) return 70;
    if (priceChange > 20) return 65;
    if (priceChange > 10) return 60;
    if (priceChange > 5) return 55;
    if (priceChange > 0) return 50;
    if (priceChange > -10) return 45;
    if (priceChange > -20) return 40;
    if (priceChange > -50) return 30;
    return 20; // Large price drops indicate lower potential
  }
  
  calculateMarketCapScore(data) {
    const marketCap = data.marketCap;
    
    // Lower market cap = higher growth potential
    if (marketCap === 0) return 50; // Unknown market cap
    if (marketCap < 10000) return 90;
    if (marketCap < 50000) return 85;
    if (marketCap < 100000) return 80;
    if (marketCap < 250000) return 75;
    if (marketCap < 500000) return 70;
    if (marketCap < 1000000) return 65;
    if (marketCap < 5000000) return 60;
    if (marketCap < 10000000) return 55;
    if (marketCap < 50000000) return 50;
    if (marketCap < 100000000) return 40;
    return 30;
  }
  
  calculateLiquidityScore(data) {
    const liquidity = data.liquidity;
    
    // Moderate liquidity is ideal for potential
    if (liquidity < 1000) return 40; // Too low liquidity limits potential
    if (liquidity < 5000) return 50;
    if (liquidity < 25000) return 60;
    if (liquidity < 100000) return 70; // Sweet spot for growth
    if (liquidity < 500000) return 60;
    if (liquidity < 1000000) return 50;
    return 40; // Too high liquidity may limit upside
  }
  
  calculateMomentumScore(data) {
    // Use buy/sell ratio as proxy for momentum
    const { buyCount24h, sellCount24h } = data;
    
    if (buyCount24h === 0 && sellCount24h === 0) return 40; // No activity
    if (sellCount24h === 0 && buyCount24h > 0) return 80; // All buys
    if (buyCount24h === 0 && sellCount24h > 0) return 20; // All sells
    
    const ratio = buyCount24h / sellCount24h;
    if (ratio > 5) return 90;
    if (ratio > 3) return 80;
    if (ratio > 2) return 70;
    if (ratio > 1.5) return 60;
    if (ratio > 1) return 55;
    if (ratio > 0.7) return 45;
    if (ratio > 0.5) return 40;
    if (ratio > 0.3) return 30;
    return 20;
  }
  
  calculateUniquenessScore(data) {
    // Without detailed project info, return moderate score
    return 50;
  }
  
  calculateCommunityScore(data) {
    const social = data.socialPresence;
    
    let score = 50; // Base score
    
    // Adjust based on social metrics
    if (social.twitterFollowers > 10000) score += 20;
    else if (social.twitterFollowers > 5000) score += 15;
    else if (social.twitterFollowers > 1000) score += 10;
    
    if (social.telegramMembers > 10000) score += 20;
    else if (social.telegramMembers > 5000) score += 15;
    else if (social.telegramMembers > 1000) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }
  
  calculateUtilityScore(data) {
    // Without detailed project info, return moderate score
    return 50;
  }
  
  // Helper functions
  
  getRiskLevel(score) {
    if (score >= 80) return 'VERY_HIGH';
    if (score >= 65) return 'HIGH';
    if (score >= 45) return 'MODERATE';
    if (score >= 30) return 'LOW';
    return 'VERY_LOW';
  }
  
  getPotentialLevel(score) {
    if (score >= 80) return 'EXCEPTIONAL';
    if (score >= 65) return 'HIGH';
    if (score >= 45) return 'MODERATE';
    if (score >= 30) return 'LOW';
    return 'VERY_LOW';
  }
  
  generateRecommendations(riskScore, potentialScore, data) {
    // Generate appropriate recommendations based on risk and potential
    
    const riskToRewardRatio = riskScore / potentialScore;
    let action, reasoning;
    
    if (riskScore >= 80) {
      action = 'AVOID';
      reasoning = 'Extremely high risk profile indicates potential scam or rugpull.';
    } else if (riskToRewardRatio > 1.5) {
      action = 'AVOID';
      reasoning = 'Risk significantly outweighs potential reward.';
    } else if (riskToRewardRatio > 1.2) {
      action = 'MONITOR';
      reasoning = 'Risk slightly outweighs potential reward. Wait for better entry or more information.';
    } else if (potentialScore >= 70 && riskScore <= 60) {
      action = 'CONSIDER_ENTRY';
      reasoning = 'High potential with acceptable risk profile.';
    } else if (potentialScore >= 50 && riskScore <= 50) {
      action = 'SMALL_POSITION';
      reasoning = 'Moderate potential with moderate risk. Consider small position.';
    } else {
      action = 'PASS';
      reasoning = 'Insufficient risk-reward profile.';
    }
    
    // Add specific details based on metrics
    const details = [];
    
    if (data.liquidity < 10000) {
      details.push('Low liquidity increases slippage and exit risk.');
    }
    
    if (data.holders < 50) {
      details.push('Small holder base increases concentration risk.');
    }
    
    if (data.buyCount24h < data.sellCount24h) {
      details.push('More sells than buys indicates negative momentum.');
    }
    
    if (data.age < 48) {
      details.push('New token with limited track record.');
    }
    
    if (potentialScore > 65) {
      details.push('Token shows strong growth potential based on metrics.');
    }
    
    return {
      action,
      reasoning,
      details,
      confidence: Math.round(100 - (Math.abs(riskScore - 50) + Math.abs(potentialScore - 50)) / 2)
    };
  }
}

module.exports = RiskAssessment;
