# TradeForce AI - Real Solana Wallet Integration Guide

This guide will help you connect your real Solana devnet wallet to TradeForce AI and execute live trades.

## Prerequisites

1. A Solana wallet extension installed in your browser (Phantom, Solflare, etc.)
2. Some SOL in your devnet wallet for transactions
3. TradeForce AI application running locally

## Connection Steps

### Step 1: Switch Your Wallet to Devnet

1. Open your wallet extension (e.g., Phantom)
2. Go to Settings → Developer Settings
3. Switch the network from "Mainnet" to "Devnet"
4. Verify you see "Devnet" indicated in your wallet interface

### Step 2: Get Devnet SOL (if needed)

If you don't have SOL in your devnet wallet:

1. Copy your wallet address
2. Visit [Solana Devnet Faucet](https://solfaucet.com/)
3. Paste your wallet address and request SOL
4. Wait a few seconds for the SOL to arrive in your wallet

### Step 3: Connect Your Wallet to TradeForce AI

1. Launch TradeForce AI using the `start-solana-devnet-test.bat` script
2. When the application loads, click "Connect Wallet" in the top-right corner
3. Select your wallet provider from the list (Phantom, Solflare, etc.)
4. Approve the connection request in your wallet extension
5. If prompted, sign the message to validate your wallet ownership

### Step 4: Verify Connection

1. After connecting, you should see your wallet address displayed in the app
2. The app will automatically start fetching your blockchain transaction history
3. You can verify proper integration by running the verification script:
   ```
   node verify-wallet-config.js
   ```
4. Check the "Results" tab to see if any existing transactions are displayed

## Executing Live Trades

TradeForce AI is now connected to the Solana blockchain and will display real transaction data. To execute a trade:

1. Go to the "Trade" tab
2. Select a trading pair (e.g., SOL/USDC)
3. Enter the amount you wish to trade
4. Click "Execute Trade"
5. Approve the transaction in your wallet extension
6. Wait for the transaction to be confirmed on the blockchain
7. The trade will appear in your transaction history in the "Results" tab

## Troubleshooting

### Wallet Not Connecting

- Make sure your wallet is unlocked
- Verify you're on the Solana devnet network
- Try refreshing the page and connecting again
- Check browser console for connection errors

### Transactions Not Showing

- New transactions may take a few moments to appear
- Click the "Refresh Blockchain Data" button in the Results tab
- Verify your wallet has transaction history on devnet
- Check that you've authorized the correct wallet

### Signature Validation Failed

- Try reconnecting your wallet
- Sign the validation message when prompted
- Check your wallet's connection permissions

## Advanced Configuration

If you need to adjust wallet configuration settings, the following files contain relevant settings:

- `lib/walletConfig.js` - Main wallet configuration settings
- `lib/tradeHistoryService.js` - Trade history and blockchain integration
- `lib/validateWalletSignature.js` - Wallet validation functionality

## Support

If you encounter issues with wallet integration, please contact our support team or open an issue on our GitHub repository.
