import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * POST handler for /api/embai/burn
 * Burns EMBAI tokens
 * Body: {wallet: string, amount: number}
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { wallet: walletAddress, amount } = body;
    
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
    
    // Burn the tokens
    const burnResult = await embaiManager.burn(privateKey, amount);
    
    if (!burnResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: burnResult.error || 'Failed to burn tokens'
        },
        { status: 400 }
      );
    }
    
    // Update burn statistics in database
    // This would be implemented with a proper database in production
    // For now, we'll just return the result
    
    return NextResponse.json({
      success: true,
      burnedAmount: burnResult.burnedAmount,
      totalBurned: burnResult.totalBurned
    });
  } catch (error) {
    console.error('Error burning EMBAI tokens:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to burn EMBAI tokens. Please try again later.' 
      },
      { status: 500 }
    );
  }
}