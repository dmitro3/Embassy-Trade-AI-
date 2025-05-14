'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Web3 Error Handler Component
 * 
 * Specialized component for handling and displaying common Web3 and blockchain errors
 * such as wallet connection issues, transaction failures, and network errors
 */
const Web3ErrorHandler = () => {
  // Store error state
  const [lastError, setLastError] = useState(null);
  
  useEffect(() => {
    // Common error messages and their user-friendly explanations
    const errorMap = {
      // Wallet connection errors
      'User rejected the request': {
        friendly: 'Connection to your wallet was rejected. Please try again to use the application.',
        severity: 'warning',
        actionable: true,
        action: 'Try Again'
      },
      'wallet_requestPermissions rejected': {
        friendly: 'Wallet permission request was denied. Please approve the connection to use the application.',
        severity: 'warning',
        actionable: true,
        action: 'Try Again'
      },
      'The provider is disconnected from all chains': {
        friendly: 'Your wallet is disconnected from the blockchain. Please check your internet connection.',
        severity: 'error',
        actionable: false
      },
      'Chain ID switched': {
        friendly: 'Blockchain network changed. Please ensure you are connected to Solana Devnet for testing.',
        severity: 'info',
        actionable: true,
        action: 'Switch to Devnet'
      },
      
      // Transaction errors
      'insufficient funds': {
        friendly: 'Insufficient funds for this transaction. Please ensure you have enough SOL in your wallet.',
        severity: 'error',
        actionable: true,
        action: 'Request Airdrop'
      },
      'Transaction failed': {
        friendly: 'Transaction failed to execute. This might be due to network congestion or invalid parameters.',
        severity: 'error',
        actionable: true,
        action: 'View Details'
      },
      'Transaction rejected': {
        friendly: 'You rejected the transaction in your wallet. You can try again if you want to proceed.',
        severity: 'warning',
        actionable: true,
        action: 'Try Again'
      },
      
      // Network errors
      'Failed to fetch': {
        friendly: 'Network connection issue. Please check your internet connection and try again.',
        severity: 'error',
        actionable: false
      },
      'timeout': {
        friendly: 'The operation timed out. The network might be congested or unavailable.',
        severity: 'error',
        actionable: true,
        action: 'Retry'
      },
      
      // RPC errors
      '429 Too Many Requests': {
        friendly: 'Rate limit exceeded. Please wait a moment before trying again.',
        severity: 'warning',
        actionable: true,
        action: 'Try Again Later'
      },
      '503 Service Unavailable': {
        friendly: 'The blockchain RPC service is currently unavailable. Please try again later.',
        severity: 'error',
        actionable: false
      }
    };

    // Custom handler for Web3 errors
    const handleWeb3Error = (error) => {
      console.error('Web3 Error:', error);
      
      // Set the last error
      setLastError(error);

      // Try to find a matching error in our map
      const errorMessage = error.message || error.toString();
      let matchedError = null;
      
      // Find the first matching error key
      for (const key in errorMap) {
        if (errorMessage.includes(key)) {
          matchedError = errorMap[key];
          break;
        }
      }
      
      // Display appropriate toast notification
      if (matchedError) {
        switch (matchedError.severity) {
          case 'error':
            toast.error(matchedError.friendly, { 
              position: "top-center",
              autoClose: false,
              closeOnClick: true,
              pauseOnHover: true
            });
            break;
          case 'warning':
            toast.warning(matchedError.friendly, {
              position: "top-center",
              autoClose: 5000,
              closeOnClick: true
            });
            break;
          case 'info':
            toast.info(matchedError.friendly, {
              position: "top-center",
              autoClose: 5000
            });
            break;
          default:
            toast.error(errorMessage, {
              position: "top-center",
              autoClose: 5000
            });
        }
        
        // Log error to our API
        logWeb3ErrorToServer(error, matchedError);
      } else {
        // Generic error handling for unrecognized errors
        toast.error(`Blockchain error: ${errorMessage.slice(0, 100)}${errorMessage.length > 100 ? '...' : ''}`, {
          position: "top-center",
          autoClose: 5000
        });
        
        // Log unrecognized error
        logWeb3ErrorToServer(error, null);
      }
    };

    // Function to log Web3 errors to server
    const logWeb3ErrorToServer = async (error, matchedError) => {
      try {
        await fetch('/api/log-web3-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            error: {
              message: error.message || error.toString(),
              code: error.code,
              data: error.data,
              stack: error.stack
            },
            matchedError: matchedError ? {
              friendly: matchedError.friendly,
              severity: matchedError.severity,
              actionable: matchedError.actionable
            } : null,
            url: window.location.href,
            userAgent: navigator.userAgent
          }),
        });
      } catch (e) {
        console.error('Failed to log Web3 error to server:', e);
      }
    };

    // Listen for Web3 errors (wallet errors)
    window.addEventListener('web3-error', (event) => {
      handleWeb3Error(event.detail);
    });
    
    // Listen for blockchain transaction errors
    window.addEventListener('blockchain-error', (event) => {
      handleWeb3Error(event.detail);
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('web3-error', handleWeb3Error);
      window.removeEventListener('blockchain-error', handleWeb3Error);
    };
  }, []);

  // This component doesn't render anything visually
  return null;
};

export default Web3ErrorHandler;
