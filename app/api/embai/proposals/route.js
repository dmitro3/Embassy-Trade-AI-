import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import EMBAITokenManager from '../../../../lib/embaiToken';

/**
 * GET handler for /api/embai/proposals
 * Returns all governance proposals
 */
export async function GET() {
  try {
    // Initialize the Solana connection for devnet
    const connection = new Connection(
      process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com', 
      'confirmed'
    );
    
    // Initialize the EMBAI token manager
    const embaiManager = new EMBAITokenManager(connection);
    
    // Get all proposals
    const proposalsData = await embaiManager.getProposals();
    
    return NextResponse.json({
      success: true,
      proposals: proposalsData.proposals || []
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch governance proposals. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for /api/embai/proposals
 * Creates a new governance proposal
 * Body: {wallet: string, title: string, description: string, options: string[]}
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { wallet: walletAddress, title, description, options } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet address is required' 
        },
        { status: 400 }
      );
    }
    
    if (!title || !title.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Proposal title is required' 
        },
        { status: 400 }
      );
    }
    
    if (!description || !description.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Proposal description is required' 
        },
        { status: 400 }
      );
    }
    
    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least 2 voting options are required' 
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
    
    // Create the proposal
    const result = await embaiManager.createProposal(walletAddress, title, description, options);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create proposal'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      proposalId: result.proposalId,
      proposal: result.proposal
    });
  } catch (error) {
    console.error('Error creating proposal:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create governance proposal. Please try again later.' 
      },
      { status: 500 }
    );
  }
}