'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePhotonApi } from '../lib/usePhotonApi';
import { useTokenService } from '../lib/tokenService';
import EMBAITokenManager, { TRADING_FEE_DISCOUNT } from '../lib/embaiToken';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { FixedSizeList as List } from 'react-window';
import PnLTab from './PnLTab';
import TradeSignals from './TradeSignals';
import AutoTradeModal from './AutoTradeModal';
import MigrationPortal from './MigrationPortal';

/**
 * Main trading interface component that integrates Photon API
 * @param {Object} props - Component props
 * @param {string} props.devnetWallet - Devnet wallet address for testing
 */
const TradeTab = ({ devnetWallet }) => {
  const { publicKey, connected } = useWallet();
  const { connectWallet } = useTokenService();
  const [showAutoTradeModal, setShowAutoTradeModal] = useState(false);
  const [autoAcceptTrades, setAutoAcceptTrades] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [activePosition, setActivePosition] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState('SOL-USD');
  const [embBalance, setEmbBalance] = useState(0);
  const [embaiBalance, setEmbaiBalance] = useState(0);
  const [hasGraduated, setHasGraduated] = useState(false);
  const [isLiveTokenActive, setIsLiveTokenActive] = useState(false);
  const [showMigrationPortal, setShowMigrationPortal] = useState(false);
  const [currentTrade, setCurrentTrade] = useState(null);
  const [useEmbaiForFees, setUseEmbaiForFees] = useState(true);
  const [pnlData, setPnlData] = useState({
    paperPnl: 0,
    livePnl: 0,
    totalTrades: 0,
    winRate: 0,
  });

  // Bot Boost state
  const [botBoostActive, setBotBoostActive] = useState(false);
  const [botBoostEnd, setBotBoostEnd] = useState(null);
  const [botBoostModal, setBotBoostModal] = useState(false);
  const [stakingLoading, setStakingLoading] = useState(false);
  const [stakingError, setStakingError] = useState(null);
  const [stakingSuccess, setStakingSuccess] = useState(null);
  const PHOTON_KEY = '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe';

  // Initialize Photon API hook
  const {
    isLoading,
    error,
    connectWalletToPhoton,
    getUserTrades,
    placeTrade
  } = usePhotonApi();

  // Initialize token manager with Devnet connection
  const tokenManager = new EMBAITokenManager(
    new Connection(clusterApiUrl('devnet')), 
    { devnetWallet: devnetWallet || 'Gzf96o4iZdPtytRdoqVwo1fbzgQ4AkhwtET3LhG3p8dS' }
  );

  // Load user token balances and graduation status
  useEffect(() => {
    const loadUserTokenStatus = async () => {
      if (!connected || !publicKey) return;

      try {
        // Get EMB balance (paper trading token)
        const embBal = await tokenManager.getEmbBalance(publicKey.toString());
        setEmbBalance(embBal);
        
        // Get EMBAI balance (live trading token)
        const embaiBal = await tokenManager.getTokenBalance(publicKey.toString());
        setEmbaiBalance(embaiBal);
        
        // Get graduation status
        const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
        setHasGraduated(status.hasGraduated);
        
        // Check if EMBAI token is live
        const tokenInfo = await tokenManager.getTokenInfo();
        setIsLiveTokenActive(tokenInfo.isLive);
      } catch (err) {
        console.error('Error fetching token status:', err);
      }
    };

    loadUserTokenStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadUserTokenStatus, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey]);

  // Load user's trades when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      loadUserTrades();
    }
  }, [connected, publicKey]);

  // Load user's trading history from Photon
  const loadUserTrades = useCallback(async () => {
    try {
      // First ensure the wallet is connected to Photon
      await connectWalletToPhoton();
      
      // Then fetch user trades
      const trades = await getUserTrades();
      if (trades) {
        setTradeHistory(trades);
        
        // Find any active position
        const active = trades.find(trade => trade.status === 'open');
        if (active) {
          setActivePosition(active);
        }

        // Update PnL data
        const paperTrades = trades.filter(t => t.isPaperTrade);
        const liveTrades = trades.filter(t => !t.isPaperTrade);
        
        const paperPnl = paperTrades.reduce((total, t) => total + (t.profit || 0), 0);
        const livePnl = liveTrades.reduce((total, t) => total + (t.profit || 0), 0);
        
        const winningTrades = trades.filter(t => (t.profit || 0) > 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        
        setPnlData({
          paperPnl,
          livePnl,
          totalTrades: trades.length,
          winRate
        });
      }
    } catch (err) {
      console.error('Failed to load trades:', err);
    }
  }, [connectWalletToPhoton, getUserTrades]);

  // Check for active bot boost
  useEffect(() => {
    const checkBotBoost = () => {
      const storedBoostEnd = localStorage.getItem('botBoostEnd');
      if (storedBoostEnd) {
        const boostEndTime = parseInt(storedBoostEnd);
        if (boostEndTime > Date.now()) {
          setBotBoostActive(true);
          setBotBoostEnd(boostEndTime);
        } else {
          // Boost has expired
          localStorage.removeItem('botBoostEnd');
          setBotBoostActive(false);
          setBotBoostEnd(null);
          
          // Check if we need to return staked EMB + bonus
          const storedStakedAmount = parseInt(localStorage.getItem('botBoostStaked') || '0');
          const hasPositivePnL = pnlData.paperPnl > 0 || pnlData.livePnl > 0;
          
          if (storedStakedAmount > 0) {
            // Return the staked amount with bonus if PnL is positive
            const returnAmount = hasPositivePnL ? 
              storedStakedAmount + (storedStakedAmount * 0.05) : // 5% bonus for positive PnL
              storedStakedAmount;
              
            setEmbBalance(prev => prev + returnAmount);
            localStorage.setItem('embBalance', embBalance + returnAmount);
            localStorage.removeItem('botBoostStaked');
            
            // Show success message
            setStakingSuccess(`Bot boost expired. ${hasPositivePnL ? `Your 100 EMB was returned with a 5% bonus (${returnAmount} EMB total)` : 'Your 100 EMB was returned'}.`);
            setTimeout(() => setStakingSuccess(null), 6000);
          }
        }
      }
    };
    
    checkBotBoost();
    const interval = setInterval(checkBotBoost, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [pnlData]);

  // Format time remaining for boost
  const formatTimeRemaining = (endTime) => {
    if (!endTime) return '';
    
    const remaining = Math.max(0, endTime - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  // Stake EMB for bot boost
  const stakeForBotBoost = async () => {
    if (!connected) {
      setStakingError('Please connect your wallet first.');
      return;
    }
    
    if (embBalance < 100) {
      setStakingError('Insufficient EMB balance. You need at least 100 EMB to boost your bot.');
      return;
    }
    
    setStakingLoading(true);
    setStakingError(null);
    
    try {
      // In a real implementation, this would use Photon to lock tokens
      // For demonstration, we'll simulate this with localStorage
      
      // Set 24-hour boost period
      const boostEndTime = Date.now() + (24 * 60 * 60 * 1000);
      setBotBoostActive(true);
      setBotBoostEnd(boostEndTime);
      localStorage.setItem('botBoostEnd', boostEndTime.toString());
      
      // Update EMB balance (lock 100 EMB)
      const newBalance = embBalance - 100;
      setEmbBalance(newBalance);
      localStorage.setItem('embBalance', newBalance.toString());
      
      // Store staked amount for later return with potential bonus
      localStorage.setItem('botBoostStaked', '100');
      
      setStakingSuccess('Bot boost activated! Trade frequency increased by 20% for the next 24 hours.');
      setBotBoostModal(false);
      
    } catch (error) {
      console.error('Error staking for bot boost:', error);
      setStakingError(`Failed to stake EMB: ${error.message}`);
    } finally {
      setStakingLoading(false);
    }
  };

  // Toggle auto-accept feature
  const toggleAutoAccept = useCallback(() => {
    const newValue = !autoAcceptTrades;
    setAutoAcceptTrades(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoAcceptTrades', JSON.stringify(newValue));
    }
    return newValue;
  }, [autoAcceptTrades]);

  // Initialize auto-accept setting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSetting = localStorage.getItem('autoAcceptTrades');
      if (savedSetting !== null) {
        setAutoAcceptTrades(JSON.parse(savedSetting));
      }
    }
  }, []);

  // Handle trade execution
  const executeTrade = useCallback(async (tradeParams) => {
    try {
      // Apply bot boost if active (20% faster execution)
      const boostedParams = {...tradeParams};
      if (botBoostActive) {
        boostedParams.frequency = (tradeParams.frequency || 1) * 1.2;
        boostedParams.isBoosted = true;
      }
      
      // Determine if this is a paper trade or live trade
      const isPaperTrade = !hasGraduated || boostedParams.isPaperTrade;
      
      // Calculate trading fees with EMBAI discount if applicable
      let tradingFeeDiscount = 0;
      if (!isPaperTrade && useEmbaiForFees && embaiBalance > 0) {
        tradingFeeDiscount = TRADING_FEE_DISCOUNT; // 20% discount
      }
      
      const result = await placeTrade({
        ...boostedParams,
        market: selectedMarket,
        isPaperTrade,
        tradingFeeDiscount
      });
      
      if (result && result.success) {
        // If this is a paper trade, update EMB balance
        if (isPaperTrade) {
          // Simulate balance change (profit or loss)
          const profit = result.profit || 0;
          await tokenManager.updateEmbBalance(publicKey.toString(), embBalance + profit);
          setEmbBalance(prev => prev + profit);
          
          // Record successful paper trade if profitable
          if (profit > 0) {
            await tokenManager.recordSuccessfulPaperTrade(publicKey.toString(), profit);
            
            // Check if user is now ready to graduate
            const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
            if (status.readyToGraduate && !hasGraduated) {
              // Prompt for migration
              setTimeout(() => {
                setShowMigrationPortal(true);
              }, 1000);
            }
          }
        } else {
          // For live trades with EMBAI fee discount, burn a percentage of the fee
          if (useEmbaiForFees && embaiBalance > 0) {
            const feeAmount = result.fee || 0;
            const embaiFeeBurned = feeAmount * tokenManager.BURN_PERCENTAGE;
            console.log(`Burning ${embaiFeeBurned} EMBAI from fees`);
            // In production, this would call the burn function with proper authorization
          }
        }
        
        // Refresh trades list
        await loadUserTrades();
        return result;
      }
      return null;
    } catch (err) {
      console.error('Trade execution failed:', err);
      return null;
    }
  }, [placeTrade, selectedMarket, loadUserTrades, hasGraduated, embaiBalance, useEmbaiForFees, embBalance, publicKey, botBoostActive]);

  // Handle signal acceptance from AI or manual
  const handleTradeSignal = useCallback((signal) => {
    if (!connected) {
      alert('Please connect your wallet to trade');
      return;
    }
    
    setCurrentTrade(signal);
    
    if (autoAcceptTrades) {
      executeTrade(signal);
    } else {
      // Show confirmation modal
      setShowAutoTradeModal(true);
    }
  }, [executeTrade, autoAcceptTrades, connected]);

  const toggleTradingMode = () => {
    if (!hasGraduated) {
      setShowMigrationPortal(true);
    } else {
      // Toggle between paper and live trading (for graduated users)
      const currentMode = localStorage.getItem('tradingMode') || 'paper';
      const newMode = currentMode === 'paper' ? 'live' : 'paper';
      localStorage.setItem('tradingMode', newMode);
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header section */}
      <div className="p-4 rounded-t-lg border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Embassy TradeForce
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Powered by Photon & AIXBT
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Token Balances */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Paper Trading</p>
              <p className="text-blue-400 font-bold">{embBalance.toFixed(2)} $EMB</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Live Trading</p>
              <p className="text-purple-400 font-bold">{embaiBalance.toFixed(2)} $EMBAI</p>
            </div>
          </div>
          
          {/* Bot Boost Indicator */}
          {botBoostActive && (
            <div className="bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-800/30 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-blue-400 text-xs">
                Boost: {formatTimeRemaining(botBoostEnd)}
              </span>
            </div>
          )}
          
          {connected ? (
            <div className="flex items-center bg-gray-800 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-white text-sm font-medium">
                Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Trading Mode Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-3 text-center font-medium ${
            !hasGraduated ? 'bg-blue-900/30 text-blue-400 border-b-2 border-blue-500' : 'bg-gray-800/50 text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => setShowMigrationPortal(true)}
        >
          <div className="flex items-center justify-center">
            <span>Paper Trading</span>
            <span className="ml-2 bg-blue-600/30 text-blue-400 text-xs px-2 py-0.5 rounded-full">$EMB</span>
          </div>
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            hasGraduated ? 'bg-purple-900/30 text-purple-400 border-b-2 border-purple-500' : 'bg-gray-800/50 text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => {
            if (!hasGraduated) {
              setShowMigrationPortal(true);
            }
          }}
        >
          <div className="flex items-center justify-center">
            <span>Live Trading</span>
            <span className="ml-2 bg-purple-600/30 text-purple-400 text-xs px-2 py-0.5 rounded-full">$EMBAI</span>
            {!hasGraduated && <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">Locked</span>}
          </div>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {showMigrationPortal ? (
          <div className="w-full p-4 overflow-y-auto">
            <button 
              onClick={() => setShowMigrationPortal(false)}
              className="mb-4 text-gray-400 hover:text-white flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"></path>
              </svg>
              Back to Trading
            </button>
            <MigrationPortal />
          </div>
        ) : (
          <>
            {/* Left panel - Trading interface */}
            <div className="w-3/5 border-r border-gray-700 bg-gray-800/50 overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {hasGraduated ? 'Live Trading with $EMBAI' : 'Paper Trading with $EMB'}
                  </h3>
                  
                  {hasGraduated && (
                    <div className="flex items-center">
                      <label className="flex items-center text-sm mr-2">
                        <input
                          type="checkbox"
                          checked={useEmbaiForFees}
                          onChange={() => setUseEmbaiForFees(!useEmbaiForFees)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">Use $EMBAI for fees ({TRADING_FEE_DISCOUNT * 100}% discount)</span>
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Market selector */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-1">Select Market</label>                  <select 
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                  >
                    <option value="SOL-USD">SOL/USD</option>
                    <option value="USDC-USD">USDC/USD</option>
                    <option value="BTC-USD">BTC/USD</option>
                    <option value="ETH-USD">ETH/USD</option>
                    <option value="MSOL-USD">mSOL/USD</option>
                    <option value="BONK-USD">BONK/USD</option>
                    <option value="JUP-USD">JUP/USD</option>
                    <option value="WIF-USD">WIF/USD</option>
                    <option value="PYTH-USD">PYTH/USD</option>
                    <option value="RNDR-USD">RNDR/USD</option>
                    <option value="AVAX-USD">AVAX/USD</option>
                    <option value="LINK-USD">LINK/USD</option>
                    <option disabled value="EMB-USD">EMB/USD (Coming Soon)</option>
                  </select>
                </div>

                {/* Photon interface placeholder - would integrate with their actual SDK */}
                <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 mb-4 frosty-card">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-700/30 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 gradient-text">
                      Photon Trading Interface
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {connected ? 
                        `Your wallet is connected. ${hasGraduated ? 'Live' : 'Paper'} trading mode is active.` :
                        "Connect your wallet to access the Photon trading interface."
                      }
                    </p>
                    
                    {/* Devnet Wallet Info */}
                    {devnetWallet && (
                      <div className="mt-2 mb-4 bg-blue-900/20 p-2 rounded-lg border border-blue-800/30">
                        <p className="text-sm text-blue-300">
                          Using Devnet wallet: {devnetWallet.slice(0, 6)}...{devnetWallet.slice(-4)} (1 SOL)
                        </p>
                      </div>
                    )}
                    
                    {!connected ? (
                      <button 
                        onClick={connectWallet}
                        className="frosty-button px-4 py-2 rounded-lg"
                      >
                        Connect Wallet
                      </button>
                    ) : !hasGraduated ? (
                      <button 
                        onClick={() => setShowMigrationPortal(true)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transform transition-all duration-300 hover:scale-105"
                      >
                        Graduate to Live Trading
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Auto-trade toggle with Bot Boost Button */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Auto-Accept Trades</h3>
                      <p className="text-gray-400 text-sm">Let AIXBT automatically execute trades for you</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {!botBoostActive && connected && embBalance >= 100 && (
                        <button
                          onClick={() => setBotBoostModal(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm px-3 py-1 rounded"
                        >
                          Boost Bot with EMB
                        </button>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={autoAcceptTrades}
                          onChange={toggleAutoAccept}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* Bot Boost Status */}
                    {botBoostActive && (
                      <div className="mt-2 bg-blue-900/20 p-2 rounded flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                          <span className="text-blue-400 text-sm">Bot Boost Active - Trade frequency increased by 20%</span>
                        </div>
                        <div className="text-xs text-blue-300">{formatTimeRemaining(botBoostEnd)}</div>
                      </div>
                    )}
                    
                    {stakingSuccess && (
                      <div className="mt-2 p-2 bg-green-900/20 border border-green-800/30 rounded text-green-400 text-sm">
                        {stakingSuccess}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Active position */}
                {activePosition && (
                  <div className={`p-4 rounded-lg border mb-4 ${
                    hasGraduated 
                      ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-purple-700/40' 
                      : 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/40'
                  }`}>
                    <h3 className="text-lg font-semibold text-white mb-2">Active Position</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-900/20 p-2 rounded">
                        <span className="text-gray-400 block">Market</span>
                        <span className="text-white font-medium">{activePosition.market}</span>
                      </div>
                      <div className="bg-blue-900/20 p-2 rounded">
                        <span className="text-gray-400 block">Type</span>
                        <span className={`font-medium ${activePosition.direction === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                          {activePosition.direction.toUpperCase()}
                        </span>
                      </div>
                      <div className="bg-blue-900/20 p-2 rounded">
                        <span className="text-gray-400 block">Entry Price</span>
                        <span className="text-white font-medium">${activePosition.entryPrice}</span>
                      </div>
                      <div className="bg-blue-900/20 p-2 rounded">
                        <span className="text-gray-400 block">Size</span>
                        <span className="text-white font-medium">{activePosition.size} {activePosition.market.split('-')[0]}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => executeTrade({ ...activePosition, action: 'close' })}
                      className="bg-red-600 hover:bg-red-700 text-white w-full mt-3 py-2 rounded"
                    >
                      Close Position
                    </button>
                  </div>
                )}

                {/* Trade history */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Trades</h3>
                  {tradeHistory.length > 0 ? (
                    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                      {/* Table header */}
                      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
                        <span className="text-gray-400 w-1/5">Market</span>
                        <span className="text-gray-400 w-1/5">Direction</span>
                        <span className="text-gray-400 w-1/5">Price</span>
                        <span className="text-gray-400 w-1/5">Type</span>
                        <span className="text-gray-400 w-1/5">Status</span>
                      </div>
                      
                      {/* Virtualized list of trades */}
                      <List
                        height={240}
                        itemCount={tradeHistory.length}
                        itemSize={48}
                        width="100%"
                        className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
                      >
                        {({ index, style }) => {
                          const trade = tradeHistory[index];
                          return (
                            <div 
                              style={{
                                ...style,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: index < tradeHistory.length - 1 ? '1px solid rgba(75, 85, 99, 0.2)' : 'none',
                                backgroundColor: index % 2 === 0 ? 'rgba(31, 41, 55, 0.4)' : 'transparent'
                              }}
                              className="px-4 hover:bg-gray-800/60 transition-colors duration-150"
                            >
                              <span className="text-white w-1/5">{trade.market}</span>
                              <span className={`w-1/5 ${
                                trade.direction === 'long' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {trade.direction.toUpperCase()}
                              </span>
                              <span className="text-white w-1/5">${trade.entryPrice}</span>
                              <span className="w-1/5">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  trade.isPaperTrade ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                                }`}>
                                  {trade.isPaperTrade ? 'Paper' : 'Live'}
                                </span>
                              </span>
                              <span className="w-1/5">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  trade.status === 'open' ? 'bg-green-900/40 text-green-400' : 
                                  trade.status === 'closed' ? 'bg-gray-700 text-gray-300' : 
                                  'bg-blue-900/40 text-blue-400'
                                }`}>
                                  {trade.status}
                                </span>
                              </span>
                            </div>
                          );
                        }}
                      </List>
                      
                      {/* Show total count at the bottom */}
                      {tradeHistory.length > 5 && (
                        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
                          Showing {tradeHistory.length} trades (virtualized for performance)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 text-center">
                      <p className="text-gray-400">No trade history available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel - Trading signals and PnL */}
            <div className="w-2/5 bg-gray-900 overflow-y-auto">
              <div className="p-4">
                {/* AI Trading Signals */}
                <TradeSignals 
                  onTrade={handleTradeSignal} 
                  isPaperTrading={!hasGraduated}
                />
                
                {/* Performance tab */}
                <div className="mt-6">
                  <PnLTab 
                    paperPnl={pnlData.paperPnl} 
                    livePnl={pnlData.livePnl}
                    totalTrades={pnlData.totalTrades}
                    winRate={pnlData.winRate}
                    hasGraduated={hasGraduated}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Auto trade confirmation modal */}
      <AutoTradeModal
        isOpen={showAutoTradeModal}
        onClose={() => setShowAutoTradeModal(false)}
        onAccept={() => {
          if (currentTrade) {
            executeTrade(currentTrade);
            setCurrentTrade(null);
            setShowAutoTradeModal(false);
          }
        }}
        trade={currentTrade}
        isPaperTrading={!hasGraduated}
      />

      {/* Bot Boost Modal */}
      {botBoostModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Boost Bot with EMB</h3>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Stake 100 $EMB tokens to boost your bot for 24 hours, increasing trade frequency by 20% during live runs.
              </p>
              
              <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30 mb-4">
                <h4 className="font-medium text-blue-400 mb-2">Boost Benefits</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    20% faster trade execution speed
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Get your 100 EMB back after 24 hours
                  </li>
                  <li className="flex items-start">
                    <svg className="w-4 h-4 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Receive 5% bonus (105 EMB total) if bot P/L is positive
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-700/50 rounded p-3 flex justify-between items-center mb-6">
                <span className="text-gray-300">Your EMB Balance</span>
                <span className="text-blue-400 font-medium">{embBalance.toFixed(2)} EMB</span>
              </div>
              
              {stakingError && (
                <div className="bg-red-900/20 border border-red-800/30 rounded p-2 mb-4 text-red-400 text-sm">
                  {stakingError}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBotBoostModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={stakeForBotBoost}
                disabled={stakingLoading || embBalance < 100}
                className={`px-4 py-2 rounded ${
                  stakingLoading || embBalance < 100 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {stakingLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Staking...
                  </div>
                ) : 'Stake 100 EMB for Boost'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeTab;
