'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/lib/WalletProvider';
import { NETWORK_UI } from '@/constants/network';
import { getSolanaFee } from '@/lib/networks';
import AIRecommendations from '@/components/AIRecommendations';
import BotBuilder from '@/components/BotBuilder';
import CommunityForum from '@/components/CommunityForum';
import Challenges from '@/components/Challenges';
import PnLTab from '@/components/PnLTab';
import CoinSelector from '@/components/CoinSelector';
import SwapToEMB from '@/components/SwapToEMB';
import { initializeNotifications } from '@/lib/notifications';
import { updateTradeStats, recordSwapToEmb } from '@/lib/gamification';
import embTokenManager from '@/lib/embToken';
import { Connection } from '@solana/web3.js';
import dynamic from 'next/dynamic';

// Dynamically import components that use browser APIs or cause hydration issues
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const TradingSimulator = dynamic(
  () => import('@/components/TradingSimulator'),
  { ssr: false }
);

const PortfolioTracker = dynamic(
  () => import('@/components/PortfolioTracker'),
  { ssr: false }
);

const InteractiveTutorial = dynamic(
  () => import('@/components/InteractiveTutorial'),
  { ssr: false }
);

export default function Home() {
  const [tab, setTab] = useState('dashboard');
  const [walletAddress, setWalletAddress] = useState(null);
  const [mockMode, setMockMode] = useState(true);
  const [mockTradeResults, setMockTradeResults] = useState([]);
  const [tradeStatus, setTradeStatus] = useState('idle');
  const [leverage, setLeverage] = useState(1);
  const [autoTrade, setAutoTrade] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [mockBalances, setMockBalances] = useState({
    SOL: 100,
    USDC: 100,
    JITO: 100,
    EMB: 0
  });
  const [rewardNotifications, setRewardNotifications] = useState([]);
  const [userStats, setUserStats] = useState({
    trades: 0,
    winRate: 0,
    totalProfit: 0,
    level: 1,
    xp: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [embBalance, setEmbBalance] = useState(0);
  const [tokenError, setTokenError] = useState(null);
  const [solanaFee, setSolanaFee] = useState(0.000005); // Default fee
  const { publicKey } = useWallet();

  // Client-side only code wrapped in useEffect
  useEffect(() => {
    initializeNotifications();
    
    // Fetch Solana fee when component mounts (client-side only)
    const fetchSolanaFee = async () => {
      try {
        const fee = await getSolanaFee();
        setSolanaFee(fee);
      } catch (error) {
        console.error('Error fetching Solana fee:', error);
        // Fallback fee is set as default state
      }
    };

    fetchSolanaFee();
    
    // Refresh fee every 5 minutes
    const feeInterval = setInterval(fetchSolanaFee, 5 * 60 * 1000);
    
    return () => clearInterval(feeInterval);
  }, []);

  const fetchBalance = useCallback(async (address) => {
    if (address) {
      try {
        const balance = await embTokenManager.getBalance(address);
        setEmbBalance(balance);
        // Ensure EMB balance is also reflected in mockBalances
        setMockBalances(prev => ({
          ...prev,
          EMB: balance
        }));
        setTokenError(null);
      } catch (err) {
        console.error('Error fetching EMB balance:', err);
        setTokenError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    if (publicKey) {
      const address = publicKey.toString();
      setWalletAddress(address);
      fetchBalance(address);
    } else {
      setWalletAddress(null);
      setEmbBalance(0);
    }
  }, [publicKey, fetchBalance]);

  // Auto-trade effect
  useEffect(() => {
    if (autoTrade && walletAddress) {
      const interval = setInterval(async () => {
        try {
          const signals = await fetch('/api/trading-signals').then(res => res.json());
          if (signals.signal !== 'HOLD' && signals.confidence > 65) {
            const trade = {
              type: signals.signal.toLowerCase(),
              amount: 100,
              price: signals.price,
              strategy: signals.strategies[0],
              tradingCoin: selectedCoin,
              timestamp: new Date().toISOString()
            };
            
            const result = await executeTrade(trade);
            if (result.success) {
              setMockTradeResults(prev => [...prev, trade]);
              
              const statsUpdate = await updateTradeStats(walletAddress, {
                ...trade,
                profit: result.profit,
                usedEmbToken: selectedCoin === 'EMB',
                embAmount: selectedCoin === 'EMB' ? trade.amount : 0
              });
              
              setUserStats(prev => ({
                ...prev,
                trades: prev.trades + 1,
                winRate: statsUpdate.stats.winRate,
                totalProfit: prev.totalProfit + (result.profit || 0),
                level: statsUpdate.xp.newLevel,
                xp: statsUpdate.xp.currentXP
              }));

              // Show XP bonus notification if present
              if (statsUpdate.xp && statsUpdate.xp.bonusXp) {
                setRewardNotifications(prev => [...prev, {
                  type: 'bonus-xp',
                  title: 'Bonus XP',
                  message: `+${statsUpdate.xp.bonusXp} XP for ${statsUpdate.xp.bonusReason}`,
                  timestamp: Date.now()
                }]);
              }
              
              if (statsUpdate.achievements && statsUpdate.achievements.length > 0) {
                statsUpdate.achievements.forEach(achievement => {
                  setNotifications(prev => [...prev, {
                    type: 'achievement',
                    title: 'Achievement Unlocked!',
                    message: `${achievement.name}: ${achievement.description}`,
                    reward: achievement.reward
                  }]);
                });
              }
              if (statsUpdate.xp && statsUpdate.xp.leveledUp) {
                setNotifications(prev => [...prev, {
                  type: 'level-up',
                  title: 'Level Up!',
                  message: `You've reached level ${statsUpdate.xp.newLevel}: ${statsUpdate.xp.rewards.title}`,
                  reward: statsUpdate.xp.rewards.embTokens
                }]);
              }
            }
          }
        } catch (error) {
          console.error('Auto-trade error:', error);
          setNotifications(prev => [...prev, {
            type: 'error',
            title: 'Auto-trade Error',
            message: error.message
          }]);
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoTrade, walletAddress, selectedCoin]);

  const validateEMBBalance = useCallback((requiredAmount = 0.1) => {
    if (!embBalance || embBalance < requiredAmount) {
      setNotifications(prev => [...prev, {
        type: 'error',
        title: 'Insufficient Balance',
        message: `You need at least ${requiredAmount} EMB tokens to perform this action.`
      }]);
      return false;
    }
    return true;
  }, [embBalance]);

  const handleSwapToEmb = useCallback(async (fromCoin, toCoin, amount) => {
    try {
      // Check if user has enough balance of the source coin
      if (mockBalances[fromCoin] < amount) {
        throw new Error(`Insufficient ${fromCoin} balance`);
      }
      
      // Update mock balances
      setMockBalances(prev => ({
        ...prev,
        [fromCoin]: prev[fromCoin] - amount,
        [toCoin]: prev[toCoin] + amount
      }));
      
      // Record the swap with gamification system
      const swapReward = await recordSwapToEmb(walletAddress, amount);
      
      // Show notification for the swap
      setNotifications(prev => [...prev, {
        type: 'success',
        title: 'Swap Successful',
        message: `Swapped ${amount} ${fromCoin} to ${amount} ${toCoin}`
      }]);
      
      // Show XP bonus notification if received
      if (swapReward.bonusXp) {
        setRewardNotifications(prev => [...prev, {
          type: 'bonus-xp',
          title: 'Bonus XP',
          message: `+${swapReward.bonusXp} XP for ${swapReward.bonusReason}`,
          timestamp: Date.now()
        }]);
      }
      
      return true;
    } catch (error) {
      console.error('Swap error:', error);
      setNotifications(prev => [...prev, {
        type: 'error',
        title: 'Swap Failed',
        message: error.message
      }]);
      return false;
    }
  }, [mockBalances, walletAddress]);

  const executeTrade = useCallback(async (trade) => {
    try {
      // If trading with EMB, use the real EMB token manager
      if (trade.tradingCoin === 'EMB') {
        const fees = await embTokenManager.validateTradeFees(walletAddress);
        if (!fees.canTrade) {
          throw new Error(`Insufficient EMB balance. Required: ${fees.tradeFee} EMB`);
        }
        await embTokenManager.deductTradeFee(walletAddress);
        
        // Update the real EMB balance
        const newBalance = await embTokenManager.getBalance(walletAddress);
        setEmbBalance(newBalance);
        
        // Also update the mock balance for EMB
        setMockBalances(prev => ({
          ...prev,
          EMB: newBalance
        }));
      } else {
        // For other coins, just check the mock balance
        const requiredAmount = trade.amount;
        
        // Add Solana fee to required amount when trading with SOL
        const appliedFee = trade.tradingCoin === 'SOL' ? solanaFee : 0;
        
        if (mockBalances[trade.tradingCoin] < requiredAmount + appliedFee) {
          throw new Error(`Insufficient ${trade.tradingCoin} balance (including ${appliedFee.toFixed(6)} SOL fee)`);
        }
        
        // Deduct the trade amount and Solana fee from mock balances
        setMockBalances(prev => ({
          ...prev,
          [trade.tradingCoin]: prev[trade.tradingCoin] - requiredAmount,
          SOL: trade.tradingCoin === 'SOL' 
            ? prev.SOL - appliedFee 
            : prev.SOL - solanaFee // Always deduct Solana fee from SOL balance
        }));
      }
      
      if (mockMode) {
        // Simulate a profit or loss
        const profitMultiplier = Math.random() > 0.4 ? 1 : -1;
        const profit = trade.amount * trade.price * 0.02 * profitMultiplier;
        
        // Add the profit/loss to the balance of the trading coin
        setMockBalances(prev => ({
          ...prev,
          [trade.tradingCoin]: prev[trade.tradingCoin] + profit
        }));
        
        // Show successful trade notification with fee
        setNotifications(prev => [...prev, {
          type: 'success',
          title: 'Trade Executed',
          message: `Trade executed successfully. Solana Fee: ${solanaFee.toFixed(6)} SOL`
        }]);
        
        return {
          success: true,
          profit,
          tradingCoin: trade.tradingCoin,
          solanaFee
        };
      } else {
        throw new Error('Live trading with EMBAI is coming soon');
      }
    } catch (err) {
      console.error('Trade execution error:', err);
      setNotifications(prev => [...prev, {
        type: 'error',
        title: 'Trade Error',
        message: err.message
      }]);
      throw err;
    }
  }, [walletAddress, mockMode, mockBalances, solanaFee]);

  const dismissNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Remove reward notifications after 5 seconds
  useEffect(() => {
    if (rewardNotifications.length > 0) {
      const timer = setTimeout(() => {
        setRewardNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 5000));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [rewardNotifications]);

  // Client component rendering
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800/80 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex space-x-2">
            {['dashboard', 'trade', 'pnl', 'portfolio', 'learn'].map((tabName) => (
              <button
                key={tabName}
                onClick={() => setTab(tabName)}
                className={`nav-tab ${tab === tabName ? 'active' : ''}`}
              >
                {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button 
                onClick={() => setAutoTrade(!autoTrade)} 
                className={`action-button ${autoTrade ? 'primary' : 'secondary'}`}
              >
                {autoTrade ? 'Stop Auto-Trading' : 'Start Auto-Trading'}
              </button>
              <button 
                onClick={() => setMockMode(!mockMode)}
                className={`action-button ${mockMode ? 'secondary' : 'primary'}`}
              >
                {mockMode ? 'Mock Trading' : 'Live Trading'}
              </button>
            </div>
            {/* Use NoSSR pattern for hydration-sensitive components */}
            {typeof window !== 'undefined' && (
              <div className="wallet-button-container">
                <WalletMultiButton />
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Trading Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400">Total Trades</p>
                    <p className="text-2xl">{userStats.trades}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Win Rate</p>
                    <p className="text-2xl">{(userStats.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Profit</p>
                    <p className="text-2xl">${userStats.totalProfit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Level</p>
                    <p className="text-2xl">{userStats.level}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-gray-400">XP Progress</p>
                  <div className="w-full bg-gray-700 h-2 rounded-full mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(userStats.xp % 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <AIRecommendations walletAddress={walletAddress} />
            </div>
            
            {/* Paper Trading Balances Section */}
            <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Paper Trading Balances</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(mockBalances).map(([coin, balance]) => (
                  <div key={coin} className="p-4 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">${coin}</span>
                      <div className={`w-2 h-2 rounded-full ${coin === 'SOL' ? 'bg-purple-400' : coin === 'USDC' ? 'bg-blue-400' : coin === 'JITO' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    </div>
                    <p className="text-2xl font-bold mt-1">{balance.toFixed(4)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-sm">
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                  <span>Current Solana Transaction Fee: <span className="font-medium text-blue-400">{solanaFee.toFixed(6)} SOL</span></span>
                </div>
                <p className="text-gray-400 mt-1 ml-7">Fees are applied to all mock trades to simulate real network costs</p>
              </div>
            </div>
          </div>
        )}
        
        {tab === 'trade' && (
          <div className="trade-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Trading Simulator</h2>
                {walletAddress ? (
                  <div>
                    <CoinSelector 
                      selectedCoin={selectedCoin} 
                      onCoinChange={setSelectedCoin} 
                    />
                    
                    {/* Dynamically imported component */}
                    <TradingSimulator 
                      onSuccessfulTrade={(trade) => {
                        const tradeWithCoin = { ...trade, tradingCoin: selectedCoin };
                        setMockTradeResults(prev => [...prev, tradeWithCoin]);
                      }}
                      selectedCoin={selectedCoin}
                      coinBalance={mockBalances[selectedCoin]}
                    />
                    
                    <SwapToEMB 
                      selectedCoin={selectedCoin}
                      balances={mockBalances}
                      onSwap={handleSwapToEmb}
                    />
                  </div>
                ) : (
                  <p className="text-gray-400">Connect your wallet to start trading</p>
                )}
              </div>
              <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Bot Builder</h2>
                <BotBuilder />
              </div>
            </div>
          </div>
        )}
        
        {tab === 'pnl' && (
          <PnLTab trades={mockTradeResults} walletAddress={walletAddress} />
        )}
        
        {tab === 'portfolio' && typeof window !== 'undefined' && (
          <PortfolioTracker walletAddress={walletAddress} balances={mockBalances} />
        )}
        
        {tab === 'learn' && (
          <div className="space-y-6">
            {typeof window !== 'undefined' && <InteractiveTutorial />}
            <Challenges />
            <CommunityForum />
          </div>
        )}
      </main>
      
      {/* Reward notifications */}
      <div className="fixed top-20 right-4 space-y-2 z-50 pointer-events-none">
        {rewardNotifications.map((notification, index) => (
          <div
            key={index}
            className="p-3 bg-blue-900 text-blue-200 rounded-lg shadow-lg animate-slideInRight border-l-4 border-blue-500 max-w-xs"
          >
            <h4 className="font-bold text-white">{notification.title}</h4>
            <p className="text-sm">{notification.message}</p>
          </div>
        ))}
      </div>

      {/* Regular notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow-lg transition-all transform translate-y-0 
                      ${notification.type === 'error' ? 'bg-red-600' : 
                        notification.type === 'success' ? 'bg-green-600' : 'bg-blue-600'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{notification.title}</h3>
                <p className="text-sm">{notification.message}</p>
                {notification.reward && (
                  <p className="mt-1 text-xs font-bold">
                    Reward: {notification.reward} {typeof notification.reward === 'number' ? 'XP' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissNotification(index)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}