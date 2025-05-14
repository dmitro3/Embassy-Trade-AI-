# TradeForce AI - Real Solana Devnet Integration Guide

## Overview

This guide explains how to launch TradeForce AI with real Solana devnet wallet integration. The integration allows you to use your own Solana wallet to execute trades and view real blockchain transaction data in the Results tab.

## Prerequisites

1. NodeJS 16+ and npm installed
2. A Solana wallet browser extension (Phantom, Solflare, Slope, or Sollet)
3. Basic familiarity with Solana devnet

## Getting Started

### Option 1: Using PowerShell (Recommended)

1. Open a PowerShell window in the `web` directory
2. Run the PowerShell script:

```powershell
.\Start-SolanaRealIntegration.ps1
```

### Option 2: Using Batch Script

1. Open a command prompt in the `web` directory
2. Run the batch script:

```cmd
start-solana-real.bat
```

### Option 3: Quick Start (For Development)

If you just need a quick start without all the cleaning steps:

```cmd
quick-start-solana-real.bat
```

## Using the Application

1. When the application loads, click the "Connect Wallet" button in the top right corner
2. Select your Solana wallet provider (Phantom, Solflare, etc.)
3. Approve the connection request in your wallet extension
4. Navigate to the Results tab
5. If prompted, click "Validate Wallet" and sign the message in your wallet
6. The Results tab will now display your real Solana devnet transactions

## Configuration Details

The integration has been configured with the following settings:

- **Network**: Solana Devnet
- **Wallet Validation**: Required (signature verification)
- **Mock Data**: Disabled
- **Minimum Transactions**: None (any wallet can be used)

## Troubleshooting

### Application Doesn't Start

1. Check that all required dependencies are installed:

```powershell
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets bs58
```

2. Make sure no other instances of the application are running:

```powershell
.\stop-tradeforce-ai.bat
```

### Wallet Doesn't Connect

1. Ensure your wallet extension is installed and unlocked
2. Try refreshing the page and connecting again
3. Check browser console for specific connection errors

### No Transaction Data Shows

1. Your wallet may not have any transactions on Solana devnet
2. Create some test transactions on devnet first
3. Click the refresh button on the Results tab

### Validation Fails

1. Make sure your wallet supports message signing
2. Allow popup windows for the application
3. Try reconnecting your wallet

## Verifying Configuration

You can verify your configuration is correct by running:

```powershell
node verify-solana-integration.cjs
```

This will check that all required settings are properly configured for real Solana integration.

## Additional Resources

- Solana Devnet Faucet: https://solfaucet.com/
- Solana Explorer (Devnet): https://explorer.solana.com/?cluster=devnet
- TradeForce AI Documentation: See `docs/SOLANA_INTEGRATION.md` for detailed implementation information
