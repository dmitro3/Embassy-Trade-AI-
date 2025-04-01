// motiaWorkflow.js
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const SOL_TOKEN_ADDRESS = 'So11111111111111111111111111111111111111112'; // SOL mint address
const EMB_TOKEN_ADDRESS = 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump'; // $EMB mint address

// Step 1: Detect installed wallets
const detectWallets = () => {
  const wallets = [];
  if (window.solana?.isPhantom) wallets.push('Phantom');
  if (window.solflare?.isSolflare) wallets.push('Solflare');
  return wallets;
};

// Step 2: Disconnect from wallet
const disconnectWalletStep = async () => {
  try {
    if (window.solana) {
      await window.solana.disconnect();
    }
    return { success: true };
  } catch (err) {
    console.error('Disconnect Wallet Error:', err);
    return { success: false, error: err.message };
  }
};

// Step 3: Connect to wallet
const connectWalletStep = async () => {
  try {
    if (!window.solana) {
      throw new Error('No Solana wallet found. Please install Phantom or Solflare.');
    }
    const response = await window.solana.connect({ onlyIfTrusted: false });
    return {
      success: true,
      walletAddress: response.publicKey.toString(),
    };
  } catch (err) {
    console.error('Connect Wallet Error:', err);
    return { success: false, error: err.message };
  }
};

// Step 4: Fetch SOL and EMB balances
const fetchBalancesStep = async (walletAddress) => {
  if (!walletAddress) {
    return { solBalance: 0, embBalance: 0, error: 'Wallet not connected' };
  }

  try {
    const publicKey = new PublicKey(walletAddress);

    // Fetch SOL balance
    const solBalanceLamports = await connection.getBalance(publicKey);
    const solBalance = solBalanceLamports / 1e9; // Convert lamports to SOL

    // Fetch EMB balance
    const embTokenAccount = await connection.getTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(EMB_TOKEN_ADDRESS),
    });
    let embBalance = 0;
    if (embTokenAccount.value.length > 0) {
      const accountInfo = await connection.getTokenAccountBalance(embTokenAccount.value[0].pubkey);
      embBalance = accountInfo.value.uiAmount || 0;
    }

    return { solBalance, embBalance, success: true };
  } catch (err) {
    console.error('Fetch Balances Error:', err);
    return { solBalance: 0, embBalance: 0, error: err.message };
  }
};

// Step 5: Fetch market data from Jupiter API
const fetchMarketDataStep = async () => {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${SOL_TOKEN_ADDRESS}&outputMint=${EMB_TOKEN_ADDRESS}&amount=100000000`
    );
    const data = await response.json();
    const price = data.data[0].outAmount / 1000000; // Adjust based on token decimals
    return { price, volume: 1000 };
  } catch (err) {
    return { price: 0, volume: 0, error: err.message };
  }
};

// Step 6: Convert SOL to EMB
const convertSolToEmbStep = async (walletAddress, solAmount) => {
  if (!walletAddress) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    const amount = solAmount * 1e9; // Convert SOL to lamports (1 SOL = 1e9 lamports)
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${SOL_TOKEN_ADDRESS}&outputMint=${EMB_TOKEN_ADDRESS}&amount=${amount}&slippageBps=50`
    );
    const quote = await quoteResponse.json();
    if (!quote.data) {
      throw new Error('Failed to fetch quote');
    }

    const swapResponse = await fetch('https://quote-api.jup.ag/v4/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote.data[0],
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
      }),
    });
    const swap = await swapResponse.json();
    if (!swap.swapTransaction) {
      throw new Error('Failed to fetch swap transaction');
    }

    const swapTransactionBuf = Buffer.from(swap.swapTransaction, 'base64');
    const transaction = Transaction.from(swapTransactionBuf);
    const { solana } = window;
    const signedTransaction = await solana.signTransaction(transaction);

    const txid = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(txid);

    const embReceived = solAmount * 0.95; // Simplified for demo (accounting for slippage)
    return { success: true, embReceived, txid };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Step 7: Convert EMB to SOL
const convertEmbToSolStep = async (walletAddress, embAmount) => {
  if (!walletAddress) {
    return { success: false, error: 'Wallet not connected' };
  }

  try {
    const amount = embAmount * 1e6; // Adjust based on EMB token decimals (assuming 6 decimals)
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v4/quote?inputMint=${EMB_TOKEN_ADDRESS}&outputMint=${SOL_TOKEN_ADDRESS}&amount=${amount}&slippageBps=50`
    );
    const quote = await quoteResponse.json();
    if (!quote.data) {
      throw new Error('Failed to fetch quote');
    }

    const swapResponse = await fetch('https://quote-api.jup.ag/v4/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote.data[0],
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
      }),
    });
    const swap = await swapResponse.json();
    if (!swap.swapTransaction) {
      throw new Error('Failed to fetch swap transaction');
    }

    const swapTransactionBuf = Buffer.from(swap.swapTransaction, 'base64');
    const transaction = Transaction.from(swapTransactionBuf);
    const { solana } = window;
    const signedTransaction = await solana.signTransaction(transaction);

    const txid = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(txid);

    const solReceived = embAmount * 0.95; // Simplified for demo (accounting for slippage)
    return { success: true, solReceived, txid };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Step 8: Trading logic (Simple MA Strategy)
const tradingStep = async (prices, tradeAmount, embBalance, balance, lastEntry) => {
  if (prices.length < 20) {
    return { action: 'hold', reason: 'Not enough data' };
  }

  const ma20 = prices.slice(-20).reduce((sum, p) => sum + p, 0) / 20;
  const currentPrice = prices[prices.length - 1];
  const signal = currentPrice > ma20 * 1.01 ? 'buy' : currentPrice < ma20 * 0.99 ? 'sell' : 'hold';

  if (signal === 'buy' && tradeAmount <= embBalance) {
    return { action: 'buy', price: currentPrice, positionSize: tradeAmount };
  } else if (signal === 'sell') {
    const profit = (currentPrice - lastEntry) * tradeAmount;
    return { action: 'sell', price: currentPrice, profit };
  }
  return { action: 'hold' };
};

// Define the market data polling flow
const marketDataPollingFlow = async (prices) => {
  const marketData = await fetchMarketDataStep();
  let updatedPrices = [...prices, marketData.price];
  if (updatedPrices.length > 20) updatedPrices.shift();
  return { marketData, updatedPrices };
};

// Define the trading flow
const tradingFlow = async (tradeAmount, embBalance, balance, lastEntry, prices) => {
  const marketData = await fetchMarketDataStep();
  let updatedPrices = [...prices, marketData.price];
  if (updatedPrices.length > 20) updatedPrices.shift();

  const tradeResult = await tradingStep(updatedPrices, tradeAmount, embBalance, balance, lastEntry);
  return { marketData, tradeResult, updatedPrices };
};

// Define the conversion flow (SOL to EMB)
const conversionFlow = async (solAmount) => {
  const walletResult = await connectWalletStep();
  if (!walletResult.success) {
    throw new Error(walletResult.error);
  }

  const conversionResult = await convertSolToEmbStep(walletResult.walletAddress, solAmount);
  if (!conversionResult.success) {
    throw new Error(conversionResult.error);
  }

  return { walletAddress: walletResult.walletAddress, conversionResult };
};

// Define the conversion flow (EMB to SOL)
const conversionEmbToSolFlow = async (embAmount) => {
  const walletResult = await connectWalletStep();
  if (!walletResult.success) {
    throw new Error(walletResult.error);
  }

  const conversionResult = await convertEmbToSolStep(walletResult.walletAddress, embAmount);
  if (!conversionResult.success) {
    throw new Error(conversionResult.error);
  }

  return { walletAddress: walletResult.walletAddress, conversionResult };
};

// Consolidate all exports into a single export statement to resolve duplicate export error
export {
  tradingFlow,
  conversionFlow,
  conversionEmbToSolFlow,
  marketDataPollingFlow,
  connectWalletStep,
  disconnectWalletStep,
  fetchBalancesStep,
  detectWallets
};