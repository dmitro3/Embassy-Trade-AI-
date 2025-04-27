// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\app\api\tradeforce\roundTable\route.js
import { NextResponse } from 'next/server';
import tradeforceAI from '../../../../lib/tradeforceAI.js';
import logger from '../../../../lib/logger.js';
import marketDataAggregator from '../../../../lib/marketDataAggregator.js';

/**
 * POST endpoint for RoundTable analysis
 * Analyzes an asset using the TradeForce AI RoundTable consensus mechanism
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { asset, timeframe = '1h', riskLevel = 'medium' } = body;
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset address is required' },
        { status: 400 }
      );
    }
    
    // Ensure TradeForce AI is initialized
    try {
      if (!tradeforceAI.isInitialized()) {
        await tradeforceAI.init();
      }
    } catch (initError) {
      logger.error(`TradeForce AI initialization failed: ${initError.message}`);
      // Continue with a fallback mechanism
    }
    
    try {
      // Get market data with timeout and fallback
      const marketDataPromise = marketDataAggregator.getHistoricalOHLCV(asset, {
        interval: timeframe,
        limit: 100,
        forceRefresh: true,
        timeout: 15000 // 15 second timeout
      }).catch(err => {
        logger.warn(`Market data fetch failed: ${err.message}`);
        // Return minimal fallback data if the real data fetch fails
        return [{
          time: Date.now() - 86400000, // 24 hours ago
          open: 1.0,
          high: 1.1, 
          low: 0.9,
          close: 1.0,
          volume: 1000,
          fallback: true
        }];
      });
      
      // Get current price with timeout and fallback
      const priceDataPromise = marketDataAggregator.getCurrentPrice(asset)
        .catch(err => {
          logger.warn(`Price data fetch failed: ${err.message}`);
          return 1.0; // Fallback price
        });
      
      // Get token info with timeout and fallback
      const tokenInfoPromise = marketDataAggregator.getTokenInfo(asset)
        .catch(err => {
          logger.warn(`Token info fetch failed: ${err.message}`);
          return {
            address: asset,
            symbol: asset.substring(0, 4).toUpperCase(),
            name: `Unknown (${asset.substring(0, 6)}...)`,
            decimals: 9,
            fallback: true
          };
        });
      
      // Wait for all promises to resolve (with fallbacks if they fail)
      const [marketData, priceData, tokenInfo] = await Promise.all([
        marketDataPromise,
        priceDataPromise,
        tokenInfoPromise
      ]);
      
      // Check if we have sufficient data for analysis
      if (!marketData || marketData.length === 0) {
        throw new Error('Insufficient market data for analysis');
      }
      
      // Analyze with RoundTable, with timeout protection
      try {
        const analysisPromise = tradeforceAI.analyzeAssetWithRoundTable(
          asset, 
          marketData,
          { 
            currentPrice: priceData,
            tokenInfo,
            riskLevel
          }
        );
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000);
        });
        
        // Race the analysis against the timeout
        const result = await Promise.race([analysisPromise, timeoutPromise]);
        
        return NextResponse.json(result);
      } catch (analysisError) {
        logger.error(`Analysis error: ${analysisError.message}`);
        
        // Return a minimal fallback analysis
        return NextResponse.json({
          asset,
          symbol: tokenInfo.symbol || asset.substring(0, 4).toUpperCase(),
          action: 'hold',
          hasConsensus: false,
          consensusConfidence: 0.5,
          currentPrice: priceData,
          agentSignals: [
            {
              agent: 'Trend Analyst',
              specialty: 'Moving Averages',
              action: 'hold',
              confidence: 0.5,
              strategy: 'MA Crossovers',
              notes: ['Analysis timed out or failed']
            }
          ],
          agreeingAgents: 0,
          fallback: true,
          error: analysisError.message
        }, 
        { status: 200 }); // Return 200 even with fallback data to prevent UI errors
      }
    } catch (error) {
      logger.error(`RoundTable API processing error: ${error.message}`);
      
      // Return a minimal fallback analysis with error information
      return NextResponse.json({
        asset,
        action: 'hold',
        hasConsensus: false,
        consensusConfidence: 0,
        fallback: true,
        error: error.message
      }, 
      { status: 200 }); // Return 200 even with fallback data
    }
  } catch (error) {
    logger.error(`RoundTable API error: ${error.message}`);
    
    // Return minimal response even on critical errors
    return NextResponse.json({ 
      error: error.message,
      fallback: true,
      action: 'hold'
    }, 
    { status: 200 });  // Return 200 to prevent cascading UI failures
  }
}

/**
 * GET endpoint for RoundTable analysis
 * Gets token details and recent analyses
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset');
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset address is required' },
        { status: 400 }
      );
    }
    
    // Ensure TradeForce AI is initialized
    if (!tradeforceAI.isInitialized()) {
      await tradeforceAI.init();
    }
    
    // Get token info
    const tokenInfo = await marketDataAggregator.getTokenInfo(asset);
    
    // Get price data
    const priceData = await marketDataAggregator.getCurrentPrice(asset);
    
    // Find recent analyses for this asset
    const recentAnalyses = tradeforceAI.recentAnalyses.filter(a => a.asset === asset);
    
    return NextResponse.json({
      asset,
      tokenInfo,
      price: priceData,
      recentAnalyses: recentAnalyses.slice(0, 5)
    });
  } catch (error) {
    logger.error(`RoundTable API GET error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
