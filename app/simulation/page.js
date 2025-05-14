'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { toast, Toaster } from 'react-hot-toast';

// Import our custom Web3 wallet and trading components
import SolanaWalletModalProvider from '../../components/SolanaWalletModalProvider';
import WalletBalanceDisplay from '../../components/WalletBalanceDisplay';
import MLConsensusTrading from '../../components/MLConsensusTrading';
import PaperTradingExecutor from '../../components/PaperTradingExecutor';

// Fix import paths to ensure proper resolution
import CoinSelector from '../../components/CoinSelector';
import useTradeSignalSimulator from '../../lib/simulateTradeSignals';
import SwapToEMB from '../../components/SwapToEMB';

// Dynamically import components with browser APIs
const TradingSimulator = dynamic(
  () => import('../../components/TradingSimulator'),
  { ssr: false, loading: () => <p className="text-gray-400">Loading trading simulator...</p> }
);

// Generate a safer key for trades
const generateTradeKey = (trade) => {
  // Using a combination of truly unique values to ensure key uniqueness
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `trade-${trade.id}-${trade.status}-${randomPart}-${Date.now()}`;
};

// Mock online users for the social feature
const MOCK_ONLINE_USERS = [
  {id: 1, name: 'Trader123', color: 'blue'},
  {id: 2, name: 'CryptoWhale', color: 'green'},
  {id: 3, name: 'SolanaFan', color: 'purple'},
  {id: 4, name: 'JUPtrader', color: 'amber'},
  {id: 5, name: 'EMBholder', color: 'pink'}
];

// Photon private key for paper trading
const PHOTON_PRIVATE_KEY = '38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe';

// Main page component wrapped with wallet provider
export default function SimulationPageContainer() {
  return (
    <SolanaWalletModalProvider network={WalletAdapterNetwork.Devnet} autoConnect={true}>
      <SimulationPage />
    </SolanaWalletModalProvider>
  );
}

// Actual simulation page content
function SimulationPage() {
  // Added ref to track the currently processed signal
  const processedSignalRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [mockBalances, setMockBalances] = useState({
    SOL: 100,
    USDC: 100,
    JITO: 100,
    EMB: 0
  });
  const [mockTradeResults, setMockTradeResults] = useState([]);
  const { publicKey } = useWallet();
  const walletAddress = publicKey ? publicKey.toString() : null;
  
  // State for trade signal and auto-accept toggle
  const [tradeSignal, setTradeSignal] = useState(null);
  const [autoAcceptTrades, setAutoAcceptTrades] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isLoadingTrade, setIsLoadingTrade] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(MOCK_ONLINE_USERS);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  
  // Trade history state with unique keys
  const [tradeHistory, setTradeHistory] = useState([]);

  // State variables for the enhancements
  const [email, setEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasEmb, setHasEmb] = useState(false);
  const [swapAmount, setSwapAmount] = useState('');
  const [swapCurrency, setSwapCurrency] = useState('SOL');
  const [swapResult, setSwapResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dexData, setDexData] = useState([]);
  const [lastApiCheck, setLastApiCheck] = useState(0);
  const [signalCooldown, setSignalCooldown] = useState(false);
  
  // State variables for the EMB agent feature
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showEmbAgent, setShowEmbAgent] = useState(false);
  const [embMessage, setEmbMessage] = useState("Hi, I'm EMB!");
  const [isSignedInToX, setIsSignedInToX] = useState(false);
  const [tradeDetails, setTradeDetails] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // New state variables for Photon integration and EMB incentives
  const [embBalance, setEmbBalance] = useState(0);
  const [holdingStart, setHoldingStart] = useState(null);
  const [holdingRewardAvailable, setHoldingRewardAvailable] = useState(false);
  const [tradeInsightsUnlocked, setTradeInsightsUnlocked] = useState(false);
  const [tradeInsights, setTradeInsights] = useState([]);

  // Use our simulator hook (enabled when there's no WebSocket connection)
  const simulatedSignal = useTradeSignalSimulator(10, true); // Force simulation mode to true

  // Check if user has EMB token in local storage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedHasEmb = localStorage.getItem('hasEmb') === 'true';
      setHasEmb(storedHasEmb);
      
      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail) {
        setEmail(storedEmail);
        setHasEmail(true);
      }
      
      // Load EMB balance from local storage
      const storedBalance = parseFloat(localStorage.getItem('embBalance')) || 0;
      setEmbBalance(storedBalance);
      
      // Check if Trade Insights should be unlocked
      setTradeInsightsUnlocked(storedBalance >= 100);
      
      // Load holding start timestamp
      const storedHoldingStart = localStorage.getItem('holdingStart');
      if (storedHoldingStart) {
        setHoldingStart(parseInt(storedHoldingStart));
      }
    }
  }, []);

  // Create mock trade insights data
  useEffect(() => {
    if (tradeInsightsUnlocked) {
      const mockInsights = Array.from({ length: 5 }, (_, i) => {
        const isProfit = Math.random() > 0.5;
        const profitAmount = (Math.random() * 50 * (isProfit ? 1 : -1)).toFixed(2);
        const timeAgo = Math.floor(Math.random() * 24) + 1;
        
        return {
          id: `insight-${i}`,
          pair: [`SOL/USDC`, `BONK/USDC`, `JUP/USDC`, `JTO/USDC`, `WEN/USDC`][Math.floor(Math.random() * 5)],
          action: Math.random() > 0.5 ? 'BUY' : 'SELL',
          profitLoss: profitAmount,
          time: `${timeAgo}h ago`,
          isProfit: isProfit
        };
      });
      
      setTradeInsights(mockInsights);
    }
  }, [tradeInsightsUnlocked]);

  // Check for holding rewards (simulate staking mechanism)
  useEffect(() => {
    if (!embBalance || embBalance < 100 || !holdingStart) return;
    
    const checkReward = () => {
      const now = Date.now();
      const elapsedMinutes = (now - holdingStart) / (1000 * 60);
      
      // 7 minutes for testing purposes (simulates 7 days)
      if (elapsedMinutes >= 7) {
        setHoldingRewardAvailable(true);
      }
    };
    
    // Check every 30 seconds
    const interval = setInterval(checkReward, 30000);
    checkReward(); // Initial check
    
    return () => clearInterval(interval);
  }, [embBalance, holdingStart]);

  // Effect to show the analysis modal when auto-accept is toggled on
  useEffect(() => {
    if (autoAcceptTrades) {
      setShowAnalysisModal(true);
    }
  }, [autoAcceptTrades]);

  // Effect to fetch data from DEX Screener API when auto-accept is enabled
  useEffect(() => {
    if (!autoAcceptTrades) return;
    
    // Fetch DEX Screener data every 30 seconds to avoid rate limiting
    const now = Date.now();
    if (now - lastApiCheck < 30000) return;
    
    const fetchDexData = async () => {
      setIsLoading(true);
      try {
        // Using the DEX Screener API to search for tokens on Solana
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana/jup,bonk,wen,jto');
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
          const filtered = data.pairs.filter(pair => {
            // Filter for tokens meeting our criteria:
            // 1. Created within the last 24 hours
            // 2. Volume > $10,000
            // 3. Price change > 10%
            if (!pair.pairCreatedAt) return false;
            
            const createdAt = new Date(pair.pairCreatedAt);
            const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
            const volume = parseFloat(pair.volume?.h24 || '0');
            const priceChange = parseFloat(pair.priceChange?.h24 || '0');
            
            return ageHours < 24 && volume > 10000 && priceChange > 10;
          });

          setDexData(filtered);
          console.log('Found high-probability trades:', filtered.length);
          
          // Auto-accept trades that match our criteria
          if (filtered.length > 0) {
            const highProbabilityTrade = filtered[0];
            
            const newTrade = {
              id: `dex-${Date.now()}`,
              tradePair: `${highProbabilityTrade.baseToken.symbol}/${highProbabilityTrade.quoteToken.symbol}`,
              action: 'buy',
              price: parseFloat(highProbabilityTrade.priceUsd || '0'),
              profitPotential: `${highProbabilityTrade.priceChange.h24}%`,
              riskLevel: parseFloat(highProbabilityTrade.priceChange.h24) > 20 ? 'Medium' : 'Low',
              timestamp: Date.now(),
              pattern: 'Upward Trend'
            };
            
            console.log(`Found a trade: ${newTrade.tradePair}, Pattern: ${newTrade.pattern}, Executing Buy`);
            
            // Add to trade history as auto-accepted
            setTradeHistory(prev => [{
              ...newTrade,
              key: generateTradeKey({ ...newTrade, status: 'executed' }),
              status: 'executed'
            }, ...prev]);
            
            // Send email notification for the auto-accepted trade
            if (hasEmail) {
              const profit = (Math.random() * 90 + 10).toFixed(2);
              sendTradeEmail(newTrade, true, profit);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching DEX Screener data:', error);
        
        // Handle rate limiting (429 errors)
        if (error.message && error.message.includes('429')) {
          console.log('Rate limited, retrying in 60 seconds');
          setTimeout(fetchDexData, 60000);
        }
      } finally {
        setIsLoading(false);
        setLastApiCheck(Date.now());
      }
    };

    fetchDexData();
    const interval = setInterval(fetchDexData, 30000);
    return () => clearInterval(interval);
  }, [autoAcceptTrades, lastApiCheck, hasEmail]);

  // Process simulated trade signals (with useCallback to prevent unnecessary rerenders)
  const processSignal = useCallback((signal) => {
    // Don't process if we're already processing a signal or in cooldown
    if (!signal || isLoadingTrade || signalCooldown) return;
    
    // Check if we've already processed this exact signal
    if (processedSignalRef.current && processedSignalRef.current.id === signal.id) {
      return;
    }
    
    // Set this as the currently processed signal
    processedSignalRef.current = signal;
    
    // Simulate a short loading time for better UX
    setIsLoadingTrade(true);
    setTimeout(() => {
      setIsLoadingTrade(false);
      
      if (autoAcceptTrades) {
        // Auto-accept the trade and add to history
        console.log(`Auto-accepted trade: ${signal.tradePair} with profit potential ${signal.profitPotential}`);
        
        const trade = {
          ...signal,
          key: generateTradeKey({ ...signal, status: 'executed' }),
          status: 'executed'
        };
        
        setTradeHistory(prev => [trade, ...prev]);
        
        // Send email notification for auto-accepted trade
        if (hasEmail) {
          const profit = (Math.random() * 90 + 10).toFixed(2);
          sendTradeEmail(signal, true, profit);
        }
        
        // Set a cooldown to prevent immediate new signals
        setSignalCooldown(true);
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          setSignalCooldown(false);
        }, 5000); // 5-second cooldown
      } else {
        // Show the trade signal modal
        setTradeSignal(signal);
      }
    }, 1000);
  }, [autoAcceptTrades, hasEmail, isLoadingTrade, signalCooldown]);

  // Effect to process new signals
  useEffect(() => {
    // Only process if we have a simulated signal and no existing trade signal showing
    // and user has EMB tokens
    if (simulatedSignal && !tradeSignal && !isLoadingTrade && hasEmb && !signalCooldown) {
      console.log("New simulated signal received:", simulatedSignal);
      processSignal(simulatedSignal);
    }
  }, [simulatedSignal, tradeSignal, processSignal, isLoadingTrade, hasEmb, signalCooldown]);

  // Cleanup the cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleAcceptTrade = useCallback(() => {
    if (!tradeSignal) return;
    
    console.log(`Trade accepted: ${tradeSignal.tradePair} with profit potential ${tradeSignal.profitPotential}`);
    
    const trade = {
      ...tradeSignal,
      key: generateTradeKey({ ...tradeSignal, status: 'executed' }),
      status: 'executed'
    };
    
    // Add to trade history
    setTradeHistory(prev => [trade, ...prev]);
    
    // Send email notification for accepted trade
    if (hasEmail) {
      const profit = (Math.random() * 90 + 10).toFixed(2);
      sendTradeEmail(tradeSignal, true, profit);
    }
    
    // Important: Clear the trade signal so next one can be shown
    setTradeSignal(null);
    
    // Set a cooldown to prevent immediate new signals after manual action
    setSignalCooldown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setSignalCooldown(false);
    }, 5000); // 5-second cooldown
  }, [tradeSignal, hasEmail]);

  const handleDeclineTrade = useCallback(() => {
    if (!tradeSignal) return;
    
    console.log(`Trade declined: ${tradeSignal.tradePair}`);
    
    // Add to trade history as declined
    setTradeHistory(prev => [{
      ...tradeSignal,
      key: generateTradeKey({ ...tradeSignal, status: 'declined' }),
      status: 'declined'
    }, ...prev]);
    
    // Send email notification for declined trade
    if (hasEmail) {
      sendTradeEmail(tradeSignal, false);
    }
    
    // Important: Clear the trade signal so next one can be shown
    setTradeSignal(null);
    
    // Set a cooldown to prevent immediate new signals after manual action
    setSignalCooldown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setSignalCooldown(false);
    }, 5000); // 5-second cooldown
  }, [tradeSignal, hasEmail]);

  const handleCloseTradeModal = useCallback(() => {
    if (!tradeSignal) return;
    
    console.log(`Trade dismissed: ${tradeSignal.tradePair}`);
    setTradeSignal(null);
    
    // Set a cooldown to prevent immediate new signals after manual action
    setSignalCooldown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setSignalCooldown(false);
    }, 5000); // 5-second cooldown
  }, [tradeSignal]);

  const handleOutsideClick = useCallback((e) => {
    // Check if the click is outside the modal content
    if (e.target === e.currentTarget) {
      handleCloseTradeModal();
    }
  }, [handleCloseTradeModal]);

  const handleAutoAcceptToggle = useCallback(() => {
    console.log("Auto-accept toggled to:", !autoAcceptTrades);
    setAutoAcceptTrades(prev => !prev);
    // If there's a trade signal showing and we enable auto-accept, accept it
    if (!autoAcceptTrades && tradeSignal) {
      handleAcceptTrade();
    }
  }, [autoAcceptTrades, tradeSignal, handleAcceptTrade]);

  // New function for handling AIXBT interaction with Photon paper trading
  const handleAixbtInteraction = async () => {
    setShowEmbAgent(true);
    setEmbMessage('Hi, I\'m EMB! Let\'s find a trade.');
    
    // If not signed in to X, stop here and let the user sign in
    if (!isSignedInToX) return;
    
    // Start the analysis process
    setIsAnalyzing(true);
    setEmbMessage('Fetching trade signals...');
    
    try {
      // Simulate a delay for fetching trade signals
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Fetch data from DEX Screener API
      const signals = await fetchDexScreenerData();
      
      if (!signals || signals.length === 0) {
        setEmbMessage('No viable trades found at the moment.');
        setIsAnalyzing(false);
        return;
      }
      
      // Take the first signal for demonstration
      const signal = signals[0];
      const tokenSymbol = signal.baseToken.symbol;
      
      setEmbMessage(`Found a trade: ${tokenSymbol}/${signal.quoteToken.symbol}, analyzing pattern...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate asking AIXBT on X
      console.log(`Posting to X: Good entry level for $${tokenSymbol}? @AIXBT`);
      setEmbMessage(`Asking AIXBT on X: "Good entry level for $${tokenSymbol}?"`);
      
      // Simulate AIXBT response after a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const entry = parseFloat(signal.priceUsd).toFixed(6);
      const takeProfit = (parseFloat(entry) * 1.15).toFixed(6); // 15% profit
      const stopLoss = (parseFloat(entry) * 0.95).toFixed(6); // 5% loss
      const potentialProfit = ((takeProfit - entry) / entry * 100).toFixed(2);
      
      setEmbMessage(`AIXBT says: $${tokenSymbol} entry level: $${entry}, TP: $${takeProfit}, SL: $${stopLoss}`);
      
      // EMB agent decides whether to take the trade based on potential profit
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (parseFloat(potentialProfit) >= 10) {
        setEmbMessage('I\'ll execute this trade using Photon!');
        
        // Simulate trade execution with Photon
        console.log(`Paper trade executed: Buy $${tokenSymbol} at $${entry} using Photon (private key: ${PHOTON_PRIVATE_KEY.substring(0, 10)}...)`);
        
        // Add the trade to history
        const newTrade = {
          id: `emb-${Date.now()}`,
          tradePair: `${tokenSymbol}/${signal.quoteToken.symbol}`,
          action: 'buy',
          price: parseFloat(signal.priceUsd),
          profitPotential: `${potentialProfit}%`,
          riskLevel: parseFloat(potentialProfit) > 20 ? 'Medium' : 'Low',
          timestamp: Date.now(),
          pattern: 'AIXBT Recommendation',
          status: 'executed'
        };
        
        setTradeHistory(prev => [{
          ...newTrade,
          key: generateTradeKey(newTrade),
        }, ...prev]);
        
        // Set the trade details for display
        setTradeDetails({
          entry: entry,
          takeProfit: takeProfit,
          stopLoss: stopLoss,
          token: tokenSymbol
        });
        
        // Send email notification if user has registered email
        if (hasEmail) {
          const profit = (Math.random() * 90 + 10).toFixed(2);
          sendTradeEmail(newTrade, true, profit);
        }
      } else {
        setEmbMessage('I\'ll pass on this trade. The potential profit is below our 10% threshold.');
      }
    } catch (error) {
      console.error('Error in EMB agent analysis:', error);
      setEmbMessage('I encountered an error while analyzing the market. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Function to fetch data from DEX Screener API
  const fetchDexScreenerData = async () => {
    try {
      // Using the DEX Screener API to search for tokens on Solana
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana/jup,bonk,wen,jto');
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const filtered = data.pairs.filter(pair => {
          // Filter for tokens meeting our criteria:
          // 1. Created within the last 24 hours
          // 2. Volume > $10,000
          // 3. Price change > 10%
          if (!pair.pairCreatedAt) return false;
          
          const createdAt = new Date(pair.pairCreatedAt);
          const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
          const volume = parseFloat(pair.volume?.h24 || '0');
          const priceChange = parseFloat(pair.priceChange?.h24 || '0');
          
          return ageHours < 24 && volume > 10000 && priceChange > 10;
        });
        
        return filtered;
      }
      return [];
    } catch (error) {
      console.error('Error fetching DEX Screener data:', error);
      
      // Handle rate limiting (429 errors)
      if (error.message && error.message.includes('429')) {
        console.log('Rate limited, waiting before retry');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchDexScreenerData(); // Retry
      }
      
      throw error;
    }
  };
  
  // Function to handle sign-in to X
  const handleSignInToX = () => {
    // Simulate OAuth 2.0 authentication
    console.log('User signed into X');
    setIsSignedInToX(true);
    setEmbMessage('Signed into X! Now I can communicate with AIXBT.');
    
    // Start analysis after a brief delay
    setTimeout(() => {
      handleAixbtInteraction();
    }, 1000);
  };
  
  // Function to close the analysis modal
  const handleAnalysisModalClose = () => {
    setShowAnalysisModal(false);
    setAutoAcceptTrades(false);
  };
  
  // Function to start the analysis
  const handleStartAnalysis = () => {
    setShowAnalysisModal(false);
    // Continue with auto-accept enabled
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          feedback, 
          email: email || null,
          walletAddress: walletAddress || null,
          feedbackType: 'simulation'
        }),
      });
      
      if (response.ok) {
        setFeedbackSubmitted(true);
        setFeedback('');
        setTimeout(() => {
          setFeedbackSubmitted(false);
          setShowFeedbackForm(false);
        }, 3000);
        console.log('Feedback sent successfully to feedback@embassyai.xyz');
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeedbackForm = () => {
    setShowFeedbackForm(prev => !prev);
  };

  const toggleUsersPanel = () => {
    setShowUsersPanel(prev => !prev);
  };

  const handleNavLinkClick = (e, path) => {
    if (path !== '/simulation') {
      e.preventDefault();
      alert('Coming Soon! This feature is under development.');
    }
  };

  // Function to send trade email notifications
  const sendTradeEmail = async (trade, success, profit = '0.00') => {
    if (!email) return;
    
    try {
      const response = await fetch('/api/send-trade-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, trade, success, profit }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Email sent:', data.message);
        if (data.previewUrl) {
          console.log('Email preview:', data.previewUrl);
        }
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending trade email:', error);
    }
  };

  // Function to handle email signup
  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setHasEmail(true);
        localStorage.setItem('userEmail', email);
        alert('Email successfully registered for notifications!');
      } else {
        throw new Error('Failed to register email');
      }
    } catch (error) {
      console.error('Error registering email:', error);
      alert('Failed to register email. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle EMB holding rewards claim
  const claimHoldingReward = () => {
    if (!holdingRewardAvailable || !embBalance || embBalance < 100) return;
    
    // Calculate 5% reward
    const rewardAmount = embBalance * 0.05;
    const newBalance = embBalance + rewardAmount;
    
    // Update state and localStorage
    setEmbBalance(newBalance);
    localStorage.setItem('embBalance', newBalance);
    
    // Reset holding timer
    setHoldingRewardAvailable(false);
    localStorage.removeItem('holdingStart');
    setHoldingStart(null);
    
    // Show success message
    alert(`You claimed ${rewardAmount.toFixed(2)} $EMB as a holding reward! Your new balance is ${newBalance.toFixed(2)} $EMB.`);
  };

  // Modified swap function to set up holding timer if user reaches 100 EMB
  const handleSwap = () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    const amount = parseFloat(swapAmount);
    let embAmount;
    
    if (swapCurrency === 'SOL') {
      embAmount = amount * 100; // 1 SOL = 100 $EMB
    } else {
      embAmount = amount; // 1 USDC = 1 $EMB
    }
    
    // Update mock balances
    setMockBalances(prev => ({
      ...prev,
      [swapCurrency]: prev[swapCurrency] - amount,
      EMB: prev.EMB + embAmount
    }));
    
    // Update EMB balance
    const newBalance = embBalance + embAmount;
    setEmbBalance(newBalance);
    
    // Store in localStorage
    localStorage.setItem('embBalance', newBalance);
    
    // Check if this purchase puts the user over 100 EMB threshold
    if (embBalance < 100 && newBalance >= 100) {
      // Start the holding timer
      const startTime = Date.now();
      localStorage.setItem('holdingStart', startTime);
      setHoldingStart(startTime);
      
      // Unlock trade insights
      setTradeInsightsUnlocked(true);
    }
    
    // Set purchase result message
    setSwapResult(`You purchased ${embAmount} $EMB worth ${amount} ${swapCurrency}`);
    
    // Mark user as having EMB token
    localStorage.setItem('hasEmb', 'true');
    setHasEmb(true);
    
    // Reset form
    setSwapAmount('');
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
            <Link href="/simulation" className="text-blue-400 hover:text-blue-300 font-medium">Simulation</Link>
            <Link href="#" className="text-white hover:text-blue-300" onClick={(e) => handleNavLinkClick(e, '/wallet')}>Wallet</Link>
            <Link href="#" className="text-white hover:text-blue-300" onClick={(e) => handleNavLinkClick(e, '/settings')}>Settings</Link>
          </div>
          <div>
            <h1 className="text-xl font-bold">Embassy Trading Simulator</h1>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        {/* $EMB Token Purchase Section (shown only if user doesn't have EMB) */}
        {!hasEmb ? (
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-2">Purchase $EMB to Access the Simulation</h2>
            <p className="mb-4 text-gray-300">
              $EMB token holders get exclusive access to the trading simulation platform and AI-powered trade signals.
            </p>
            
            {/* External Purchase Link */}
            <div className="mb-4 bg-gray-700/30 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Buy $EMB on Pump.fun</h3>
              <a 
                href="https://pump.fun/coin/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 5a3 3 0 016 0v3a3 3 0 11-6 0V5zm9 3a3 3 0 100 6h.3a3 3 0 003-3V9a3 3 0 00-3-3h-.3z" clipRule="evenodd" />
                </svg>
                Buy $EMB on Pump.fun
              </a>
            </div>
            
            {/* Mock Swap Interface */}
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h3 className="font-medium mb-4">Quick Swap (Simulation)</h3>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label htmlFor="swap-amount" className="block text-gray-400 text-sm mb-1">Amount</label>
                  <input
                    type="number"
                    id="swap-amount"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                  />
                </div>
                
                <div className="flex-1">
                  <label htmlFor="swap-currency" className="block text-gray-400 text-sm mb-1">Currency</label>
                  <select
                    id="swap-currency"
                    value={swapCurrency}
                    onChange={(e) => setSwapCurrency(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white"
                  >
                    <option value="SOL">SOL (1 SOL = 100 $EMB)</option>
                    <option value="USDC">USDC (1 USDC = 1 $EMB)</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">You will receive</label>
                <div className="bg-gray-800 border border-gray-600 rounded p-2 font-medium text-blue-400">
                  {swapAmount && parseFloat(swapAmount) > 0
                    ? `${swapCurrency === 'SOL' ? parseFloat(swapAmount) * 100 : parseFloat(swapAmount)} $EMB`
                    : '0 $EMB'}
                </div>
              </div>
              
              <button
                onClick={handleSwap}
                disabled={!swapAmount || parseFloat(swapAmount) <= 0}
                className={`w-full py-2 px-4 rounded font-medium ${
                  !swapAmount || parseFloat(swapAmount) <= 0
                    ? 'bg-gray-600 text-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Swap to $EMB
              </button>
              
              {swapResult && (
                <div className="mt-4 p-3 bg-green-500/20 text-green-400 rounded">
                  {swapResult}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Email Registration Section (if user has EMB but not registered email) */}
            {!hasEmail && (
              <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-2">Sign Up for Trade Notifications</h2>
                <p className="text-gray-400 mb-4">
                  Get email notifications for trade outcomes, PnL recaps, and important platform updates.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  />
                  
                  <button
                    onClick={handleEmailSubmit}
                    disabled={isLoading || !email || !email.includes('@')}
                    className={`py-2 px-6 rounded font-medium ${
                      isLoading || !email || !email.includes('@')
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Auto-Accept Toggle Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
              <div className="flex items-center justify-between flex-wrap">
                <div className="md:max-w-3xl mb-4 md:mb-0">
                  <h2 className="text-xl font-semibold mb-2">Auto-Accept High Confidence Trades</h2>
                  <p className="text-gray-400 text-sm">
                    When enabled, the DEX Screener API will auto-accept high-probability trades with:
                    <span className="block mt-2 ml-4">• Tokens launched within 24 hours</span>
                    <span className="block ml-4">• 24h Volume &gt; $10,000</span>
                    <span className="block ml-4">• 24h Price change &gt; 10%</span>
                  </p>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 ${autoAcceptTrades ? 'text-green-500' : 'text-red-500'}`}>
                    {autoAcceptTrades ? 'On' : 'Off'}
                  </span>
                  <button 
                    onClick={handleAutoAcceptToggle}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full ${
                      autoAcceptTrades ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      autoAcceptTrades ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
              {isLoading && autoAcceptTrades && (
                <div className="mt-4 flex items-center text-blue-400 text-sm">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Scanning DEX Screener for high-probability trades...
                </div>
              )}
              {dexData.length > 0 && (
                <div className="mt-4 text-sm text-green-400">
                  Found {dexData.length} high-probability trades matching your criteria
                </div>
              )}
              
              {/* Added cooldown indicator */}
              {signalCooldown && (
                <div className="mt-4 text-amber-400 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Waiting for new signals... (cooldown)
                </div>
              )}
            </div>
            
            {/* Trading Simulator */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Trading Simulator</h2>
              {walletAddress ? (
                <div>
                  <CoinSelector 
                    selectedCoin={selectedCoin} 
                    onCoinChange={setSelectedCoin} 
                  />
                  
                  <TradingSimulator 
                    onSuccessfulTrade={(trade) => {
                      const tradeWithCoin = { ...trade, tradingCoin: selectedCoin };
                      setMockTradeResults(prev => [...prev, tradeWithCoin]);
                    }}
                    selectedCoin={selectedCoin}
                    coinBalance={mockBalances[selectedCoin]}
                  />
                </div>
              ) : (
                <p className="text-gray-400">Connect your wallet to start trading simulation</p>
              )}
            </div>
            
            {/* Trade History Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6">
              {embBalance < 100 && (
                <div className="bg-amber-500/20 text-amber-400 p-3 rounded-lg mb-4 font-medium text-center">
                  Hold 100 $EMB to unlock Trade Insights and earn holding rewards!
                </div>
              )}
              
              <h2 className="text-xl font-semibold mb-4">Recent Trade Signals</h2>
              {tradeHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="pb-2 text-left">Pair</th>
                        <th className="pb-2 text-left">Action</th>
                        <th className="pb-2 text-left">Profit Potential</th>
                        <th className="pb-2 text-left">Risk Level</th>
                        <th className="pb-2 text-left">Time</th>
                        <th className="pb-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((trade) => (
                        <tr 
                          key={trade.key || trade.id} 
                          className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="py-2">{trade.tradePair}</td>
                          <td className={`py-2 ${trade.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.action === 'buy' ? 'BUY' : 'SELL'}
                          </td>
                          <td className="py-2 text-green-500">{trade.profitPotential}</td>
                          <td className={`py-2 ${
                            trade.riskLevel === 'Low' ? 'text-green-500' : 
                            trade.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                          }`}>{trade.riskLevel}</td>
                          <td className="py-2 text-gray-400">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </td>
                          <td className={`py-2 ${
                            trade.status === 'executed' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {trade.status === 'executed' ? 'Accepted' : 'Declined'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400">No trade signals received yet. Signals arrive every 10 seconds.</p>
              )}
            </div>
            
            {/* Trade Insights Section - Unlocked with 100+ $EMB */}
            {tradeInsightsUnlocked && (
              <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6 border border-blue-500/40">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Trade Insights <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded ml-2">Premium</span></h2>
                  <div className="text-sm text-blue-400">
                    Unlocked with 100+ $EMB
                  </div>
                </div>
                
                <p className="text-gray-400 mb-4 text-sm">
                  Access detailed trade performance analytics and historical data with your $EMB holding.
                </p>
                
                {tradeInsights.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="pb-2 text-left">Pair</th>
                          <th className="pb-2 text-left">Action</th>
                          <th className="pb-2 text-left">Profit/Loss</th>
                          <th className="pb-2 text-left">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeInsights.map((insight) => (
                          <tr 
                            key={insight.id} 
                            className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="py-2">{insight.pair}</td>
                            <td className={`py-2 ${insight.action === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                              {insight.action}
                            </td>
                            <td className={`py-2 ${insight.isProfit ? 'text-green-500' : 'text-red-500'}`}>
                              ${insight.profitLoss}
                            </td>
                            <td className="py-2 text-gray-400">{insight.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400">No trade insights available yet.</p>
                )}
              </div>
            )}
            
            {/* EMB Balance and Holder Benefits */}
            {hasEmb && (
              <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Your $EMB Balance</h2>
                    <p className="text-gray-400 text-sm">Hold $EMB to unlock premium features</p>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 text-center min-w-[150px]">
                    <p className="text-sm text-gray-400">Current Balance</p>
                    <p className="text-2xl font-bold text-blue-400">{embBalance.toFixed(2)} $EMB</p>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${embBalance >= 100 ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30'}`}>
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${embBalance >= 100 ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {embBalance >= 100 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      </div>
                      <h3 className="font-medium">Trade Insights</h3>
                    </div>
                    <p className="text-sm mt-2 text-gray-400">Detailed trading performance metrics</p>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${embBalance >= 100 ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-700/30'}`}>
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${embBalance >= 100 ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {embBalance >= 100 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      </div>
                      <h3 className="font-medium">Holding Rewards</h3>
                    </div>
                    <p className="text-sm mt-2 text-gray-400">5% rewards every 7 days (7 min for testing)</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-blue-500 bg-blue-500/10">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2 bg-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="font-medium">$EMBAI Migration</h3>
                    </div>
                    <p className="text-sm mt-2 text-gray-400">1:1 conversion to $EMBAI coming soon</p>
                  </div>
                </div>
                
                {embBalance >= 100 && holdingStart && !holdingRewardAvailable && (
                  <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Holding reward accumulating...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {holdingRewardAvailable && (
                  <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Holding reward ready to claim!</span>
                      </div>
                      <button
                        onClick={claimHoldingReward}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Claim 5% Reward
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

            {/* Feedback Section */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg mt-8">
              <h2 className="text-xl font-semibold mb-4">Report an Issue</h2>
              <button
                onClick={toggleFeedbackForm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mb-4"
              >
                {showFeedbackForm ? 'Hide Form' : `Report an Issue (${feedbackSubmitted ? '1' : '0'} Issues)`}
              </button>
              
              {showFeedbackForm && (
                feedbackSubmitted ? (
                  <div className="text-green-500 bg-green-500/10 p-4 rounded animate-fade-in">
                    Thank you for your feedback! We'll look into it.
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Describe the issue or feature request..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white"
                      rows="4"
                    />
                    <button
                      onClick={handleFeedbackSubmit}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
                      disabled={!feedback.trim() || isLoading}
                    >
                      {isLoading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
        
        {/* User count indicator with expanding panel */}
        <div className="fixed bottom-4 left-4 bg-gray-800 rounded-full shadow z-40">
          <div 
            className="flex items-center space-x-2 px-3 py-1 cursor-pointer"
            onClick={toggleUsersPanel}
          >
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((user, i) => (
                <div 
                  key={user.id}
                  className={`w-6 h-6 rounded-full bg-${user.color}-500 flex items-center justify-center text-xs font-bold`}
                >
                  {user.name[0]}
                </div>
              ))}
            </div>
            <span className="text-sm font-medium">{onlineUsers.length} users online</span>
          </div>
          
          {showUsersPanel && (
            <div className="absolute bottom-12 left-0 bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg animate-fade-in">
              <h3 className="text-sm font-semibold mb-2 text-gray-300">Online Users</h3>
              <ul className="space-y-2">
                {onlineUsers.map(user => (
                  <li key={user.id} className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full bg-${user.color}-500 flex items-center justify-center text-xs font-bold`}>
                      {user.name[0]}
                    </div>
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-green-500">●</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Loading overlay for trades */}
      {isLoadingTrade && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-blue-300">Analyzing market conditions...</p>
          </div>
        </div>
      )}

      {/* Trade Signal Modal (only shown when autoAcceptTrades is false) */}
      {tradeSignal && !autoAcceptTrades && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
          onClick={handleOutsideClick}
        >
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg max-w-md w-full animate-fade-in md:w-[28rem] w-[90%]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Trade Signal Detected</h2>
              <div className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                {typeof tradeSignal.timestamp === 'number' 
                  ? new Date(tradeSignal.timestamp).toLocaleTimeString()
                  : new Date(tradeSignal.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Trade Pair:</span>
                <span className="font-medium">{tradeSignal.tradePair}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Action:</span>
                <span className={`font-bold ${tradeSignal.action === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {tradeSignal.action === 'buy' ? 'BUY' : 'SELL'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Price:</span>
                <span className="font-medium">
                  ${typeof tradeSignal.price === 'number' ? tradeSignal.price.toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Profit Potential:</span>
                <span className="text-green-500 font-bold">{tradeSignal.profitPotential}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Risk Level:</span>
                <span className={`font-medium ${
                  tradeSignal.riskLevel === 'Low' ? 'text-green-500' : 
                  tradeSignal.riskLevel === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                }`}>{tradeSignal.riskLevel}</span>
              </div>
              
              <div className="h-px bg-gray-700 my-2"></div>
              
              <p className="text-sm text-gray-400">
                This trade was detected by our AI algorithm based on current market conditions.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={handleAcceptTrade} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Accept Trade
              </button>
              <button 
                onClick={handleDeclineTrade} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Decline Trade
              </button>
              <button
                onClick={handleCloseTradeModal}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Auto-Trade Analysis Modal */}
      {showAnalysisModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
          onClick={handleAnalysisModalClose}
        >
          <div 
            className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Embassy AI Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">E</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-center mb-4">AI Auto-Trade Analysis</h2>
            
            {/* Interactive "Powered by AIXBT" Section */}
            <div className="text-center mb-4">
              <button
                onClick={handleAixbtInteraction}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all duration-300 inline-flex items-center"
              >
                <span>Powered by AIXBT</span>
                {!showEmbAgent && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* EMB Agent Section */}
            {showEmbAgent && (
              <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
                <div className="relative">
                  {/* EMB Agent Animation */}
                  <div className="flex justify-center mb-10">
                    <div className="emb-agent-avatar relative">
                      {/* EMB Speech Bubble */}
                      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-blue-600 px-4 py-2 rounded-lg text-white text-sm whitespace-normal max-w-[200px] emb-speech z-10">
                        {embMessage}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-600 rotate-45"></div>
                      </div>
                      
                      {/* EMB Agent Face */}
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-glow emb-bounce">
                        <span className="text-2xl">😊</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sign in to X Button */}
                  {!isSignedInToX && !isAnalyzing && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleSignInToX}
                        className="bg-[#1DA1F2] hover:bg-[#0c8bd9] text-white px-4 py-2 rounded-md transition-colors flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                          <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
                        </svg>
                        Sign in to X
                      </button>
                    </div>
                  )}
                  
                  {/* Loading Indicator */}
                  {isAnalyzing && (
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                  
                  {/* Trade Details */}
                  {tradeDetails && (
                    <div className="mt-6 p-3 bg-gray-800/80 rounded-lg">
                      <h3 className="text-lg font-medium text-center mb-2">Trade Details: ${tradeDetails.token}</h3>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <p className="text-xs text-green-400">Entry</p>
                          <p className="text-sm font-medium">${tradeDetails.entry}</p>
                        </div>
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-400">Take Profit</p>
                          <p className="text-sm font-medium">${tradeDetails.takeProfit}</p>
                        </div>
                        <div className="p-2 bg-red-500/20 rounded-lg">
                          <p className="text-xs text-red-400">Stop Loss</p>
                          <p className="text-sm font-medium">${tradeDetails.stopLoss}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Analysis Modal Content */}
            <p className="text-gray-400 text-center mb-4">
              The AI Auto-Trader will scan the market for high-potential trading opportunities using real-time data from Solana DEXes and advanced predictive models.
            </p>
            
            <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Selection Criteria:</h3>
              <ul className="text-sm text-gray-400 space-y-1 pl-4">
                <li className="list-disc">Tokens launched within 24h</li>
                <li className="list-disc">24h Volume &gt; $10,000</li>
                <li className="list-disc">24h Price change &gt; 10%</li>
              </ul>
            </div>
            
            <div className="flex justify-center space-x-3">
              <button 
                onClick={handleStartAnalysis} 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              >
                Start Analysis
              </button>
              <button 
                onClick={handleAnalysisModalClose} 
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .emb-bounce {
          animation: bounce 2s infinite ease-in-out;
        }
        
        .shadow-glow {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
        }
        
        .emb-speech {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @media (max-width: 640px) {
          .bg-blue-500, .bg-green-500, .bg-purple-500, .bg-amber-500, .bg-pink-500 {
            @apply bg-opacity-90;
          }
        }
      `}</style>
    </div>
  );
}