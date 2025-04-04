import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * GET handler for /api/embai/balance
 * Returns the EMBAI token balance for a wallet
 * Query params: wallet (required) - The Solana wallet address to check
 */
export async function GET(request) {
  try {
    // Get the wallet address from query params
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }
    
    // Validate the wallet address
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid wallet address' 
        },
        { status: 400 }
      );
    }
    
    // Initialize the Solana connection for devnet
    const connection = new Connection(
      process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com', 
      'confirmed'
    );
    
    // Initialize the EMBAI token manager
    const embaiManager = new EMBAITokenManager(connection);
    
    // Get the wallet balance
    const balance = await embaiManager.getBalance(walletAddress);
    
    return NextResponse.json({
      success: true,
      walletAddress,
      balance
    });
  } catch (error) {
    console.error('Error getting EMBAI balance:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get EMBAI balance. Please try again later.' 
      },
      { status: 500 }
    );
  }
}