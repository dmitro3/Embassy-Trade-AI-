// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\app\api\tradeforce\scan\route.js
import { NextResponse } from 'next/server';
import tradeforceAI from '../../../../lib/tradeforceAI.js';
// Using console for logging instead of logger module

/**
 * POST endpoint to trigger a market scan
 * Scans for trading opportunities based on specified criteria
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { criteria = {} } = body;
    
    // Ensure TradeForce AI is initialized
    if (!tradeforceAI.isInitialized()) {
      await tradeforceAI.init();
    }
    
    // Update scan criteria if provided
    if (Object.keys(criteria).length > 0) {
      // Update only the provided criteria
      Object.entries(criteria).forEach(([key, value]) => {
        if (tradeforceAI.strategyCriteria.hasOwnProperty(key)) {
          tradeforceAI.strategyCriteria[key] = value;
        }
      });
    }
    
    // Trigger market scan
    const scanResults = await tradeforceAI.scanMarket();
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results: scanResults,
      count: scanResults.length
    });  } catch (error) {
    console.error(`Market scan API error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve scan results
 */
export async function GET() {
  try {
    // Ensure TradeForce AI is initialized
    if (!tradeforceAI.isInitialized()) {
      await tradeforceAI.init();
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      lastScanTime: tradeforceAI.lastScanTime ? new Date(tradeforceAI.lastScanTime).toISOString() : null,
      results: tradeforceAI.scanResults,
      count: tradeforceAI.scanResults.length,
      marketState: tradeforceAI.marketState
    });  } catch (error) {
    console.error(`Get market scan API error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
