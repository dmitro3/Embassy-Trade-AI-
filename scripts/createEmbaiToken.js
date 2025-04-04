// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\scripts\createEmbaiToken.js
const { Connection, clusterApiUrl, Keypair } = require('@solana/web3.js');
const { readFileSync } = require('fs');
const EMBAITokenManager = require('../lib/embaiToken');
const bs58 = require('bs58');

// This function will create a new $EMBAI token on Solana devnet
async function createEMBAIToken() {
  try {
    console.log('🚀 Starting $EMBAI token creation on Solana devnet...');
    
    // For demo purposes, we'll generate a new keypair
    // In production, you would want to use your actual wallet private key
    const newKeypair = Keypair.generate();
    const secretKeyBase58 = bs58.encode(newKeypair.secretKey);
    
    console.log(`✅ Generated new keypair with public key: ${newKeypair.publicKey.toString()}`);
    console.log('⚠️ IMPORTANT: Save this private key somewhere safe! It will only be shown once!');
    console.log(`🔑 Private key (base58): ${secretKeyBase58}`);
    
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    console.log('📡 Connected to Solana devnet');
    
    // Request an airdrop of SOL to pay for transactions
    console.log('🪙 Requesting SOL airdrop to pay for token creation...');
    try {
      const airdropSignature = await connection.requestAirdrop(
        newKeypair.publicKey,
        2 * 10 ** 9 // 2 SOL in lamports
      );
      
      console.log(`Airdrop signature: ${airdropSignature}`);
      
      // Wait for airdrop confirmation
      console.log('Waiting for airdrop confirmation...');
      await connection.confirmTransaction(airdropSignature);
      console.log('💸 Airdrop received successfully!');
    } catch (airdropError) {
      console.error('❌ Error during airdrop:', airdropError);
      throw airdropError;
    }
    
    // Create token manager instance
    const tokenManager = new EMBAITokenManager(connection);
    
    // Create the token
    console.log('🪙 Creating $EMBAI token...');
    const result = await tokenManager.createToken(secretKeyBase58);
    
    if (result.success) {
      console.log('\n✅ $EMBAI token created successfully!');
      console.log('📊 Token Details:');
      console.log(`- Mint Address: ${result.mint}`);
      console.log(`- Token Account: ${result.tokenAccount}`);
      console.log(`- Owner: ${result.owner}`);
      console.log('\n🔍 You can view the token on Solana Explorer:');
      console.log(`https://explorer.solana.com/address/${result.mint}?cluster=devnet`);
      
      // Update the NEW_EMBAI_ADDRESS in the embaiToken.js file
      console.log('\n⚠️ Remember to update the NEW_EMBAI_ADDRESS constant in lib/embaiToken.js with:');
      console.log(`export const NEW_EMBAI_ADDRESS = '${result.mint}';`);
    } else {
      console.error('❌ Token creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during token creation process:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the token creation function
console.log('Script starting');
createEMBAIToken().then(() => {
  console.log('Script completed');
}).catch(err => {
  console.error('Unhandled error in main script:', err);
});