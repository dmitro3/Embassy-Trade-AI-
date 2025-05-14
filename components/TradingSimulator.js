'use client';

import { useState, useEffect } from 'react';
import { GamificationSystem } from '../lib/gamification';
import EMBTokenManager from '../lib/embToken';
import { useWallet } from '../lib/WalletProvider';
import useTradeWebSocket from '../lib/useTradeWebSocket';
import { getSolanaFee } from '../lib/networks';
import styles from './TradingSimulator.module.css';

function SignalIndicators({ signal }) {
  if (!signal) return null;
  return (
    <div className={`${styles.infoSection} ${signal.trend === 'up' ? 'border-green-500/30' : 'border-red-500/30'}`}>
      <div className="flex items-center space-x-4">
        <div className={styles.signal}>
          <div className={`w-3 h-3 rounded-full ${signal.trend === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div>
          <p className="font-medium">{signal.name}</p>
          <p className="text-sm text-gray-400">{signal.description}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${signal.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {signal.confidence}%
        </p>
        <p className="text-sm text-gray-400">Confidence</p>
      </div>
    </div>
  );
}

export default function TradingSimulator({ mockMode = true, onSuccessfulTrade, embBalance, selectedCoin }) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toString();

  const [tradeStatus, setTradeStatus] = useState('idle');
  const [mockTradeResults, setMockTradeResults] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [userStats, setUserStats] = useState({
    trades: 0,
    winRate: 0,
    totalProfit: 0
  });
  const [gamification] = useState(() => new GamificationSystem(walletAddress));
  const [notifications, setNotifications] = useState([]);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [tradeFee, setTradeFee] = useState(0.1); // Default EMB fee
  const [tradeAmount, setTradeAmount] = useState('');
  const [virtualPositions, setVirtualPositions] = useState([]);
  const [solanaFee, setSolanaFee] = useState(0.000005); // Default Solana fee

  const { 
    isConnected, 
    latestSignal, 
    autoAccept, 
    toggleAutoAccept,
    connectionError,
    tradePrompt,
    solanaFee: websocketSolanaFee
  } = useTradeWebSocket();

  useEffect(() => {
    const fetchSolanaFee = async () => {
      try {
        const fee = await getSolanaFee();
        setSolanaFee(fee);
      } catch (error) {
        console.error('Error fetching Solana fee:', error);
      }
    };

    fetchSolanaFee();
  }, []);

  useEffect(() => {
    if (websocketSolanaFee && websocketSolanaFee !== solanaFee) {
      setSolanaFee(websocketSolanaFee);
    }
  }, [websocketSolanaFee]);

  useEffect(() => {
    if (!walletAddress) {
      setTradingEnabled(false);
      setMockTradeResults([]);
      setUserStats({
        trades: 0,
        winRate: 0,
        totalProfit: 0
      });
    }
  }, [walletAddress]);

  useEffect(() => {
    const checkTradeEligibility = async () => {
      if (!walletAddress) {
        setTradingEnabled(false);
        return;
      }

      try {
        const fees = await EMBTokenManager.validateTradeFees(walletAddress);
        setTradingEnabled(fees.canTrade);
        setTradeFee(fees.tradeFee);
      } catch (err) {
        console.error('Error checking trade eligibility:', err);
        setTradingEnabled(false);
      }
    };

    checkTradeEligibility();
  }, [walletAddress, embBalance]);

  useEffect(() => {
    if (latestSignal) {
      setAccountInfo(prev => ({
        ...prev,
        signals: [latestSignal]
      }));
    }
  }, [latestSignal]);

  useEffect(() => {
    if (!isConnected) {
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'warning',
          title: 'Connection Status',
          message: 'Reconnecting to trading server...'
        }
      ]);
    }
  }, [isConnected]);

  useEffect(() => {
    if (embBalance !== undefined) {
      setTradingEnabled(embBalance >= tradeFee);
    }
  }, [embBalance, tradeFee]);

  const dismissNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const executeTrade = async (action) => {
    if (!walletAddress) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to trade.'
      }]);
      return;
    }

    if (!tradingEnabled) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Insufficient EMB Balance',
        message: `You need at least ${tradeFee} EMB to execute a trade.`
      }]);
      return;
    }

    try {
      setTradeStatus('loading');
      const data = await fetch('/api/trade-signals');
      const signals = await data.json();

      if (mockMode) {
        const tradeSignal = signals.signals?.[0];
        if (tradeSignal) {
          const result = {
            signal: action,
            amount: tradeAmount || 1,
            price: tradeSignal.price,
            strategy: tradeSignal.strategy,
            timestamp: Date.now(),
            confidence: tradeSignal.confidence,
            fee: tradeFee,
            solanaFee: solanaFee,
            profit: 0
          };

          const success = Math.random() < tradeSignal.confidence;
          if (success) {
            result.profit = (result.amount * result.price * 0.05) - tradeFee;
          } else {
            result.profit = -(result.amount * result.price * 0.02) - tradeFee;
          }

          setMockTradeResults(prev => [...prev, result]);
          setTradeStatus('success');

          if (action === 'buy') {
            setVirtualPositions(prev => [...prev, result]);
          } else if (action === 'sell') {
            setVirtualPositions(prev => prev.filter(pos => pos.amount !== result.amount));
          }

          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            title: 'Trade Executed',
            message: `${action.toUpperCase()} order executed. Solana Fee: ${solanaFee.toFixed(6)} SOL`
          }]);

          if (onSuccessfulTrade) {
            onSuccessfulTrade({
              ...result,
              tradingCoin: selectedCoin,
              solanaFee
            });
          }

          setUserStats(prev => ({
            trades: prev.trades + 1,
            winRate: ((prev.winRate * prev.trades) + (success ? 1 : 0)) / (prev.trades + 1),
            totalProfit: prev.totalProfit + result.profit
          }));
        }
      } else {
        setTradeStatus('error');
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'warning',
          title: 'Live Trading Not Available',
          message: 'Live trading with EMBAI token coming soon!'
        }]);
      }
    } catch (err) {
      console.error('Trade Error:', err);
      setTradeStatus('error');
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Trade Error',
        message: err.message
      }]);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${styles.infoSection} ${
        isConnected ? 'border-green-500/30' : 'border-yellow-500/30'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <p className={`text-sm ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
            {isConnected ? 'Connected to trading server' : 'Connecting to trading server...'}
          </p>
        </div>
        {connectionError && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/40 rounded text-sm text-red-400">
            {connectionError}
          </div>
        )}
        {isConnected && (
          <div className="flex items-center space-x-2">
            <label htmlFor="autoAcceptToggle" className="text-sm text-gray-400">
              Auto-accept trades (24/7):
            </label>
            <div className="relative inline-block w-10 align-middle select-none">
              <input 
                type="checkbox" 
                name="autoAcceptToggle" 
                id="autoAcceptToggle" 
                className="sr-only"
                checked={autoAccept}
                onChange={() => toggleAutoAccept(!autoAccept)} 
              />
              <div className={`block w-10 h-5 rounded-full ${autoAccept ? 'bg-green-500' : 'bg-gray-600'} transition-colors`}></div>
              <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${autoAccept ? 'transform translate-x-5' : ''}`}></div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.tradeCard}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Trading Simulator</h2>
            <p className="text-gray-400">Practice trading with mock assets</p>
          </div>
          {embBalance > 0 && (
            <div className={styles.statCard}>
              <p className="text-sm text-gray-400">EMB Balance</p>
              <p className="text-xl font-bold text-blue-400">{embBalance.toFixed(2)} EMB</p>
            </div>
          )}
        </div>

        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM6.293 6.707a1 1 0 011.414 0L9 8.414l1.293-1.293a1 1 0 111.414 1.414L10.414 10l1.293 1.293a1 1 0 01-1.414 1.414L9 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L7.586 10 6.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-blue-400">Network Fee</p>
            </div>
            <span className="text-sm font-medium text-blue-300">{solanaFee.toFixed(6)} SOL</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-7">Applied to each trade to simulate real Solana transaction costs</p>
        </div>

        {autoAccept && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/40 rounded-lg text-center">
            <p className="text-blue-400 font-medium">Auto-Trading Enabled</p>
            <p className="text-xs text-gray-400">
              The system will automatically accept trades based on signals
            </p>
          </div>
        )}

        {accountInfo?.signals && <SignalIndicators signal={accountInfo.signals[0]} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className={styles.statCard}>
            <p className="text-sm text-gray-400">Win Rate</p>
            <p className="text-2xl font-bold">{(userStats.winRate * 100).toFixed(1)}%</p>
          </div>
          <div className={styles.statCard}>
            <p className="text-sm text-gray-400">Total Profit/Loss</p>
            <p className={`text-2xl font-bold ${userStats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${userStats.totalProfit.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="number"
              placeholder="Enter amount"
              className={styles.tradeInput}
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => executeTrade('buy')}
                disabled={!tradingEnabled || tradeStatus === 'loading'}
                className={`${styles.tradeButton} ${styles.buy}`}
              >
                Buy
              </button>
              <button
                onClick={() => executeTrade('sell')}
                disabled={!tradingEnabled || tradeStatus === 'loading' || virtualPositions.length === 0}
                className={`${styles.tradeButton} ${styles.sell}`}
              >
                Sell
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-400 flex justify-between items-center">
            <div className="flex space-x-4">
              <span>EMB Fee: {tradeFee} EMB</span>
              <span>SOL Fee: {solanaFee.toFixed(6)} SOL</span>
            </div>
            {tradeStatus === 'loading' && (
              <span className="text-blue-400">Processing trade...</span>
            )}
          </div>
        </div>

        {!tradingEnabled && (
          <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-sm text-red-400">
              Insufficient EMB balance. You need at least {tradeFee} EMB tokens to trade.
            </p>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="fixed bottom-4 right-4 space-y-2">
            {notifications.map((notification, index) => (
              <div
                key={notification.id || index}
                className={`${styles.notification} ${
                  notification.type === 'error' ? 'bg-red-900/90' : 'bg-green-900/90'
                } border ${
                  notification.type === 'error' ? 'border-red-500/50' : 'border-green-500/50'
                } rounded-lg p-4 backdrop-blur-sm shadow-xl`}
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold">{notification.title}</h3>
                    <p className="text-sm">{notification.message}</p>
                    {notification.rewards?.embTokens && (
                      <p className="text-sm text-yellow-300">+{notification.rewards.embTokens} EMB</p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissNotification(index)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}