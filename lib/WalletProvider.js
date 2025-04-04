"use client";

import { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

// Primary RPC endpoint with API key
const PRIMARY_RPC_URL = 'https://devnet-rpc.shyft.to?api_key=oRVaHOZ1n2McZ0BW';

// Fallback RPC endpoints
const FALLBACK_RPC_URLS = [
  clusterApiUrl('devnet'),
  'https://api.devnet.solana.com',
  'https://solana-devnet-rpc.allthatnode.com'
];

export function WalletProvider({ children }) {
  const [rpcEndpoint, setRpcEndpoint] = useState(PRIMARY_RPC_URL);
  const [connectionError, setConnectionError] = useState(null);

  // Include wallet adapters that are available in your package
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );

  // Try to ping the RPC endpoint and switch to fallback if needed
  useEffect(() => {
    const checkRpcConnection = async () => {
      try {
        const response = await fetch(rpcEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth',
          }),
        });
        
        if (!response.ok) {
          throw new Error(`RPC endpoint returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
          console.warn('RPC health check error:', data.error);
          switchToFallbackRpc();
        }
      } catch (error) {
        console.error('Failed to connect to primary RPC:', error);
        switchToFallbackRpc();
      }
    };

    const switchToFallbackRpc = () => {
      // Find a fallback that isn't the current one
      const nextRpc = FALLBACK_RPC_URLS.find(url => url !== rpcEndpoint);
      if (nextRpc) {
        console.log(`Switching to fallback RPC: ${nextRpc}`);
        setRpcEndpoint(nextRpc);
      }
    };

    checkRpcConnection();
  }, [rpcEndpoint]);

  // Error handling for wallet connection
  const onError = (error) => {
    console.error("Wallet connection error:", error);
    setConnectionError(error);
    
    // You could implement additional error handling here
    // like showing a notification or attempting reconnection
  };

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={onError}
      >
        <WalletModalProvider>
          {connectionError && (
            <div className="wallet-error-message bg-red-700/80 text-white p-2 text-sm rounded-md m-2">
              Wallet connection error. Please try refreshing the page or using a different wallet.
            </div>
          )}
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export { useWallet } from '@solana/wallet-adapter-react';