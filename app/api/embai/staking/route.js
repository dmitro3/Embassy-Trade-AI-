import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * GET handler for /api/embai/staking
 * Returns the staking information for a wallet
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
    
    // Get the staking information
    const stakingInfo = await embaiManager.getStakingInfo(walletAddress);
    
    return NextResponse.json({
      success: true,
      walletAddress,
      stakes: stakingInfo.stakes || [],
      totalStaked: stakingInfo.totalStaked || 0,
      totalRewards: stakingInfo.totalRewards || 0
    });
  } catch (error) {
    console.error('Error getting staking information:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get staking information. Please try again later.' 
      },
      { status: 500 }
    );
  }
}