import { NextResponse } from 'next/server';
import roundTableAI from '../../../../lib/roundTableAI';
import logger from '../../../../lib/logger';

/**
 * RoundTable AI API Endpoint
 * 
 * Provides AI trading signals and consensus for a given asset
 * 
 * @route GET /api/tradeforce/roundTable?asset=SOL
 */
export async function GET(request) {
  try {
    // Get asset from query params
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset');
    
    // Validate asset parameter
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset parameter is required' },
        { status: 400 }
      );
    }
    
    // Initialize AI if not already initialized
    if (!roundTableAI.isInitialized()) {
      await roundTableAI.initialize();
    }
    
    // Run RoundTable AI to get consensus
    const result = await roundTableAI.runRoundTable(asset);
    
    // Return the result
    return NextResponse.json({
      success: true,
      asset,
      consensus: {
        signal: result.consensusSignal,
        confidence: result.consensusConfidence,
        hasConsensus: result.hasConsensus
      },
      agents: result.agents,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error(`Error in RoundTable API: ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * RoundTable AI API Endpoint - POST method
 * 
 * Allows for more complex queries with request body
 * 
 * @route POST /api/tradeforce/roundTable
 * @body { asset: string, options?: object }
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { asset, options = {} } = body;
    
    // Validate asset parameter
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset parameter is required' },
        { status: 400 }
      );
    }
    
    // Initialize AI if not already initialized
    if (!roundTableAI.isInitialized()) {
      await roundTableAI.initialize();
    }
    
    // Run RoundTable AI to get consensus
    const result = await roundTableAI.runRoundTable(asset);
    
    // Return the result
    return NextResponse.json({
      success: true,
      asset,
      consensus: {
        signal: result.consensusSignal,
        confidence: result.consensusConfidence,
        hasConsensus: result.hasConsensus
      },
      agents: result.agents,
      timestamp: result.timestamp,
      options
    });
  } catch (error) {
    logger.error(`Error in RoundTable API (POST): ${error.message}`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
