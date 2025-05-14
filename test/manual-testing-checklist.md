# TradeForce AI Testing Checklist

## Setup and Configuration
- [x] TradeForce AI server running on port 3008
- [x] MCP servers running:
  - [x] Pump.fun MCP (port 3001) - ONLINE
  - [x] SHYFT Data MCP (port 3001) - ONLINE
  - [ ] DexScreener MCP (port 3002) - OFFLINE (404 on health endpoint)
  - [ ] Token Discovery MCP (port 3100) - OFFLINE (404 on health endpoint)
- [x] Solana DevNet connection - ONLINE

## Application Testing Tasks

### 1. Dashboard Access
- [x] Access TradeForce AI dashboard at http://localhost:3008/tradeforce-ai
- [x] Dashboard loads without errors
- [ ] Dashboard shows appropriate warnings about offline MCP servers

### 2. Wallet Connection Testing
- [ ] Install Phantom or Solflare wallet browser extension
- [ ] Click "Connect Phantom Wallet" or "Connect Solflare Wallet"
- [ ] Authorize connection in wallet extension
- [ ] Dashboard shows wallet address and balance
- [ ] Request DevNet SOL airdrop
- [ ] Verify updated wallet balance

### 3. Trading Functionality
- [ ] Access Trading tab on dashboard
- [ ] Select token to trade
- [ ] Select amount (use small test amount)
- [ ] Execute trade with "Paper Trading" mode enabled
- [ ] Verify transaction appears in trade history

### 4. MCP Server Integration
- [ ] Check if dashboard shows token data sourced from SHYFT Data MCP
- [ ] Verify if token price data is being displayed
- [ ] Note any errors in the UI related to unavailable MCP servers

### 5. Error Handling
- [ ] Try executing a trade without wallet connection
- [ ] Try executing a trade with an invalid amount
- [ ] Verify appropriate error messages are displayed

## Notes
* Some functionality may be limited due to DexScreener MCP and Token Discovery MCP being offline
* All tests should be performed on Solana DevNet to avoid using real funds

## Results

### Configuration Issues
* DexScreener MCP server is returning 404 on health endpoint
* Token Discovery MCP server is returning 404 on health endpoint

### Next Steps
1. Investigate and fix health endpoint implementation for DexScreener MCP and Token Discovery MCP
2. Complete remaining manual test steps with wallet connection
3. Document any additional issues found during testing
