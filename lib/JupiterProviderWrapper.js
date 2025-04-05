"use client";

import React from 'react';
import { JupiterProvider } from '@jup-ag/react-hook';
import { Connection } from '@solana/web3.js';

// Default cluster to use Solana devnet (you can change to mainnet-beta if needed)
const CLUSTER = 'devnet';
const CONNECTION_CONFIG = { commitment: 'confirmed' };

// Create a connection to Solana
const getConnectionFromCluster = (cluster) => {
  let endpoint;
  
  switch (cluster) {
    case 'mainnet-beta':
      endpoint = 'https://api.mainnet-beta.solana.com';
      break;
    case 'testnet':
      endpoint = 'https://api.testnet.solana.com';
      break;
    case 'devnet':
    default:
      endpoint = 'https://api.devnet.solana.com';
      break;
  }

  return new Connection(endpoint, CONNECTION_CONFIG);
};

export function JupiterProviderWrapper({ children, cluster = CLUSTER }) {
  // Get connection based on cluster
  const connection = React.useMemo(() => getConnectionFromCluster(cluster), [cluster]);

  return (
    <JupiterProvider
      connection={connection}
      cluster={cluster}
      userPublicKey={null} // This will be taken from Wallet Adapter
    >
      {children}
    </JupiterProvider>
  );
}