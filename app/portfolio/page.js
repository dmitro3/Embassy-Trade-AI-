'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import EmbassyBanner from '@/components/EmbassyBanner';

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [embBalance, setEmbBalance] = useState(0);
  const [pnlStats, setPnlStats] = useState({ day: 0, week: 0, month: 0, all: 0 });
  const [selectedTimeframe, setSelectedTimeframe] = useState('day');
  const [hasEmb, setHasEmb] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Mock portfolio data
  const mockTokens = [
    { name: 'Solana', symbol: 'SOL', balance: 5.23, value: 647.38, change24h: 4.2, logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
    { name: 'Jupiter', symbol: 'JUP', balance: 125.5, value: 321.28, change24h: -2.1, logo: 'https://cryptologos.cc/logos/jupiter-jup-logo.png' },
    { name: 'BONK', symbol: 'BONK', balance: 1250000, value: 187.50, change24h: 12.4, logo: 'https://cryptologos.cc/logos/bonk-bonk-logo.png' },
    { name: 'Jito', symbol: 'JTO', balance: 42.8, value: 134.82, change24h: 1.8, logo: 'https://cryptologos.cc/logos/jito-jto-logo.png' },
    { name: 'Embassy AI', symbol: 'EMB', balance: 150, value: 75.00, change24h: 5.3, logo: '' }
  ];

  // Check if user has EMB token from local storage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedHasEmb = localStorage.getItem('hasEmb') === 'true';
      setHasEmb(storedHasEmb);
      
      // Load EMB balance from local storage
      const storedBalance = parseFloat(localStorage.getItem('embBalance')) || 0;
      setEmbBalance(storedBalance);
      
      // Premium users have 100+ EMB
      setIsPremiumUser(storedBalance >= 100);
      
      // Set mock portfolio data
      setPortfolioData(mockTokens);
      
      // Calculate total balance
      const total = mockTokens.reduce((acc, token) => acc + token.value, 0);
      setTotalBalance(total);
      
      // Set mock PnL statistics
      setPnlStats({
        day: 3.8,
        week: -1.2,
        month: 12.5,
        all: 28.4
      });
      
      setIsLoading(false);
    }
  }, []);

  const handleNavLinkClick = (e, path) => {
    if (path !== '/portfolio') {
      e.preventDefault();
      alert('Coming Soon! This feature is under development.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Beta Banner */}
      <div className="bg-amber-500 text-black p-2 text-center font-medium">
        Beta Mode: Proof of Concept for Solana Early Adopters
      </div>
      
      {/* $EMBAI Migration Banner */}
      <div className="bg-blue-600 text-white p-2 text-center font-medium">
        $EMB will soon migrate to $EMBAI, the official token with full tokenomics and a whitepaper. Stay tuned!
      </div>
      
      {/* Navigation */}
      <nav className="bg-gray-800/80 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex space-x-6 md:flex-row flex-col md:space-y-0 space-y-2">
            <Link href="/" className="text-white hover:text-blue-300" onClick={(e) => handleNavLinkClick(e, '/')}>Dashboard</Link>
            <Link href="/simulation" className="text-white hover:text-blue-300">Simulation</Link>
            <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 font-medium">Portfolio</Link>
            <Link href="#" className="text-white hover:text-blue-300" onClick={(e) => handleNavLinkClick(e, '/settings')}>Settings</Link>
          </div>
          <div>
            <h1 className="text-xl font-bold">Embassy Portfolio Tracker</h1>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        {/* Portfolio Overview Banner */}
        <div className="relative mb-6 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 h-[180px] flex items-center">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Your Portfolio</h1>
                  <p className="text-gray-300 max-w-xl">
                    Track your Solana assets and trading performance
                  </p>
                </div>
                
                <div className="bg-gray-800/60 backdrop-blur-sm p-4 rounded-lg mt-4 md:mt-0">
                  <div className="text-sm text-gray-400">Total Balance</div>
                  <div className="text-2xl font-bold text-white">${totalBalance.toFixed(2)}</div>
                  <div className={`text-sm ${pnlStats[selectedTimeframe] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlStats[selectedTimeframe] >= 0 ? '+' : ''}{pnlStats[selectedTimeframe]}% ({selectedTimeframe})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        {!connected && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-4">
              Connect your Solana wallet to view your portfolio and track your assets.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
              Connect Wallet
            </button>
          </div>
        )}
        
        {/* Portfolio Assets */}
        {connected && (
          <>
            {/* Timeframe Selector */}
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Performance</h2>
                <div className="flex bg-gray-700 rounded-lg p-1">
                  {['day', 'week', 'month', 'all'].map((timeframe) => (
                    <button
                      key={timeframe}
                      onClick={() => setSelectedTimeframe(timeframe)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedTimeframe === timeframe
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {timeframe === 'day' ? '24h' : 
                       timeframe === 'week' ? '7d' :
                       timeframe === 'month' ? '30d' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 h-40 bg-gray-700/50 rounded-lg flex items-center justify-center">
                {isPremiumUser ? (
                  <div className="w-full h-full p-4">
                    {/* Mock chart - replace with actual chart component */}
                    <div className="h-full w-full flex items-end justify-between">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const height = 20 + Math.random() * 60;
                        return (
                          <div 
                            key={i} 
                            style={{ height: `${height}%` }}
                            className={`w-[7%] rounded-t-sm ${
                              i % 3 === 0 ? 'bg-blue-500/70' :
                              i % 3 === 1 ? 'bg-blue-600/70' : 'bg-blue-700/70'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <div className="text-blue-400 text-xl mb-2">📊 Premium Feature</div>
                    <p className="text-gray-400 mb-3">Hold 100+ $EMB to access detailed portfolio analytics</p>
                    <Link 
                      href="/simulation" 
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      Get $EMB Tokens
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Assets Table */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Assets</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="pb-3 text-left">Asset</th>
                        <th className="pb-3 text-right">Balance</th>
                        <th className="pb-3 text-right">Value (USD)</th>
                        <th className="pb-3 text-right">24h Change</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.map((token) => (
                        <tr key={token.symbol} className="border-b border-gray-700">
                          <td className="py-4">
                            <div className="flex items-center">
                              {token.logo ? (
                                <img 
                                  src={token.logo} 
                                  alt={token.name} 
                                  className="w-6 h-6 rounded-full mr-3" 
                                />
                              ) : (
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                                  {token.symbol[0]}
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{token.name}</div>
                                <div className="text-gray-500 text-xs">{token.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-right font-mono">
                            {token.balance.toLocaleString(undefined, { 
                              maximumFractionDigits: token.balance > 100 ? 0 : 2 
                            })}
                          </td>
                          <td className="py-4 text-right">
                            ${token.value.toFixed(2)}
                          </td>
                          <td className={`py-4 text-right ${
                            token.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}%
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button className="px-2 py-1 bg-blue-600/30 text-blue-400 rounded-md text-xs hover:bg-blue-600/50">
                                Trade
                              </button>
                              <button className="px-2 py-1 bg-purple-600/30 text-purple-400 rounded-md text-xs hover:bg-purple-600/50">
                                Stake
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Trading History - Premium Feature */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Trading History <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded ml-2">Premium</span></h2>
                {!isPremiumUser && (
                  <div className="text-sm text-blue-400">
                    Requires 100+ $EMB
                  </div>
                )}
              </div>
              
              {isPremiumUser ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="pb-3 text-left">Date</th>
                        <th className="pb-3 text-left">Pair</th>
                        <th className="pb-3 text-left">Type</th>
                        <th className="pb-3 text-right">Price</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3 text-right">PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const formattedDate = date.toLocaleDateString();
                        const pairs = ['SOL/USDC', 'JUP/USDC', 'BONK/USDC', 'JTO/USDC', 'EMB/USDC'];
                        const types = ['BUY', 'SELL'];
                        const isProfit = Math.random() > 0.5;
                        const profitAmount = (Math.random() * 50 * (isProfit ? 1 : -1)).toFixed(2);
                        
                        return (
                          <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                            <td className="py-3">{formattedDate}</td>
                            <td className="py-3">{pairs[i % pairs.length]}</td>
                            <td className={`py-3 ${
                              i % 2 === 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {types[i % 2]}
                            </td>
                            <td className="py-3 text-right">
                              ${(Math.random() * 100 + 10).toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              {(Math.random() * 10 + 1).toFixed(3)}
                            </td>
                            <td className={`py-3 text-right ${
                              isProfit ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {isProfit ? '+' : '-'}${Math.abs(profitAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                  <p className="text-gray-400 mb-4">
                    Unlock detailed trading history and performance analytics by holding at least 100 $EMB tokens.
                  </p>
                  <Link 
                    href="/simulation" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
                  >
                    Get $EMB Tokens
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Download App Button */}
        <div className="mt-8 text-center">
          <a 
            href="https://embassyai.xyz/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download App for More Features
          </a>
        </div>
      </main>
    </div>
  );
}