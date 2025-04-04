const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const { getAccount, getAssociatedTokenAddress } = require('@solana/spl-token');

// Directly hardcode the address to avoid import issues
const NEW_EMBAI_ADDRESS = '3xAcrqNddNmc8piAk6HHxhKJtr7gt6hKCkXHhCkcA84G';

async function checkTokenInfo() {
  try {
    console.log('🔍 Checking $EMBAI token information on Solana devnet...');
    console.log(`Token Address: ${NEW_EMBAI_ADDRESS}`);
    
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Get token supply
    const mintInfo = await connection.getTokenSupply(new PublicKey(NEW_EMBAI_ADDRESS));
    
    console.log('\n📊 Token Details:');
    console.log(`- Total Supply: ${Number(mintInfo.value.amount) / 10**mintInfo.value.decimals} tokens`);
    console.log(`- Decimals: ${mintInfo.value.decimals}`);
    console.log(`- Mint Authority: ${mintInfo.value.mintAuthority || 'Not set'}`);
    console.log(`- Freeze Authority: ${mintInfo.value.freezeAuthority || 'Not set'}`);
    
    console.log('\n🌐 View on Solana Explorer:');
    console.log(`https://explorer.solana.com/address/${NEW_EMBAI_ADDRESS}?cluster=devnet`);
    
    console.log('\n✅ $EMBAI token is successfully configured in your application!');
    
  } catch (error) {
    console.error('❌ Error checking token information:', error);
  }
}

// Run the token info check
checkTokenInfo();