/**
 * Risk Assessment Service for Pump.fun MCP Server
 * 
 * This service analyzes tokens for various risk factors and provides a risk score
 * to help identify potential sniping opportunities.
 */

const axios = require('axios');
const logger = require('../logger');

/**
 * Risk Assessment Service
 */
class RiskAssessmentService {
  constructor() {
    this.shyftApiKey = process.env.SHYFT_API_KEY;
    this.birdeyeApiKey = process.env.BIRDEYE_API_KEY;
    this.minLiquidityThreshold = parseFloat(process.env.MIN_LIQUIDITY_THRESHOLD) || 5000;
    this.minHoldersThreshold = parseInt(process.env.MIN_HOLDERS_THRESHOLD) || 10;
  }
  
  /**
   * Analyze token risk
   * 
   * @param {string} tokenAddress - Solana token address
   * @param {Object} tokenData - Token data (optional, will be fetched if not provided)
   * @returns {Promise<Object>} - Risk analysis result
   */
  async analyzeTokenRisk(tokenAddress, tokenData = null) {
    try {
      // Get token data if not provided
      if (!tokenData) {
        tokenData = await this.getTokenData(tokenAddress);
      }
      
      // Get additional data from Birdeye
      const birdeyeData = await this.getBirdeyeData(tokenAddress);
      
      // Calculate risk factors
      const liquidityRisk = this.calculateLiquidityRisk(tokenData, birdeyeData);
      const holderConcentrationRisk = await this.calculateHolderConcentrationRisk(tokenAddress, tokenData);
      const contractRisk = await this.calculateContractRisk(tokenAddress, tokenData);
      const marketVolatilityRisk = await this.calculateMarketVolatilityRisk(tokenAddress, birdeyeData);
      
      // Calculate overall risk score (0-1, where 0 is low risk and 1 is high risk)
      const riskScore = (
        liquidityRisk * 0.4 +
        holderConcentrationRisk * 0.3 +
        contractRisk * 0.2 +
        marketVolatilityRisk * 0.1
      );
      
      return {
        tokenAddress,
        symbol: tokenData.symbol,
        name: tokenData.name,
        riskScore,
        liquidity: {
          score: liquidityRisk,
          value: birdeyeData?.liquidity || 0
        },
        holderConcentration: {
          score: holderConcentrationRisk,
          topHoldersPercentage: birdeyeData?.topHoldersPercentage || 0
        },
        contractRisk: {
          score: contractRisk,
          hasRenounced: tokenData?.hasRenounced || false,
          isVerified: tokenData?.isVerified || false
        },
        marketVolatility: {
          score: marketVolatilityRisk,
          priceChangePercent24h: birdeyeData?.priceChangePercent24h || 0
        }
      };
    } catch (error) {
      logger.error(`Error analyzing token risk for ${tokenAddress}: ${error.message}`);
      
      // Return a high risk score if analysis fails
      return {
        tokenAddress,
        symbol: tokenData?.symbol || 'UNKNOWN',
        name: tokenData?.name || 'Unknown Token',
        riskScore: 0.9,
        liquidity: { score: 0.9, value: 0 },
        holderConcentration: { score: 0.9, topHoldersPercentage: 0 },
        contractRisk: { score: 0.9, hasRenounced: false, isVerified: false },
        marketVolatility: { score: 0.9, priceChangePercent24h: 0 }
      };
    }
  }
  
  /**
   * Calculate liquidity risk
   * 
   * @param {Object} tokenData - Token data
   * @param {Object} birdeyeData - Birdeye data
   * @returns {number} - Liquidity risk score (0-1)
   */
  calculateLiquidityRisk(tokenData, birdeyeData) {
    // Get liquidity from Birdeye data or estimate from token data
    const liquidity = birdeyeData?.liquidity || (tokenData?.price * tokenData?.supply * 0.01) || 0;
    
    // Calculate risk based on liquidity threshold
    if (liquidity >= this.minLiquidityThreshold * 10) {
      return 0.1; // Very low risk
    } else if (liquidity >= this.minLiquidityThreshold * 5) {
      return 0.3; // Low risk
    } else if (liquidity >= this.minLiquidityThreshold * 2) {
      return 0.5; // Medium risk
    } else if (liquidity >= this.minLiquidityThreshold) {
      return 0.7; // High risk
    } else {
      return 0.9; // Very high risk
    }
  }
  
  /**
   * Calculate holder concentration risk
   * 
   * @param {string} tokenAddress - Solana token address
   * @param {Object} tokenData - Token data
   * @returns {Promise<number>} - Holder concentration risk score (0-1)
   */
  async calculateHolderConcentrationRisk(tokenAddress, tokenData) {
    try {
      // Get holder data from SHYFT
      const response = await axios.get(`https://api.shyft.to/sol/v1/token/holders?network=devnet&token_address=${tokenAddress}`, {
        headers: { 'x-api-key': this.shyftApiKey }
      });
      
      const holders = response.data?.result?.holders || [];
      
      // Check if there are enough holders
      if (holders.length < this.minHoldersThreshold) {
        return 0.9; // Very high risk
      }
      
      // Calculate percentage held by top 5 holders
      const totalSupply = tokenData.supply || 0;
      let topHoldersAmount = 0;
      
      for (let i = 0; i < Math.min(5, holders.length); i++) {
        topHoldersAmount += holders[i].amount || 0;
      }
      
      const topHoldersPercentage = totalSupply > 0 ? (topHoldersAmount / totalSupply) * 100 : 0;
      
      // Calculate risk based on top holders percentage
      if (topHoldersPercentage >= 80) {
        return 0.9; // Very high risk
      } else if (topHoldersPercentage >= 60) {
        return 0.7; // High risk
      } else if (topHoldersPercentage >= 40) {
        return 0.5; // Medium risk
      } else if (topHoldersPercentage >= 20) {
        return 0.3; // Low risk
      } else {
        return 0.1; // Very low risk
      }
    } catch (error) {
      logger.error(`Error calculating holder concentration risk for ${tokenAddress}: ${error.message}`);
      return 0.7; // Default to high risk if calculation fails
    }
  }
  
  /**
   * Calculate contract risk
   * 
   * @param {string} tokenAddress - Solana token address
   * @param {Object} tokenData - Token data
   * @returns {Promise<number>} - Contract risk score (0-1)
   */
  async calculateContractRisk(tokenAddress, tokenData) {
    try {
      // In a real implementation, this would analyze the token's contract for risks
      // For now, we'll use a simplified approach based on token data
      
      // Check if token is verified
      const isVerified = tokenData?.isVerified || false;
      
      // Check if token has renounced ownership
      const hasRenounced = tokenData?.hasRenounced || false;
      
      // Check token age
      const tokenAge = tokenData?.createdAt ? (Date.now() - new Date(tokenData.createdAt).getTime()) / (24 * 60 * 60 * 1000) : 0;
      
      // Calculate risk score
      let riskScore = 0.5; // Start with medium risk
      
      if (isVerified) {
        riskScore -= 0.2; // Lower risk if verified
      }
      
      if (hasRenounced) {
        riskScore -= 0.2; // Lower risk if ownership renounced
      }
      
      if (tokenAge > 30) {
        riskScore -= 0.1; // Lower risk if token is older than 30 days
      } else if (tokenAge < 1) {
        riskScore += 0.2; // Higher risk if token is less than 1 day old
      }
      
      // Ensure risk score is between 0 and 1
      return Math.max(0, Math.min(1, riskScore));
    } catch (error) {
      logger.error(`Error calculating contract risk for ${tokenAddress}: ${error.message}`);
      return 0.7; // Default to high risk if calculation fails
    }
  }
  
  /**
   * Calculate market volatility risk
   * 
   * @param {string} tokenAddress - Solana token address
   * @param {Object} birdeyeData - Birdeye data
   * @returns {Promise<number>} - Market volatility risk score (0-1)
   */
  async calculateMarketVolatilityRisk(tokenAddress, birdeyeData) {
    try {
      // Get price change percentage from Birdeye data
      const priceChangePercent24h = birdeyeData?.priceChangePercent24h || 0;
      
      // Calculate risk based on price change percentage
      const absChange = Math.abs(priceChangePercent24h);
      
      if (absChange > 50) {
        return 0.9; // Very high risk
      } else if (absChange > 30) {
        return 0.7; // High risk
      } else if (absChange > 20) {
        return 0.5; // Medium risk
      } else if (absChange > 10) {
        return 0.3; // Low risk
      } else {
        return 0.1; // Very low risk
      }
    } catch (error) {
      logger.error(`Error calculating market volatility risk for ${tokenAddress}: ${error.message}`);
      return 0.5; // Default to medium risk if calculation fails
    }
  }
  
  /**
   * Get token data from SHYFT
   * 
   * @param {string} tokenAddress - Solana token address
   * @returns {Promise<Object>} - Token data
   */
  async getTokenData(tokenAddress) {
    try {
      const response = await axios.get(`https://api.shyft.to/sol/v1/token/get_info?network=devnet&token_address=${tokenAddress}`, {
        headers: { 'x-api-key': this.shyftApiKey }
      });
      
      return response.data.result;
    } catch (error) {
      logger.error(`Error fetching token data from SHYFT: ${error.message}`);
      throw new Error(`Failed to fetch token data: ${error.message}`);
    }
  }
  
  /**
   * Get token data from Birdeye
   * 
   * @param {string} tokenAddress - Solana token address
   * @returns {Promise<Object>} - Birdeye data
   */
  async getBirdeyeData(tokenAddress) {
    try {
      const response = await axios.get(`https://public-api.birdeye.so/defi/price?address=${tokenAddress}`, {
        headers: { 'X-API-KEY': this.birdeyeApiKey }
      });
      
      const data = response.data?.data || {};
      
      // Get liquidity data
      const liquidityResponse = await axios.get(`https://public-api.birdeye.so/defi/liquidity?address=${tokenAddress}`, {
        headers: { 'X-API-KEY': this.birdeyeApiKey }
      });
      
      const liquidity = liquidityResponse.data?.data?.value || 0;
      
      return {
        price: data.value,
        priceChangePercent24h: data.priceChange24h,
        volume24h: data.volume24h,
        liquidity,
        topHoldersPercentage: 0 // This would be fetched from a different endpoint in a real implementation
      };
    } catch (error) {
      logger.error(`Error fetching token data from Birdeye: ${error.message}`);
      return null; // Return null if Birdeye data is not available
    }
  }
}

// Create and export singleton instance
const riskAssessment = new RiskAssessmentService();
module.exports = riskAssessment;
