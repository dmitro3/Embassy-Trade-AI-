import {
  initializeServices,
  getMarketData,
  scanTokens,
  executeTrade,
  getTradeHistory,
  getActiveOrders,
  cancelOrder,
  processInstruction
} from './lib/axiomTradeAPI.js';

// Mock wallet connection for testing
const mockWallet = {
  publicKey: { toString: () => 'DummyPublicKey123456789' },
  signTransaction: async (tx) => tx
};

// Mock connection for testing
const mockConnection = {
  getLatestBlockhash: async () => ({ blockhash: 'dummy-blockhash', lastValidBlockHeight: 12345 }),
  sendRawTransaction: async () => 'dummy-signature',
  confirmTransaction: async () => true
};

// Test token address
const TEST_TOKEN_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
const TEST_TOKEN_SYMBOL = 'BONK';

// Test strategies
const TEST_STRATEGIES = {
  newToken: true,
  highVolume: true,
  bullishMomentum: false,
  whaleTracking: false
};

// Test risk parameters
const TEST_RISK_PARAMS = {
  positionSize: 0.5, // 0.5 SOL
  stopLoss: 5, // 5%
  takeProfit: 15 // 15%
};

/**
 * Run tests for the trading system
 */
async function runTests() {
  console.log('=== TradeForce AI Trading System Test ===');
  
  try {
    // Initialize services
    console.log('\n1. Initializing services...');
    const initialized = await initializeServices();
    console.log(`Services initialized: ${initialized ? 'SUCCESS' : 'FAILED'}`);
    
    if (!initialized) {
      throw new Error('Failed to initialize services');
    }
    
    // Test market data retrieval
    console.log('\n2. Testing market data retrieval...');
    console.log('2.1. By address:');
    const marketDataByAddress = await getMarketData(TEST_TOKEN_ADDRESS);
    console.log(JSON.stringify(marketDataByAddress, null, 2));
    
    console.log('\n2.2. By symbol:');
    const marketDataBySymbol = await getMarketData(TEST_TOKEN_SYMBOL);
    console.log(JSON.stringify(marketDataBySymbol, null, 2));
    
    // Test token scanning
    console.log('\n3. Testing token scanning...');
    const matchedTokens = await scanTokens(TEST_STRATEGIES);
    console.log(`Found ${matchedTokens.length} tokens matching criteria:`);
    matchedTokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.name || token.symbol}: $${token.price}`);
    });
    
    if (matchedTokens.length === 0) {
      throw new Error('No tokens found matching criteria');
    }
    
    // Test trade execution
    console.log('\n4. Testing trade execution...');
    const selectedToken = matchedTokens[0];
    console.log(`Executing trade for ${selectedToken.name || selectedToken.symbol}...`);
    
    const tradeResult = await executeTrade({
      connection: mockConnection,
      publicKey: mockWallet.publicKey,
      signTransaction: mockWallet.signTransaction,
      token: selectedToken,
      amountInSol: TEST_RISK_PARAMS.positionSize,
      stopLossPercent: TEST_RISK_PARAMS.stopLoss,
      takeProfitPercent: TEST_RISK_PARAMS.takeProfit
    });
    
    console.log('Trade execution result:');
    console.log(JSON.stringify(tradeResult, null, 2));
    
    // Test trade history retrieval
    console.log('\n5. Testing trade history retrieval...');
    const tradeHistory = await getTradeHistory();
    console.log(`Retrieved ${tradeHistory.trades.length} trades:`);
    console.log(JSON.stringify(tradeHistory, null, 2));
    
    // Test active orders retrieval
    console.log('\n6. Testing active orders retrieval...');
    const activeOrders = await getActiveOrders();
    console.log(`Retrieved ${activeOrders.orders.length} active orders:`);
    console.log(JSON.stringify(activeOrders, null, 2));
    
    // Test order cancellation
    if (activeOrders.orders.length > 0) {
      console.log('\n7. Testing order cancellation...');
      const orderToCancel = activeOrders.orders[0];
      console.log(`Cancelling order ${orderToCancel.id}...`);
      
      const cancellationResult = await cancelOrder(orderToCancel.id);
      console.log('Cancellation result:');
      console.log(JSON.stringify(cancellationResult, null, 2));
    }
    
    // Test natural language instruction processing
    console.log('\n8. Testing natural language instruction processing...');
    const instruction = 'Buy BONK with 0.5 SOL and set a 5% stop loss';
    console.log(`Processing instruction: "${instruction}"`);
    
    const instructionResult = await processInstruction(instruction);
    console.log('Instruction processing result:');
    console.log(JSON.stringify(instructionResult, null, 2));
    
    console.log('\n=== All tests completed successfully ===');
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the tests
runTests().catch(console.error);
