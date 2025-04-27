'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { clusterApiUrl, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { scanTokens, executeTrade, startTradingBot, closeTrade } from '../../lib/axiomTradeAPI';

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

// We need to dynamically import the WalletProvider to avoid SSR issues
const WalletProviderComponent = dynamic(
  () => import('../../lib/WalletProviderComponent').then(mod => mod.WalletProviderComponent),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-white">Loading Wallet Integration...</p>
        </div>
      </div>
    )
  }
);

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
  const connection = useMemo(() => 
    new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet), 'confirmed'),
    []
  );

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
  const startTradingBot = async () => {
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
      const botResult = await startTradingBot({
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
            <h1 className="text-3xl font-bold">Axiom Trade Master</h1>
            <p className="text-gray-400">Solana Devnet Trading Platform</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">            {connected ? (
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
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-md transition"
                >
                  Disconnect
                </button>
                
                <button 
                  onClick={requestAirdrop}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-md transition flex items-center"
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
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                </svg>
                Trading Dashboard
              </h2>
              
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
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
                    onClick={startTradingBot}
                    className={`px-4 py-2 ${connected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'} rounded-md text-sm transition`}
                    disabled={!connected || isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Start New Bot'}
                  </button>
                  <button 
                    onClick={executeSampleTrade}
                    className={`px-4 py-2 ${connected ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'} rounded-md text-sm transition`}
                    disabled={!connected || isLoading}
                  >
                    Execute Sample Trade
                  </button>
                  <button 
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm transition"
                  >
                    View All Bots
                  </button>
                </div>
              </div>
              
              {/* Active Trades Section */}
              <div className="bg-gray-700 p-4 rounded-lg">
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
                              <button className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition">
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

            {/* Trading Strategies Section */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Trading Strategies
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">New Token Detection</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={selectedStrategies.newToken} 
                        onChange={() => toggleStrategy('newToken')}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Identifies newly listed tokens with high potential for quick gains</p>
                  <div className="flex justify-between text-sm">
                    <span>Risk Level:</span>
                    <span className="text-yellow-500">Medium</span>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">High Volume Detection</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={selectedStrategies.highVolume} 
                        onChange={() => toggleStrategy('highVolume')}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Finds tokens with unusually high trading activity compared to average</p>
                  <div className="flex justify-between text-sm">
                    <span>Risk Level:</span>
                    <span className="text-green-500">Low</span>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Bullish Momentum</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={selectedStrategies.bullishMomentum} 
                        onChange={() => toggleStrategy('bullishMomentum')}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Detects tokens with strong upward price movement and momentum</p>
                  <div className="flex justify-between text-sm">
                    <span>Risk Level:</span>
                    <span className="text-yellow-500">Medium</span>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Whale Tracking</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={selectedStrategies.whaleTracking} 
                        onChange={() => toggleStrategy('whaleTracking')}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Follows large wallet transactions to identify potential market movers</p>
                  <div className="flex justify-between text-sm">
                    <span>Risk Level:</span>
                    <span className="text-red-500">High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                Risk Management
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Stop Loss (%)</label>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  value={riskParams.stopLoss} 
                  onChange={(e) => handleRiskChange('stopLoss', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="flex justify-between text-sm mt-1">
                  <span>5%</span>
                  <span className="font-medium">{riskParams.stopLoss}%</span>
                  <span>25%</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Take Profit (%)</label>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={riskParams.takeProfit}
                  onChange={(e) => handleRiskChange('takeProfit', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="flex justify-between text-sm mt-1">
                  <span>20%</span>
                  <span className="font-medium">{riskParams.takeProfit}%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Position Size (SOL)</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10" 
                  step="0.1" 
                  value={riskParams.positionSize}
                  onChange={(e) => handleRiskChange('positionSize', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="flex justify-between text-sm mt-1">
                  <span>0.1</span>
                  <span className="font-medium">{riskParams.positionSize.toFixed(1)}</span>
                  <span>10</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button 
                  className={`w-full px-4 py-2 ${connected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600'} rounded-md transition`}
                  disabled={!connected || isLoading}
                  onClick={startTradingBot}
                >
                  {isLoading ? 'Processing...' : (connected ? 'Apply & Start Trading' : 'Connect Wallet First')}
                </button>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Devnet Testing Tools
              </h2>
              
              <div className="space-y-3">
                <button 
                  onClick={requestAirdrop}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition flex items-center justify-center"
                  disabled={!connected || isLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Request 1 SOL Airdrop
                </button>
                
                <button 
                  onClick={executeSampleTrade}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition flex items-center justify-center"
                  disabled={!connected || isLoading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                  </svg>
                  Execute Test Transaction
                </button>
                
                <div className="w-full px-4 py-3 bg-gray-700 rounded-md text-sm">
                  <h4 className="font-medium mb-1">Network Status</h4>
                  <div className="flex items-center text-green-400">
                    <span className="h-2 w-2 bg-green-400 rounded-full mr-2"></span>
                    <span>Solana Devnet Connected</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Use this interface to test trading strategies with real Solana transactions on Devnet.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                About Axiom Trade Master
              </h2>
              
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <p className="text-sm mb-3">
                  This extension integrates with Solana wallets to enable automated trading on Axiom with advanced strategies.
                </p>
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                  <span>Secure: No private keys stored or transmitted</span>
                </div>
                <div className="flex items-center text-sm text-gray-400 mb-2">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <span>Advanced: Multiple trading strategies</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Real-time: Automated execution and monitoring</span>
                </div>
              </div>
              
              <div className="text-center">
                <a href="/trade" className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition">
                  Return to Standard Interface
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the trading interface with the wallet provider
export default function TradeForceDirect() {
  const [loadingState, setLoadingState] = useState({
    stage: 'initializing',
    error: null,
    progress: 0
  });

  useEffect(() => {
    // Simplified initialization with progress reporting
    const initApp = async () => {
      try {
        // Stage 1: Set page title
        setLoadingState(prev => ({ ...prev, stage: 'setup', progress: 10 }));
        document.title = 'TradeForce | Embassy AI Trading Platform';
        await new Promise(resolve => setTimeout(resolve, 500));

        // Stage 2: Load essential scripts
        setLoadingState(prev => ({ ...prev, stage: 'loading_essentials', progress: 30 }));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Stage 3: Load Axiom Trade Master Bot features
        setLoadingState(prev => ({ ...prev, stage: 'loading_axiom_bot', progress: 50 }));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Stage 3: Final preparation
        setLoadingState(prev => ({ ...prev, stage: 'preparing', progress: 70 }));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Stage 4: Ready
        setLoadingState(prev => ({ 
          ...prev, 
          stage: 'ready', 
          progress: 100 
        }));
      } catch (error) {
        console.error('Error during application initialization:', error);
        setLoadingState(prev => ({ 
          ...prev, 
          stage: 'error', 
          error: error.message || 'Unknown error during initialization' 
        }));
      }
    };

    initApp();
  }, []);

  // Simplified loading indicator that doesn't rely on complex components
  if (loadingState.stage !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">TradeForce Loading</h1>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 mb-6">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${loadingState.progress}%` }}
            ></div>
          </div>          
          {/* Status message */}
          <div className="text-center mb-6">
            {loadingState.stage === 'initializing' && 'Initializing application...'}
            {loadingState.stage === 'setup' && 'Setting up environment...'}
            {loadingState.stage === 'loading_essentials' && 'Loading essential components...'}
            {loadingState.stage === 'loading_axiom_bot' && 'Loading Axiom Trade Master Bot Extension...'}
            {loadingState.stage === 'preparing' && 'Preparing trading interface...'}
            {loadingState.stage === 'error' && (
              <div className="text-red-400">
                <p className="font-bold">Error:</p>
                <p>{loadingState.error}</p>
              </div>
            )}
          </div>

          {/* Manual recovery option for errors */}
          {loadingState.stage === 'error' && (
            <div className="flex justify-center">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Retry Loading
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Once ready, show the trading interface wrapped with the wallet provider
  return (
    <WalletProviderComponent>
      <TradingInterface />
    </WalletProviderComponent>
  );
}
