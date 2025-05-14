// Next.js API route for checking API health

import { NextResponse } from 'next/server';
import apiHealthService from '../../../lib/apiHealthService';

/**
 * API Health Check endpoint
 * 
 * Checks the health of all external APIs used by the application
 * and returns a comprehensive health report
 */
export async function GET(req) {
  try {
    // Get API keys from environment variables with fallbacks
    const shyftApiKey = process.env.NEXT_PUBLIC_SHYFT_API_KEY || 'whv00T87G8Sd8TeK';
    const birdeyeApiKey = process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db';
    
    // Run health checks on all APIs
    const healthResults = await apiHealthService.checkAllApiHealth(shyftApiKey, birdeyeApiKey);
    
    // Get health statistics
    const healthStats = apiHealthService.getHealthStats();
    
    // Prepare response with health status and statistics
    return NextResponse.json({
      success: true,
      allHealthy: healthResults.allHealthy,
      timestamp: new Date().toISOString(),
      apis: healthResults.apis,
      stats: healthStats
    });
  } catch (error) {
    console.error('Error checking API health:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
