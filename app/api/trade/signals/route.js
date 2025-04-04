import { NextResponse } from 'next/server';
import photonClient from '../../../../server/utils/photon';

/**
 * GET handler for /api/trade/signals
 * Returns recent trade signals including whale watching data
 */
export async function GET() {
  try {
    // Get signals from the Photon client
    const signals = photonClient.getRecentSignals();
    
    // Return the signals with success status
    return NextResponse.json({ 
      success: true, 
      signals 
    });
  } catch (error) {
    console.error('Error fetching trade signals:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trade signals. Please try again later.' 
      },
      { status: 500 }
    );
  }
}