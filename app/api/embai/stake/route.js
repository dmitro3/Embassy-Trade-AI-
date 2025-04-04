import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';
import bs58 from 'bs58';

/**
 * POST handler for /api/embai/stake
 * Stakes EMBAI tokens for a wallet
 * Body: {wallet: string, amount: number, days: number}
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { wallet: walletAddress, amount, days } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid amount is required' 
        },
        { status: 400 }
      );
    }
    
    if (!days || isNaN(days) || days <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid staking period in days is required' 
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
    
    // Stake the tokens
    const stakeResult = await embaiManager.stake(walletAddress, privateKey, amount, days);
    
    if (!stakeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: stakeResult.error || 'Failed to stake tokens'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      stakingId: stakeResult.stakingId,
      amount: stakeResult.amount,
      unlockDate: stakeResult.unlockDate,
      estimatedReward: stakeResult.estimatedReward
    });
  } catch (error) {
    console.error('Error staking EMBAI tokens:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to stake EMBAI tokens. Please try again later.' 
      },
      { status: 500 }
    );
  }
}