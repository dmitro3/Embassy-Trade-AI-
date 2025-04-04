import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * POST handler for /api/embai/unstake
 * Unstakes EMBAI tokens and claims rewards
 * Body: {wallet: string, stakingId: string}
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { wallet: walletAddress, stakingId } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }
    
    if (!stakingId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Staking ID is required' 
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
    
    // For demonstration purposes, we'll use a simulated private key
    // In a real application, the user would sign the transaction on the client side
    // NEVER handle private keys on the server in a production environment
    
    // Using SPL_PRIVATE_KEY from .env for demonstration only
    // In production: handle signature on client side
    const privateKey = process.env.SPL_PRIVATE_KEY || '';
    
    if (!privateKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Missing private key'
        },
        { status: 500 }
      );
    }
    
    // Unstake the tokens
    const unstakeResult = await embaiManager.unstake(walletAddress, privateKey, stakingId);
    
    if (!unstakeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: unstakeResult.error || 'Failed to unstake tokens'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      unstakedAmount: unstakeResult.unstakedAmount,
      rewards: unstakeResult.rewards,
      total: unstakeResult.total
    });
  } catch (error) {
    console.error('Error unstaking EMBAI tokens:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to unstake EMBAI tokens. Please try again later.' 
      },
      { status: 500 }
    );
  }
}