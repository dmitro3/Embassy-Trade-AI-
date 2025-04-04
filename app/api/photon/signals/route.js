import { NextResponse } from 'next/server';
const photonClient = require('../../../../server/utils/photon');

/**
 * API endpoint to fetch AI-powered trading signals from AIXBT and @mobyagent
 * This keeps private keys and API access secure on the server
 */
export async function GET(request) {
  try {
    // Get AI signals through the secure Photon client
    const signals = await photonClient.getAISignals();
    
    return NextResponse.json({
      success: true,
      signals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching trading signals:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch trading signals' },
      { status: 500 }
    );
  }
}