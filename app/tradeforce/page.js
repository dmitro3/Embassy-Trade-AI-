'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { clusterApiUrl, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { scanTokens, executeTrade, startTradingBot as startAxiomTradingBot, closeTrade } from '../../lib/axiomTradeAPI';
import SolanaWalletProvider from '../../components/SolanaWalletProvider';
import TradeForceEnhanced from '../../components/TradeForceEnhanced';
// Import MCP server health checker
import { useMCPServerHealth, MCPServerStatus } from '../../lib/mcpServerHealth';

// Import styles first
import 'react-toastify/dist/ReactToastify.css';
// Then import the library (not dynamically)
import { ToastContainer, toast as reactToast } from 'react-toastify';

// Create a toast wrapper that will be available globally
const toast = {
  success: message => {
    console.log('SUCCESS:', message);
    if (typeof window !== 'undefined') {
      reactToast.success(message);
    }
  },
  error: message => {
    console.error('ERROR:', message);
    if (typeof window !== 'undefined') {
      reactToast.error(message);
    }
  },
  info: message => {
    console.log('INFO:', message);
    if (typeof window !== 'undefined') {
      reactToast.info(message);
    }
  },
  warning: message => {
    console.warn('WARNING:', message);
    if (typeof window !== 'undefined') {
      reactToast.warning(message);
    }
  }
};

// Make toast available globally for error handling
if (typeof window !== 'undefined') {
  window.toast = toast;
}

// Using our new SolanaWalletProvider component which is already imported above

// Import the custom SolanaWalletButton component
const SolanaWalletButton = dynamic(
  () => import('../../components/SolanaWalletButton').then(mod => mod.SolanaWalletButton),
  {
    ssr: false,
    loading: () => (
      <div className="px-4 py-2 bg-gray-600 rounded-md">
        <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
      </div>
    )
  }
);

// Main Trading Interface with advanced Devnet integration
function TradingInterface() {
  // Use the wallet from Solana wallet adapter
  const { publicKey, connected, connecting, disconnect, connect, wallet, signTransaction, signAllTransactions } = useWallet();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradingStats, setTradingStats] = useState({
    totalTrades: 0,
    winRate: 0,
    profitLoss: 0
  });
  const [selectedStrategies, setSelectedStrategies] = useState({
    newToken: true,
    highVolume: true,
    bullishMomentum: false,
    whaleTracking: false
  });
  const [riskParams, setRiskParams] = useState({
    stopLoss: 15,
    takeProfit: 50,
    positionSize: 1.0
  });

  // Initialize connection to Solana devnet
  const connection = useMemo(
    () => new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet), 'confirmed'),
    []
  );
    
  // Check MCP servers status automatically when page loads
  const [mcpStatus, setMCPStatus] = useState({
    status: {},
    allEssentialRunning: false,
    loading: true
  });
  
  // Handler for MCP status changes
  const handleMCPStatusChange = useCallback((status) => {
    setMCPStatus(status);
    
    // Show appropriate notifications based on status
    if (status.error) {
      toast.warning(`MCP server check failed: ${status.error}`);
    } else if (!status.loading) {
      if (status.allEssentialRunning) {
        toast.success('MCP services are running and ready');
      } else {
        // Check each server and show specific messages
        const servers = status.status || {};
        let hasAnyServer = false;
        
        Object.entries(servers).forEach(([name, server]) => {
          if (server.healthy) {
            hasAnyServer = true;
          }
        });
        
        if (!hasAnyServer) {
          toast.warning(
            'MCP servers are not running. Please run start-mcp-servers.bat to enable all features.',
            { autoClose: 10000 }
          );
        } else {
          toast.info('Some MCP servers are running, but not all');
        }
      }
    }
  }, []);
  
  // Use the MCPServerStatus component to monitor MCP servers
  useEffect(() => {
    // Render the headless component to monitor MCP servers
    const statusComponent = document.createElement('div');
    statusComponent.style.display = 'none';
    document.body.appendChild(statusComponent);
    
    // Use a custom render function similar to ReactDOM.render
    const renderMCPStatus = () => {
      return <MCPServerStatus onStatusChange={handleMCPStatusChange} />;
    };
    
    // We would normally use ReactDOM.render here, but in Next.js client components
    // we'll just initialize the hook directly
    const { checkAllServers } = useMCPServerHealth();
    checkAllServers().then(status => {
      handleMCPStatusChange({
        status,
        allEssentialRunning: status.tokenDiscovery?.healthy === true,
        loading: false
      });
    });
    
    return () => {
      // Clean up
      if (document.body.contains(statusComponent)) {
        document.body.removeChild(statusComponent);
      }
    };
  }, [handleMCPStatusChange]);

  // Fetch wallet balance when connected
  useEffect(() => {
    async function fetchWalletBalance() {
      if (connected && publicKey) {
        try {
          setIsLoading(true);
          const walletBalance = await connection.getBalance(publicKey);
          setBalance(walletBalance / LAMPORTS_PER_SOL);
          
          // Initialize with sample data for demo purposes
          initializeSampleData();
        } catch (error) {
          console.error('Error fetching balance:', error);
          toast.error('Failed to fetch wallet balance');
        } finally {
          setIsLoading(false);
        }
      } else {
        setBalance(0);
      }
    }

    fetchWalletBalance();
  }, [connected, publicKey, connection]);

  // Initialize with sample data for demonstration
  const initializeSampleData = () => {
    // Sample active trades
    setActiveTrades([
      { 
        id: 'trade-1', 
        token: 'BONK/SOL', 
        entry: 0.00000012, 
        current: 0.00000015, 
        size: 0.5, 
        profit: 25, 
        time: '2h 15m' 
      },
      { 
        id: 'trade-2', 
        token: 'JUP/SOL', 
        entry: 0.0112, 
        current: 0.0118, 
        size: 0.7, 
        profit: 5.3, 
        time: '45m' 
      },
      { 
        id: 'trade-3', 
        token: 'DFL/SOL', 
        entry: 0.00314, 
        current: 0.00298, 
        size: 0.3, 
        profit: -5.1, 
        time: '1h 30m' 
      }
    ]);

    // Trading stats
    setTradingStats({
      totalTrades: 42,
      winRate: 68,
      profitLoss: 3.14
    });
  };

  // Handle strategy toggle
  const toggleStrategy = (strategy) => {
    setSelectedStrategies(prev => ({
      ...prev,
      [strategy]: !prev[strategy]
    }));
  };

  // Handle risk parameter changes
  const handleRiskChange = (param, value) => {
    setRiskParams(prev => ({
      ...prev,
      [param]: value
    }));
  };
  // Start new trading bot with selected strategies
  const handleStartTradingBot = async () => {
    if (!connected || !publicKey) {
      toast.warning('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Initializing trading bot and scanning Axiom...');
      
      // Get available tokens based on selected strategies
      const matchedTokens = await scanTokens(selectedStrategies);
      
      if (matchedTokens.length === 0) {
        toast.warning('No tokens matching your strategy criteria were found');
        return;
      }
      
      toast.info(`Found ${matchedTokens.length} potential tokens matching criteria. Analyzing best entry...`);
      
      // Start trading bot with selected strategies and risk parameters
      const botResult = await startAxiomTradingBot({
        connection,
        publicKey,
        signTransaction,
        strategies: selectedStrategies,
        riskParams: riskParams
      });
      
      // Add new trade to active trades
      setActiveTrades(prev => [botResult.trade, ...prev]);
      
      // Update trading stats
      setTradingStats(prev => ({
        ...prev,
        totalTrades: prev.totalTrades + 1
      }));
      
      // Success notification
      toast.success(`Trading bot started! Purchased ${botResult.token.name}`);
      
    } catch (error) {
      console.error('Error starting trading bot:', error);
      toast.error('Failed to start trading bot: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Request airdrop of SOL for testing (real Devnet functionality)
  const requestAirdrop = async () => {
    if (!connected || !publicKey) {
      toast.warning('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Requesting 1 SOL from Devnet...');
      
      // Real Devnet airdrop request
      const signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature
      });
      
      // Update balance
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
      
      // Success notification
      toast.success('1 SOL airdrop received!');
    } catch (error) {
      console.error('Airdrop error:', error);
      toast.error('Failed to request SOL airdrop');
    } finally {
      setIsLoading(false);
    }
  };
  // Execute a sample trade on Devnet using Axiom
  const executeSampleTrade = async () => {
    if (!connected || !publicKey) {
      toast.warning('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Scanning Axiom for trading opportunities...');
      
      // Scan for tokens based on current strategies
      const matchedTokens = await scanTokens(selectedStrategies);
      
      if (matchedTokens.length === 0) {
        toast.warning('No tokens matching current criteria found');
        setIsLoading(false);
        return;
      }
      
      // Select a random token from the matched list for demonstration
      const randomIndex = Math.floor(Math.random() * matchedTokens.length);
      const selectedToken = matchedTokens[randomIndex];
      
      toast.info(`Preparing to trade ${selectedToken.name}...`);
      
      // Execute the trade with the selected token
      const tradeResult = await executeTrade({
        connection,
        publicKey,
        signTransaction,
        token: selectedToken,
        amountInSol: riskParams.positionSize * 0.1, // Use 10% of position size for sample
        stopLossPercent: riskParams.stopLoss,
        takeProfitPercent: riskParams.takeProfit
      });
      
      // Add new trade to active trades
      setActiveTrades(prev => [tradeResult.trade, ...prev]);
      
      // Update trading stats
      setTradingStats(prev => ({
        ...prev,
        totalTrades: prev.totalTrades + 1
      }));
      
      // Success notification
      toast.success(`Sample trade of ${selectedToken.name} executed successfully!`);
    } catch (error) {
      console.error('Trade execution error:', error);
      toast.error(`Failed to execute sample trade: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle closing a trade
  const handleCloseTrade = async (trade) => {
    if (!connected || !publicKey) {
      toast.warning('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      toast.info(`Closing trade for ${trade.token}...`);
      
      // Close the trade
      const closeResult = await closeTrade({
        connection,
        publicKey,
        signTransaction,
        trade
      });
      
      // Remove trade from active trades
      setActiveTrades(prev => prev.filter(t => t.id !== trade.id));
      
      // Update trading stats with profit/loss
      const profitInSol = trade.size * (trade.profit / 100);
      setTradingStats(prev => ({
        ...prev,
        profitLoss: prev.profitLoss + profitInSol,
        winRate: trade.profit > 0 
          ? Math.round((prev.winRate * prev.totalTrades + 100) / prev.totalTrades) 
          : Math.round((prev.winRate * prev.totalTrades) / prev.totalTrades)
      }));
      
      // Success notification
      toast.success(`Trade closed with ${trade.profit > 0 ? 'profit' : 'loss'} of ${trade.profit}%`);
    } catch (error) {
      console.error('Error closing trade:', error);
      toast.error(`Failed to close trade: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      <div className="container mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tradeforce-gradient-text">TradeForce AI</h1>
            <p className="text-gray-400">Solana Devnet Trading Platform</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {connected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-700 rounded-md">
                  <span className="h-3 w-3 bg-green-400 rounded-full"></span>
                  <span className="hidden md:inline">Connected:</span>
                  <span className="font-mono text-sm truncate max-w-[120px]">
                    {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                  </span>
                </div>
                
                <div className="px-4 py-2 bg-blue-800 rounded-md font-medium">
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-t-2 border-blue-300 border-solid rounded-full animate-spin mr-2"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <span>{balance.toFixed(4)} SOL</span>
                  )}
                </div>
                
                <button 
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-md transition tradeforce-button"
                >
                  Disconnect
                </button>
                
                <button 
                  onClick={requestAirdrop}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-md transition flex items-center tradeforce-button"
                  disabled={isLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Get Devnet SOL
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <SolanaWalletButton 
                  connection={connection}
                  onConnect={(address) => {
                    toast.success(`Connected to wallet: ${address.slice(0, 4)}...${address.slice(-4)}`);
                  }}
                  onDisconnect={() => {
                    toast.info('Wallet disconnected');
                    setBalance(0);
                  }}
                />
              </div>
            )}
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="tradeforce-card p-6 shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center tradeforce-tab-header">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                </svg>
                Trading Dashboard
              </h2>
              
              <div className="bg-gray-700 p-4 rounded-lg mb-4 tradeforce-card">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Trading Bot Status</h3>
                  <span className="px-3 py-1 bg-green-600 rounded-full text-sm">Active</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400 text-sm">Trading Balance</div>
                    <div className="text-xl font-semibold">{balance.toFixed(4)} SOL</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400 text-sm">Active Trades</div>
                    <div className="text-xl font-semibold">{activeTrades.length}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400 text-sm">Profit/Loss</div>
                    <div className={`text-xl font-semibold ${tradingStats.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {tradingStats.profitLoss >= 0 ? '+' : ''}{tradingStats.profitLoss.toFixed(2)} SOL
                    </div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400 text-sm">Win Rate</div>
                    <div className="text-xl font-semibold">{tradingStats.winRate}%</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleStartTradingBot}
                    className={`px-4 py-2 ${connected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'} rounded-md text-sm transition tradeforce-button`}
                    disabled={!connected || isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Start New Bot'}
                  </button>
                  <button 
                    onClick={executeSampleTrade}
                    className={`px-4 py-2 ${connected ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'} rounded-md text-sm transition tradeforce-button`}
                    disabled={!connected || isLoading}
                  >
                    Execute Sample Trade
                  </button>
                  <button 
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm transition tradeforce-button"
                  >
                    View All Bots
                  </button>
                </div>
              </div>
              
              {/* Active Trades Section */}
              <div className="bg-gray-700 p-4 rounded-lg tradeforce-card">
                <h3 className="font-medium mb-3">Active Trades</h3>
                
                {activeTrades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Token</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size (SOL)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profit %</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-600">
                        {activeTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{trade.token}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{trade.entry}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{trade.current}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{trade.size}</td>
                            <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {trade.profit >= 0 ? '+' : ''}{trade.profit}%
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{trade.time}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              <button 
                                onClick={() => handleCloseTrade(trade)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition tradeforce-button"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    No active trades. Start a bot or execute a trade to begin.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Sidebar - Simplified for now */}
          <div className="tradeforce-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center tradeforce-tab-header">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              AI Trading Assistant
            </h2>
            <div className="bg-gray-700 p-4 rounded-lg mb-4 tradeforce-card">
              <p className="text-gray-300 mb-4">
                TradeForce AI is powered by Grok 3 machine learning models to analyze market trends and execute profitable trades.
              </p>
              <div className="bg-gray-800 p-3 rounded mb-4">
                <div className="text-gray-400 text-sm mb-1">Current Win Rate</div>
                <div className="text-2xl font-bold text-green-500">{tradingStats.winRate}%</div>
                <div className="w-full bg-gray-600 h-2 rounded-full mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full" 
                    style={{ width: `${tradingStats.winRate}%` }}
                  ></div>
                </div>
              </div>
              <a 
                href="/api/download-extension" 
                className="block w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-md font-medium transition tradeforce-button text-center"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info('Preparing browser extension for download...');
                  
                  // Simulate download preparation
                  setTimeout(() => {
                    // Create a temporary link to download the extension
                    const link = document.createElement('a');
                    link.href = '/extension/dist/tradeforce-ai-trading-agent-chrome.zip';
                    link.download = 'tradeforce-ai-trading-agent.zip';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    toast.success('Extension download started!');
                  }, 1500);
                }}
              >
                Download Browser Extension
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the components with our robust SolanaWalletProvider
export default function TradeforcePage() {
  return (
    <SolanaWalletProvider network="devnet">
      <div className="bg-gray-900 min-h-screen">
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          theme="dark"
        />
        <TradeForceEnhanced />
      </div>
    </SolanaWalletProvider>
  );
}
