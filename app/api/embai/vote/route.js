import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * POST handler for /api/embai/vote
 * Records a vote on a governance proposal
 * Body: {wallet: string, proposalId: string, option: string}
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { wallet: walletAddress, proposalId, option } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }
    
    if (!proposalId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Proposal ID is required' 
        },
        { status: 400 }
      );
    }
    
    if (!option) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Voting option is required' 
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
    
    // Record the vote
    const result = await embaiManager.voteOnProposal(walletAddress, proposalId, option);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to vote on proposal'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      proposalId: result.proposalId,
      votedOption: result.votedOption,
      votingPower: result.votingPower
    });
  } catch (error) {
    console.error('Error voting on proposal:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to vote on proposal. Please try again later.' 
      },
      { status: 500 }
    );
  }
}