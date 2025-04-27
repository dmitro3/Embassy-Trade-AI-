'use client';

import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ExtensionDemoPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [winRate, setWinRate] = useState(65);
  const [totalTrades, setTotalTrades] = useState(42);
  const [profitLoss, setProfitLoss] = useState(3.14);
  const [activeTrades, setActiveTrades] = useState([]);
  const [selectedBrowser, setSelectedBrowser] = useState('chrome');

  // Initialize with sample data
  useEffect(() => {
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

    // Simulate loading
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, []);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle download
  const handleDownload = (browser) => {
    setSelectedBrowser(browser);
    toast.info(`Preparing ${browser} extension for download...`);
    
    // Simulate download preparation
    setTimeout(() => {
      window.location.href = `/api/download-extension?browser=${browser}`;
      toast.success(`${browser.charAt(0).toUpperCase() + browser.slice(1)} extension download started!`);
    }, 1500);
  };

  // Handle demo trade
  const handleDemoTrade = () => {
    setIsLoading(true);
    toast.info('Analyzing market conditions...');
    
    // Simulate trade execution
    setTimeout(() => {
      // Add new trade
      const newTrade = {
        id: `trade-${activeTrades.length + 1}`,
        token: 'SOL/USD',
        entry: 150.25,
        current: 152.75,
        size: 0.2,
        profit: 1.66,
        time: '1m'
      };
      
      setActiveTrades(prev => [newTrade, ...prev]);
      setTotalTrades(prev => prev + 1);
      setProfitLoss(prev => prev + 0.5);
      
      setIsLoading(false);
      toast.success('Demo trade executed successfully!');
    }, 3000);
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
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">TradeForce AI Extension Demo</h1>
            <p className="text-gray-400">AI-powered trading agent for multiple platforms</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleDownload('chrome')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
                <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z"></path>
              </svg>
              Chrome Extension
            </button>
            <button 
              onClick={() => handleDownload('firefox')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md transition flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
                <path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z"></path>
              </svg>
              Firefox Extension
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex flex-wrap -mb-px">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'overview'
                  ? 'text-blue-500 border-blue-500'
                  : 'border-transparent hover:text-gray-300 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </button>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'features'
                  ? 'text-blue-500 border-blue-500'
                  : 'border-transparent hover:text-gray-300 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('features')}
            >
              Features
            </button>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'demo'
                  ? 'text-blue-500 border-blue-500'
                  : 'border-transparent hover:text-gray-300 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('demo')}
            >
              Live Demo
            </button>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'installation'
                  ? 'text-blue-500 border-blue-500'
                  : 'border-transparent hover:text-gray-300 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('installation')}
            >
              Installation
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">TradeForce AI Trading Agent</h2>
              <p className="mb-4">
                TradeForce AI is a browser extension that serves as an AI-powered trading agent, designed to revolutionize the trading industry by providing users with complete automation and profitability. The extension connects seamlessly to brokerage platforms such as Robinhood, Kraken, and AXIOM, as well as Web3 wallets like Phantom, enabling users to manage traditional and decentralized finance (DeFi) assets effortlessly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-2 text-blue-400">AI-Powered Trading</h3>
                  <p>
                    Utilizes a Grok 3-trained machine learning model to analyze market trends, predict trades, and achieve a 65%+ win rate.
                  </p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-2 text-purple-400">Multi-Platform Support</h3>
                  <p>
                    Connects to Robinhood, Kraken, AXIOM, and Phantom wallet for comprehensive trading across traditional and DeFi markets.
                  </p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-2 text-green-400">Real-Time Market Data</h3>
                  <p>
                    Uses WebSockets for real-time market data and trade execution with minimal latency.
                  </p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-xl font-medium mb-2 text-orange-400">Secure Authentication</h3>
                  <p>
                    Implements OAuth 2.0 for secure brokerage account authentication and non-custodial wallet connections.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => handleTabChange('demo')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition"
                >
                  Try the Demo
                </button>
              </div>
            </div>
          )}
          
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-medium mb-2">AI-Powered Trading</h3>
                  <p className="text-gray-300">
                    The extension uses a Grok 3-trained machine learning model to analyze market trends and predict profitable trades. The AI model is trained on historical price, volume, and sentiment data from connected platforms to achieve a win rate of at least 65%.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-medium mb-2">Multi-Platform Support</h3>
                  <p className="text-gray-300">
                    Connect seamlessly to multiple trading platforms:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                    <li>Robinhood - For stocks and crypto trading</li>
                    <li>Kraken - For advanced crypto trading</li>
                    <li>AXIOM - For specialized trading features</li>
                    <li>Phantom Wallet - For Solana-based Web3 transactions</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-xl font-medium mb-2">Automated Trading</h3>
                  <p className="text-gray-300">
                    Configure risk parameters and let the AI execute trades automatically:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                    <li>User-configurable stop-loss and take-profit levels</li>
                    <li>Position sizing based on risk tolerance</li>
                    <li>Multiple trading strategies (arbitrage, momentum, statistical)</li>
                    <li>Real-time monitoring and adjustment</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-xl font-medium mb-2">Modern UI</h3>
                  <p className="text-gray-300">
                    The extension features a dark-themed, modern, and intuitive user interface:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                    <li>Dark gradient background with blue accents</li>
                    <li>Vertical sidebar with colored navigation buttons</li>
                    <li>Real-time performance metrics and charts</li>
                    <li>Chat interface for natural language interaction with AI</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-xl font-medium mb-2">Security</h3>
                  <p className="text-gray-300">
                    Security is a top priority:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                    <li>OAuth 2.0 for secure brokerage account authentication</li>
                    <li>Non-custodial wallet connections (never stores private keys)</li>
                    <li>Encrypted local storage for sensitive data</li>
                    <li>Detailed audit logging for all transactions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Demo Tab */}
          {activeTab === 'demo' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Live Demo</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4"></div>
                    <p className="text-xl">Loading...</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-400 text-sm">Win Rate</div>
                      <div className="text-xl font-semibold text-green-500">{winRate}%</div>
                      <div className="w-full bg-gray-600 h-2 rounded-full mt-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full" 
                          style={{ width: `${winRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-400 text-sm">Total Trades</div>
                      <div className="text-xl font-semibold">{totalTrades}</div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-400 text-sm">Profit/Loss</div>
                      <div className={`text-xl font-semibold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} SOL
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-gray-400 text-sm">Active Trades</div>
                      <div className="text-xl font-semibold">{activeTrades.length}</div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        No active trades. Start a demo trade to begin.
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <button 
                      onClick={handleDemoTrade}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : 'Execute Demo Trade'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Installation Tab */}
          {activeTab === 'installation' && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Installation Guide</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium mb-2">System Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Browser: Chrome 88+, Firefox 86+, or Edge 88+</li>
                    <li>Operating System: Windows 10/11, macOS 10.15+, or Linux</li>
                    <li>Internet Connection: Stable broadband connection (5+ Mbps recommended)</li>
                    <li>Memory: 4GB RAM minimum (8GB recommended)</li>
                    <li>Storage: 100MB free space</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Chrome Installation</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Download the Chrome extension package using the button above</li>
                    <li>Open Chrome and navigate to <code className="bg-gray-700 px-1 rounded">chrome://extensions/</code></li>
                    <li>Enable "Developer mode" by toggling the switch in the top right corner</li>
                    <li>Drag and drop the downloaded <code className="bg-gray-700 px-1 rounded">.zip</code> file onto the extensions page</li>
                    <li>Click "Add extension" when prompted</li>
                    <li>The extension will be installed and the icon will appear in your browser toolbar</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Firefox Installation</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Download the Firefox extension package using the button above</li>
                    <li>Open Firefox and navigate to <code className="bg-gray-700 px-1 rounded">about:addons</code></li>
                    <li>Click the gear icon and select "Install Add-on From File..."</li>
                    <li>Select the downloaded <code className="bg-gray-700 px-1 rounded">.xpi</code> file and click "Open"</li>
                    <li>Click "Add" when prompted</li>
                    <li>The extension will be installed and the icon will appear in your browser toolbar</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium mb-2">Post-Installation Setup</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Click the TradeForce AI icon in your browser toolbar to open the extension popup</li>
                    <li>Follow the on-screen instructions to configure your preferences</li>
                    <li>Connect your trading platforms (Robinhood, Kraken, AXIOM) and Phantom wallet</li>
                    <li>Configure your trading parameters (risk level, position size, etc.)</li>
                    <li>Start trading with AI assistance!</li>
                  </ol>
                </div>
                
                <div className="flex justify-center space-x-4 mt-8">
                  <button 
                    onClick={() => handleDownload('chrome')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition"
                  >
                    Download for Chrome
                  </button>
                  <button 
                    onClick={() => handleDownload('firefox')}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-md font-medium transition"
                  >
                    Download for Firefox
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
