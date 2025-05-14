import { NextResponse } from 'next/server';
import photonClient from '../../../../server/utils/photon.js';

/**
 * API endpoint to securely connect a wallet to Photon
 * This keeps private keys secure on the server and not exposed to the client
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Connect to Photon using the secure backend client
    const result = await photonClient.connectWallet(walletAddress);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error connecting to Photon:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to connect to Photon' },
      { status: 500 }
    );
  }
}