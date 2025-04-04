// app/api/photon/route.js
import { NextResponse } from 'next/server';
const photonClient = require('@/server/utils/photon');

// Handle API requests to Photon
export async function POST(request) {
  try {
    const data = await request.json();
    const { action, params } = data;
    
    let response;
    
    switch (action) {
      case 'getMarketData':
        response = await photonClient.getMarketData(params.symbol);
        break;
        
      case 'placeTrade':
        response = await photonClient.placeTrade(params);
        break;
        
      case 'getUserTrades':
        response = await photonClient.getUserTrades(params.userId);
        break;
        
      case 'connectWallet':
        response = await photonClient.connectWallet(params.walletAddress, params.signature);
        break;
        
      case 'handleAITradeSignal':
        response = await photonClient.handleAITradeSignal(params);
        break;
        
      case 'getWhaleActivity':
        response = await photonClient.getWhaleActivity();
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Photon API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for simpler operations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'getWhaleActivity') {
      const response = await photonClient.getWhaleActivity();
      return NextResponse.json({ success: true, data: response });
    }
    
    return NextResponse.json(
      { error: `Invalid GET action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Photon API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}