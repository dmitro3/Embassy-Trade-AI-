// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\scripts\createEmbaiWithPhantom.js
const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const { createMint } = require('@solana/spl-token');
const EMBAITokenManager = require('../lib/embaiToken');

// Token configuration from our embaiToken.js file
const TOKEN_CONFIG = {
  name: "EMBAI Token",
  symbol: "$EMBAI",
  decimals: 9,
  initialSupply: 1000000000, // 1 billion tokens
};

// Instructions for manual token creation using Phantom wallet
console.log(`
===============================================================
🚀 $EMBAI TOKEN CREATION GUIDE WITH PHANTOM WALLET 🚀
===============================================================

Since the Solana devnet faucet has request limits, we'll use your 
existing Phantom wallet to create the token. Follow these steps:

1. Open your browser and ensure Phantom wallet extension is installed
2. Make sure your Phantom wallet is set to Devnet network
3. Ensure your wallet has at least 0.5 SOL on devnet

4. Visit: https://spl-token-faucet.com/?network=devnet
   - This is a user-friendly interface to create SPL tokens

5. Connect your Phantom wallet
6. Fill in the token details:
   - Token Name: ${TOKEN_CONFIG.name}
   - Symbol: ${TOKEN_CONFIG.symbol}
   - Decimals: ${TOKEN_CONFIG.decimals}
   - Total Supply: ${TOKEN_CONFIG.initialSupply}
   
7. Click "Create Token" and approve the transaction in your Phantom wallet

8. After creation, save the Token Mint Address
9. Update the NEW_EMBAI_ADDRESS constant in lib/embaiToken.js with:
   export const NEW_EMBAI_ADDRESS = 'your-new-token-mint-address';

===============================================================
Alternative Method (Using Solana CLI):
===============================================================

If you prefer using the Solana CLI, run these commands:

1. Install Solana CLI if not already installed:
   https://docs.solana.com/cli/install-solana-cli-tools

2. Set CLI to devnet:
   solana config set --url https://api.devnet.solana.com

3. Create a new token:
   spl-token create-token --decimals ${TOKEN_CONFIG.decimals}

4. Create a token account:
   spl-token create-account YOUR_TOKEN_ADDRESS

5. Mint the initial supply:
   spl-token mint YOUR_TOKEN_ADDRESS ${TOKEN_CONFIG.initialSupply} YOUR_WALLET_ADDRESS

===============================================================
Once you have created the token, update the lib/embaiToken.js file
with your new token address.
===============================================================
`);