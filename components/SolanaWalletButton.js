'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function SolanaWalletButton({ 
  className = '', 
  showBalance = false,
  connection = null,
  onConnect = () => {},
  onDisconnect = () => {}
}) {
  const { 
    publicKey, 
    connected, 
    connecting, 
    disconnect,
    wallet
  } = useWallet();
  
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);

  // Ensure component is mounted before rendering wallet UI
  // This prevents hydration errors with SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch wallet balance when connected
  useEffect(() => {
    if (connected && publicKey && connection) {
      const fetchBalance = async () => {
        try {
          const walletBalance = await connection.getBalance(publicKey);
          setBalance(walletBalance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(0);
        }
      };

      fetchBalance();
      
      // Call onConnect callback
      onConnect(publicKey.toString());
    } else {
      setBalance(0);
    }
  }, [connected, publicKey, connection]);

  // Handle disconnect
  useEffect(() => {
    if (!connected && mounted) {
      onDisconnect();
    }
  }, [connected, mounted, onDisconnect]);

  if (!mounted) return null;

  return (
    <div className={`wallet-adapter-container ${className}`}>
      <WalletMultiButton 
        className="wallet-adapter-button-custom"
        style={{
          backgroundColor: connected ? '#4CAF50' : '#3B82F6',
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          border: 'none',
          color: 'white'
        }}
      />
      
      {connected && showBalance && (
        <div className="wallet-balance ml-2 px-3 py-1 bg-blue-800 rounded-md text-white text-sm">
          {balance.toFixed(4)} SOL
        </div>
      )}
    </div>
  );
}
