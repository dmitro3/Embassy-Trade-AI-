'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TorusWalletAdapter,
  AvanaWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
// Import our improved token patch function
import applySplTokenPatch from './splTokenPatch.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Custom context for additional wallet functionality
const WalletContext = createContext({});

/**
 * Wallet provider component that wraps the Solana wallet adapter
 * and provides additional functionality
 */
export function WalletProvider({ children }) {
  // Apply our proper token patch to prevent unpackAccount errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Apply the SPL token patch
      applySplTokenPatch();
      
      // Add global error handler for token account errors
      window.addEventListener('error', (event) => {
        if (event.error && event.error.message && 
            (event.error.message.includes('unpackAccount') || 
             event.error.message.includes('TokenAccountNotFoundError'))) {
          console.error('Token account error caught by global handler:', event.error);
          console.log('Error details:', {
            message: event.error.message,
            stack: event.error.stack,
            name: event.error.name
          });
          // Prevent the error from crashing the app
          event.preventDefault();
        }
      });
      
      // Add unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && 
            (event.reason.message.includes('unpackAccount') || 
             event.reason.message.includes('TokenAccountNotFoundError'))) {
          console.error('Token account promise rejection caught:', event.reason);
          console.log('Rejection details:', {
            message: event.reason.message,
            stack: event.reason.stack,
            name: event.reason.name
          });
          // Prevent the rejection from crashing the app
          event.preventDefault();
        }
      });
      
      console.log('Global error handlers for token accounts installed');
    }
  }, []);
  
  // You can set this to 'mainnet-beta', 'testnet', or 'devnet'
  const network = WalletAdapterNetwork.Devnet;
  const [mounted, setMounted] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // The endpoint will be used to connect to Solana network
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Factory for generating supported wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new AvanaWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TorusWalletAdapter()
    ],
    []
  );

  // Handle component initialization
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Detect available wallets after component mount
  useEffect(() => {
    if (mounted && !hasInitialized) {
      const detectWallets = async () => {
        const available = [];
        
        for (const wallet of wallets) {
          try {
            if (wallet.readyState !== 'Unsupported') {
              available.push(wallet);
            }
          } catch (error) {
            console.error(`Error detecting wallet ${wallet.name}:`, error);
          }
        }
        
        setAvailableWallets(available);
        setHasInitialized(true);
      };
      
      detectWallets();
    }
  }, [mounted, hasInitialized, wallets]);

  // Custom wallet hook context value
  const contextValue = useMemo(() => ({
    openWalletModal: () => setWalletModalOpen(true),
    closeWalletModal: () => setWalletModalOpen(false),
    isWalletModalOpen: walletModalOpen,
    availableWallets,
    network
  }), [walletModalOpen, availableWallets, network]);

  // Fix for hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContext.Provider value={contextValue}>
            {children}
          </WalletContext.Provider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

// Custom hook to use wallet functionality
export function useWallet() {
  try {
    // Get wallet adapter from Solana contexts
    const solanaWallet = useSolanaWallet();
    
    // Get our custom context
    const customContext = useContext(WalletContext);
    
    // Merge both contexts for comprehensive wallet functionality
    return { ...solanaWallet, ...customContext };
  } catch (error) {
    console.error("Error accessing wallet context:", error);
    // Return a default wallet state if the context is not available
    return {
      publicKey: null,
      wallet: null,
      wallets: [],
      connected: false,
      connecting: false,
      disconnecting: false,
      select: () => {},
      connect: async () => {},
      disconnect: async () => {},
      sendTransaction: async () => {},
      signTransaction: async () => {},
      signAllTransactions: async () => {},
      signMessage: async () => {}
    };
  }
}

// Safe version of WalletMultiButton that checks for context availability
const SafeWalletMultiButton = (props) => {
  try {
    return <WalletMultiButton {...props} />;
  } catch (error) {
    console.error("Error rendering WalletMultiButton:", error);
    // Fallback button that does nothing but doesn't crash
    return (
      <button 
        className={`wallet-adapter-button ${props.className || ''}`}
        onClick={() => console.log("Wallet context not available")}
      >
        <span className="wallet-adapter-button-start-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 7L12 13L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="wallet-adapter-button-text">Connect Wallet</span>
      </button>
    );
  }
};

// Custom wallet connection button component
export function WalletConnectionButton({ 
  className = '', 
  showText = true,
  variant = 'primary',
  onClick = null
}) {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#00FFA3] to-[#9945FF] text-gray-900 font-medium hover:opacity-90',
    secondary: 'bg-gray-800/80 text-white hover:bg-gray-700/80 border border-gray-700/50',
    ghost: 'bg-transparent hover:bg-gray-800/50 border border-[#9945FF]/30 text-[#9945FF]',
    success: 'bg-[#00FFA3]/90 hover:bg-[#00FFA3] text-gray-900 font-medium'
  };
  
  // Get the style for the current variant
  const variantClass = variantClasses[variant] || variantClasses.primary;
  
  // Custom click handler if provided
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };
  
  // Safely access wallet context
  let connected = false;
  try {
    const { connected: isConnected } = useWallet();
    connected = isConnected;
  } catch (error) {
    console.error("Error accessing wallet connection state:", error);
  }
  
  // Apply custom styles to override wallet adapter default styling
  const customStyles = `
    .wallet-adapter-button.custom-wallet-button {
      transition: all 0.2s ease;
      transform: scale(1);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      height: auto;
      justify-content: center;
    }
    
    .wallet-adapter-button.custom-wallet-button:hover {
      transform: scale(1.03);
    }
    
    .wallet-adapter-button.custom-wallet-button .wallet-adapter-button-start-icon {
      margin-right: 0.5rem;
      width: 1.25rem;
      height: 1.25rem;
    }
    
    .wallet-adapter-button.custom-wallet-button.connected {
      background: linear-gradient(to right, rgba(153, 69, 255, 0.2), rgba(153, 69, 255, 0.4));
      color: white;
      border: 1px solid rgba(153, 69, 255, 0.4);
    }
  `;
  
  return (
    <>
      <style jsx global>{customStyles}</style>
      <SafeWalletMultiButton
        className={`wallet-adapter-button custom-wallet-button ${variantClass} ${connected ? 'connected' : ''} ${className}`}
        onClick={handleClick}
      >
        {showText ? null : <span className="sr-only">Connect Wallet</span>}
      </SafeWalletMultiButton>
    </>
  );
}

// Wrapper component that is exported as default for dynamic imports
const WalletProviderWrapper = ({ children }) => {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
};

export default WalletProviderWrapper;
