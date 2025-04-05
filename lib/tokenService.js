'use client';

import { useEffect, useState, useRef } from 'react';
import { EMB_TOKEN_CONFIG, getStandardRpcEndpoint } from './embToken';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Token Service - Manages all EMB token operations
 * Handles token burns, staking, swapping, and wallet connections
 */
export const useTokenService = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  // WebSocket ref for persistent connection
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Connection to Solana using standard endpoints
  const getConnection = () => {
    // Use the standard RPC endpoint that doesn't have the API key in URL
    return new Connection(getStandardRpcEndpoint(EMB_TOKEN_CONFIG.network));
  };

  // Token mint address
  const getTokenMint = () => {
    return new PublicKey(EMB_TOKEN_CONFIG.contract);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = () => {
      if (typeof window === 'undefined' || reconnectAttempts.current >= maxReconnectAttempts) return;
      
      try {
        const wsEndpoint = EMB_TOKEN_CONFIG.wsEndpoints[EMB_TOKEN_CONFIG.network];
        const ws = new WebSocket(wsEndpoint);
        
        ws.onopen = () => {
          console.log('Connected to Shyft WebSocket');
          setIsWebSocketConnected(true);
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
          
          // Send initial connection message
          ws.send(JSON.stringify({
            type: 'token_connect',
            clientId: `emb-token-${Date.now()}`,
            token: EMB_TOKEN_CONFIG.contract
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Handle real-time token updates if needed
            if (data.type === 'token_update' && data.token === EMB_TOKEN_CONFIG.contract) {
              // Update token data if needed
              console.log('Token update received:', data);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsWebSocketConnected(false);
        };
        
        ws.onclose = () => {
          console.log('Disconnected from Shyft WebSocket');
          setIsWebSocketConnected(false);
          
          // Attempt reconnection with exponential backoff
          reconnectAttempts.current += 1;
          const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          setTimeout(() => {
            if (reconnectAttempts.current < maxReconnectAttempts) {
              console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
              initWebSocket();
            }
          }, backoff);
        };
        
        wsRef.current = ws;
      } catch (error) {
        console.error('Error initializing WebSocket:', error);
        setIsWebSocketConnected(false);
      }
    };
    
    initWebSocket();
    
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connection check on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if Phantom wallet is already connected
        if (window?.solana?.isPhantom) {
          const resp = await window.solana.connect({ onlyIfTrusted: true });
          handleConnectionSuccess(resp);
        }
      } catch (err) {
        // Silent failure if user hasn't connected before
        console.log("Not connected to wallet yet");
      }
    };

    if (typeof window !== 'undefined') {
      checkConnection();
    }
  }, []);

  // Handle successful connection
  const handleConnectionSuccess = (resp) => {
    console.log("Wallet connected successfully:", resp.publicKey.toString());
    setPublicKey(resp.publicKey.toString());
    
    // Set the appropriate provider based on which wallet connected
    if (window.solana?.isPhantom && resp.publicKey.equals(window.solana.publicKey)) {
      setProvider(window.solana);
    } else if (window.solflare && resp.publicKey.equals(window.solflare.publicKey)) {
      setProvider(window.solflare);
    } else {
      // Fallback to whatever was used to connect
      setProvider(window.solana || window.solflare);
    }
    
    setWalletConnected(true);
    fetchTokenBalance(resp.publicKey.toString());
  };

  // Connect to wallet
  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check for any injected wallet adapter
      const walletAdapters = [
        window?.solana, // Phantom
        window?.solflare // Solflare
      ];
      
      const availableWallet = walletAdapters.find(adapter => adapter);
      
      if (!availableWallet) {
        // No wallet found - show a more helpful error
        const installUrl = 'https://phantom.app/download';
        const errorMsg = "No compatible wallet found. Please install Phantom wallet.";
        console.error(errorMsg);
        setError({
          message: errorMsg,
          type: 'WALLET_NOT_FOUND',
          installUrl
        });
        return false;
      }
      
      console.log("Connecting to wallet...", availableWallet);
      
      // Trying to connect to the wallet
      let resp;
      try {
        resp = await availableWallet.connect();
      } catch (connectionErr) {
        // Specific error for user rejection to distinguish from technical errors
        if (connectionErr.code === 4001 || connectionErr.message?.includes('User rejected')) {
          throw {
            message: "Connection rejected by user. Please approve the connection request in your wallet.",
            type: 'USER_REJECTED',
            originalError: connectionErr
          };
        }
        throw connectionErr;
      }
      
      if (!resp || !resp.publicKey) {
        throw new Error("Wallet connection failed. No public key returned.");
      }
      
      handleConnectionSuccess(resp);
      return true;
    } catch (err) {
      // Enhanced error logging
      const errorMessage = err.message || "Unknown wallet connection error";
      const errorObj = {
        message: errorMessage,
        code: err.code,
        type: err.type || 'CONNECTION_ERROR',
        walletType: window.solana?.isPhantom ? 'Phantom' : 
                   window.solflare ? 'Solflare' : 'Unknown',
      };
      
      console.error("Error connecting to wallet:", errorObj);
      setError(errorObj);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from wallet
  const disconnectWallet = async () => {
    try {
      if (provider) {
        console.log("Disconnecting wallet...");
        await provider.disconnect();
      }
      setWalletConnected(false);
      setPublicKey(null);
      setProvider(null);
      setBalance(0);
    } catch (err) {
      console.error("Error disconnecting from wallet:", err);
      setError({
        message: err.message || "Error disconnecting from wallet",
        type: 'DISCONNECT_ERROR'
      });
    }
  };

  // Fetch token balance
  const fetchTokenBalance = async (address) => {
    setIsLoading(true);
    try {
      // Use Shyft API to get token balance
      const response = await fetch(
        `https://api.shyft.to/sol/v1/wallet/token_balance?network=${EMB_TOKEN_CONFIG.network}&wallet=${address}&token=${EMB_TOKEN_CONFIG.contract}`, 
        {
          headers: {
            'x-api-key': EMB_TOKEN_CONFIG.apiKey
          }
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setBalance(parseFloat(data.result.balance));
      } else {
        // If no token balance found, it might mean user doesn't have token account yet
        setBalance(0);
      }
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setError("Failed to fetch token balance");
      // Fallback to 0 balance
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Get token account address
  const getTokenAccount = async (walletAddress) => {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const tokenMint = getTokenMint();
      return await getAssociatedTokenAddress(tokenMint, walletPubkey);
    } catch (err) {
      console.error("Error getting token account:", err);
      throw err;
    }
  };

  // Burn tokens - used for premium features
  const burnTokens = async (amount) => {
    if (!walletConnected) {
      setError("Please connect wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    
    if (balance < amount) {
      setError(`Insufficient balance. You need ${amount} EMB tokens.`);
      return { success: false, error: "Insufficient balance" };
    }

    setIsLoading(true);
    try {
      const connection = getConnection();
      const walletPubkey = new PublicKey(publicKey);
      const tokenMint = getTokenMint();
      const tokenAccount = await getTokenAccount(publicKey);
      
      // Create burning instruction
      const burnInstruction = createBurnInstruction(
        tokenAccount,
        tokenMint,
        walletPubkey,
        amount * (10 ** EMB_TOKEN_CONFIG.decimals)
      );
      
      // Create transaction and add burn instruction
      const transaction = new Transaction().add(burnInstruction);
      transaction.feePayer = walletPubkey;
      
      // Get recent blockhash
      const blockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash.blockhash;
      
      // Sign and send transaction
      const signedTransaction = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction({
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight
      });
      
      // Log burn event to WebSocket if connected
      if (wsRef.current && isWebSocketConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'token_burn',
          token: EMB_TOKEN_CONFIG.contract,
          amount: amount,
          wallet: publicKey,
          txId: signature
        }));
      }
      
      // Update local balance
      const newBalance = balance - amount;
      setBalance(newBalance);
      
      return { 
        success: true, 
        txId: signature,
        newBalance
      };
    } catch (err) {
      console.error("Error burning tokens:", err);
      setError("Failed to burn tokens: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Stake tokens - used for earning rewards
  const stakeTokens = async (amount, period = '30d') => {
    if (!walletConnected) {
      setError("Please connect wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    
    if (balance < amount) {
      setError(`Insufficient balance. You need ${amount} EMB tokens.`);
      return { success: false, error: "Insufficient balance" };
    }

    setIsLoading(true);
    try {
      const connection = getConnection();
      const walletPubkey = new PublicKey(publicKey);
      
      // For a real implementation, this would connect to a staking program
      // This example assumes a staking program exists and is available through Shyft API
      
      // Example call to Shyft API for staking (placeholder implementation)
      const response = await fetch(
        `https://api.shyft.to/sol/v1/token/stake`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': EMB_TOKEN_CONFIG.apiKey
          },
          body: JSON.stringify({
            network: EMB_TOKEN_CONFIG.network,
            wallet: publicKey,
            token_mint: EMB_TOKEN_CONFIG.contract,
            amount: amount * (10 ** EMB_TOKEN_CONFIG.decimals),
            period: period
          })
        }
      );
      
      // Log staking event to WebSocket if connected
      if (wsRef.current && isWebSocketConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'token_stake',
          token: EMB_TOKEN_CONFIG.contract,
          amount: amount,
          period: period,
          wallet: publicKey
        }));
      }
      
      // For now, simulate successful staking
      const newBalance = balance - amount;
      setBalance(newBalance);
      
      return { 
        success: true, 
        txId: `stake-tx-${Date.now()}`,
        newBalance,
        stakedAmount: amount,
        period: period,
        estimatedRewards: calculateStakingRewards(amount, period)
      };
    } catch (err) {
      console.error("Error staking tokens:", err);
      setError("Failed to stake tokens: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate estimated staking rewards
  const calculateStakingRewards = (amount, period) => {
    // Simple rewards calculation based on period
    const periodsMap = {
      '7d': 0.01, // 1% for 7 days
      '30d': 0.05, // 5% for 30 days
      '90d': 0.18, // 18% for 90 days
      '365d': 0.80, // 80% for 365 days
    };
    
    const rate = periodsMap[period] || 0.05;
    return amount * rate;
  };

  // Swap tokens using Jupiter API - SOL to EMB or EMB to SOL
  const swapTokens = async (fromToken, toToken, amount) => {
    if (!walletConnected) {
      setError("Please connect wallet first");
      return { success: false, error: "Wallet not connected" };
    }

    setIsLoading(true);
    try {
      // Determine the tokens
      const inputToken = fromToken.toLowerCase() === 'sol' ? 'So11111111111111111111111111111111111111112' : EMB_TOKEN_CONFIG.contract;
      const outputToken = toToken.toLowerCase() === 'sol' ? 'So11111111111111111111111111111111111111112' : EMB_TOKEN_CONFIG.contract;
      
      // Calculate the input amount with correct decimals
      const inputDecimals = fromToken.toLowerCase() === 'sol' ? 9 : EMB_TOKEN_CONFIG.decimals;
      const inputAmount = amount * Math.pow(10, inputDecimals);
      
      // Step 1: Get quote from Jupiter API
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputToken}&outputMint=${outputToken}&amount=${inputAmount}&slippageBps=50&onlyDirectRoutes=false`
      );
      
      const quoteData = await quoteResponse.json();
      
      if (!quoteData.data) {
        throw new Error('Failed to fetch swap quote from Jupiter');
      }
      
      // Step 2: Get the serialized transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: publicKey,
          wrapAndUnwrapSol: true
        })
      });
      
      const swapData = await swapResponse.json();
      
      if (!swapData.swapTransaction) {
        throw new Error('Failed to create swap transaction');
      }
      
      // Step 3: Deserialize and sign the transaction
      const connection = getConnection();
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = Transaction.from(swapTransactionBuf);
      
      // Sign the transaction
      const signedTransaction = await provider.signTransaction(transaction);
      
      // Step 4: Send and confirm the transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Calculate the expected receive amount from the quote
      const outAmount = quoteData.data.outAmount / Math.pow(10, toToken.toLowerCase() === 'sol' ? 9 : EMB_TOKEN_CONFIG.decimals);
      
      // Log swap event to WebSocket if connected
      if (wsRef.current && isWebSocketConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'token_swap',
          fromToken: fromToken,
          toToken: toToken,
          fromAmount: amount,
          toAmount: outAmount,
          wallet: publicKey,
          txId: signature
        }));
      }
      
      // Update balance if user received EMB tokens
      if (toToken.toLowerCase() === 'emb') {
        const newBalance = balance + outAmount;
        setBalance(newBalance);
        
        return {
          success: true,
          txId: signature,
          fromToken,
          toToken,
          fromAmount: amount,
          receivedAmount: outAmount,
          newBalance
        };
      } else if (fromToken.toLowerCase() === 'emb') {
        // If user sent EMB tokens
        const newBalance = balance - amount;
        setBalance(newBalance);
        
        return {
          success: true,
          txId: signature,
          fromToken,
          toToken,
          fromAmount: amount,
          receivedAmount: outAmount,
          newBalance
        };
      }
      
      return {
        success: true,
        txId: signature,
        fromToken,
        toToken,
        fromAmount: amount,
        receivedAmount: outAmount
      };
    } catch (err) {
      console.error("Error swapping tokens:", err);
      setError("Failed to swap tokens: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
      // Re-fetch balance after swap to ensure it's up to date
      if (publicKey) {
        fetchTokenBalance(publicKey);
      }
    }
  };

  // Buy EMB tokens directly from pump.fun
  const buyTokens = () => {
    if (typeof window !== 'undefined') {
      window.open(EMB_TOKEN_CONFIG.links.pump, '_blank');
    }
  };
  
  // Transfer EMB tokens to another wallet
  const transferTokens = async (recipientAddress, amount) => {
    if (!walletConnected) {
      setError("Please connect wallet first");
      return { success: false, error: "Wallet not connected" };
    }
    
    if (balance < amount) {
      setError(`Insufficient balance. You need ${amount} EMB tokens.`);
      return { success: false, error: "Insufficient balance" };
    }
    
    setIsLoading(true);
    try {
      const connection = getConnection();
      const walletPubkey = new PublicKey(publicKey);
      const tokenMint = getTokenMint();
      
      // Get sender's token account
      const senderTokenAccount = await getTokenAccount(publicKey);
      
      // Get or create recipient's token account
      const recipientPubkey = new PublicKey(recipientAddress);
      const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPubkey);
      
      // Create transfer instruction
      const { createTransferInstruction } = await import('@solana/spl-token');
      const transferInstruction = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        walletPubkey,
        amount * (10 ** EMB_TOKEN_CONFIG.decimals)
      );
      
      // Create and submit transaction
      const transaction = new Transaction().add(transferInstruction);
      transaction.feePayer = walletPubkey;
      
      const blockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash.blockhash;
      
      const signedTransaction = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      await connection.confirmTransaction({
        signature,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight
      });
      
      // Log transfer event to WebSocket if connected
      if (wsRef.current && isWebSocketConnected) {
        wsRef.current.send(JSON.stringify({
          type: 'token_transfer',
          token: EMB_TOKEN_CONFIG.contract,
          amount: amount,
          from: publicKey,
          to: recipientAddress,
          txId: signature
        }));
      }
      
      // Update local balance
      const newBalance = balance - amount;
      setBalance(newBalance);
      
      return {
        success: true,
        txId: signature,
        newBalance,
        recipient: recipientAddress,
        amount: amount
      };
    } catch (err) {
      console.error("Error transferring tokens:", err);
      setError("Failed to transfer tokens: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    walletConnected,
    publicKey,
    balance,
    isLoading,
    error,
    isWebSocketConnected,
    connectWallet,
    disconnectWallet,
    burnTokens,
    stakeTokens,
    swapTokens,
    buyTokens,
    fetchTokenBalance,
    transferTokens
  };
};

export default useTokenService;