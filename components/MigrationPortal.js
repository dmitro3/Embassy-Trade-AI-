import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Confetti from 'react-confetti';
import EMBAITokenManager from '../lib/embaiToken';
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Chart component for visualizing benefits
const BenefitsChart = ({ isPaperTrading }) => {
  const benefits = [
    { 
      name: 'Trading Fees', 
      paperValue: 'Standard', 
      liveValue: '20% Discount',
      icon: '💸',
      tooltip: 'Save 20% on all trading fees when using EMBAI tokens'
    },
    { 
      name: 'Whale Alerts', 
      paperValue: 'Delayed', 
      liveValue: 'Real-time',
      icon: '🐋',
      tooltip: 'Get instant notifications when whales make significant moves'
    },
    { 
      name: 'Analytics', 
      paperValue: 'Basic', 
      liveValue: 'Advanced',
      icon: '📊',
      tooltip: 'Access detailed market analysis, sentiment data, and price predictions'
    },
    { 
      name: 'AI Signals', 
      paperValue: 'Limited', 
      liveValue: 'Premium',
      icon: '🤖',
      tooltip: 'Exclusive high-accuracy trading signals from AIXBT and @mobyagent'
    },
    { 
      name: 'Staking Rewards', 
      paperValue: 'None', 
      liveValue: '5% APY',
      icon: '💰',
      tooltip: 'Earn passive income by staking your EMBAI tokens'
    },
    { 
      name: 'Governance', 
      paperValue: 'None', 
      liveValue: 'Full Access',
      icon: '🏛️',
      tooltip: 'Vote on platform updates and participate in DAO decisions'
    }
  ];

  const [activeTooltip, setActiveTooltip] = useState(null);

  return (
    <div className="mt-6 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">Paper vs Live Trading</h3>
      <div className="overflow-hidden">
        <table className="min-w-full">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="text-left py-2 text-sm font-medium text-gray-400">Feature</th>
              <th className="text-center py-2 text-sm font-medium text-gray-400">EMB (Paper)</th>
              <th className="text-center py-2 text-sm font-medium text-blue-400">EMBAI (Live)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {benefits.map((benefit, index) => (
              <tr 
                key={index} 
                className={`${isPaperTrading ? '' : 'opacity-100'} hover:bg-gray-700/30 transition-colors`}
                onMouseEnter={() => setActiveTooltip(index)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <td className="py-3 text-sm flex items-center">
                  <span className="mr-2 text-lg">{benefit.icon}</span>
                  <span>{benefit.name}</span>
                </td>
                <td className="py-3 text-center text-sm text-gray-400">{benefit.paperValue}</td>
                <td className="py-3 text-center text-sm relative">
                  <span className={`font-medium ${isPaperTrading ? 'text-gray-500' : 'text-blue-400'}`}>
                    {benefit.liveValue}
                  </span>
                  {activeTooltip === index && (
                    <div className="absolute left-full ml-2 -top-1 w-48 p-2 bg-gray-900 border border-blue-500 rounded shadow-lg z-10 text-left text-xs">
                      {benefit.tooltip}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          {isPaperTrading 
            ? "Complete required paper trades to unlock all EMBAI benefits" 
            : "You've unlocked all premium features with your EMBAI tokens"}
        </p>
      </div>
    </div>
  );
};

// Enhanced Token Value Comparison Chart with animations
const TokenValueChart = ({ migrationPreview }) => {
  if (!migrationPreview) return null;
  
  const { embBalance, embaiReceived, bonusAmount } = migrationPreview;
  const totalEmbai = embaiReceived + bonusAmount;
  
  return (
    <div className="mt-6 bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-3">Migration Value Comparison</h3>
      <div className="relative pt-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-xs font-semibold text-gray-400">
              Your EMB Balance
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-blue-400">
              {embBalance.toLocaleString()} EMB
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-4 mb-3 text-xs flex rounded bg-gray-700">
          <div 
            style={{ width: "100%" }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-1000"
          ></div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
            <span className="text-xs font-semibold text-gray-400">
              EMBAI Conversion (1:1)
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-cyan-400">
              {embaiReceived.toLocaleString()} EMBAI
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-4 mb-3 text-xs flex rounded bg-gray-700">
          <div 
            style={{ width: "100%" }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-1000"
          ></div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs font-semibold text-gray-400">
              Bonus (10%)
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-green-400">
              +{bonusAmount.toLocaleString()} EMBAI
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-4 mb-3 text-xs flex rounded bg-gray-700">
          <div 
            style={{ width: "10%" }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-1000"
          ></div>
        </div>
        
        <div className="flex items-center justify-between mb-2 mt-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mr-2"></div>
            <span className="text-sm font-bold text-white">
              Total EMBAI After Migration
            </span>
          </div>
          <div>
            <span className="text-sm font-bold text-cyan-400">
              {totalEmbai.toLocaleString()} EMBAI
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-6 mb-1 text-xs flex rounded bg-gray-700">
          <div 
            style={{ width: "90%" }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-1000"
          ></div>
          <div 
            style={{ width: "10%" }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-1000"
          ></div>
        </div>
      </div>
    </div>
  );
};

// Enhanced progress tracking visualization
const GraduationProgress = ({ current, required }) => {
  const percentage = Math.min((current / required) * 100, 100);
  const steps = [];
  
  // Create milestone steps
  for (let i = 1; i <= required; i++) {
    const isCompleted = current >= i;
    steps.push(
      <div key={i} className="flex flex-col items-center">
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
            ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          {isCompleted ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-gray-400">{i}</span>
          )}
        </div>
        <span className="text-xs mt-1 text-gray-400">Trade {i}</span>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">Progress: {current}/{required} trades</span>
        <span className="text-sm font-medium text-blue-400">
          {Math.min(Math.round(percentage), 100)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <div 
          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Milestone indicators */}
      <div className="flex justify-between relative mb-2">
        {/* Connection line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700 -z-10"></div>
        {steps}
      </div>
    </div>
  );
};

const MigrationPortal = ({ onGraduated }) => {
  // Use a ref to prevent Confetti from causing issues
  const containerRef = useRef(null);
  
  const { publicKey } = useWallet();
  const [embBalance, setEmbBalance] = useState(0);
  const [embaiBalance, setEmbaiBalance] = useState(0);
  const [successfulTrades, setSuccessfulTrades] = useState(0);
  const [requiredTrades, setRequiredTrades] = useState(5); // Default, will be updated from token manager
  const [graduationStatus, setGraduationStatus] = useState({
    successfulTrades: 0,
    readyToGraduate: false,
    hasGraduated: false
  });
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);

  // Initialize token manager
  const tokenManager = new EMBAITokenManager(new Connection(clusterApiUrl('devnet')));

  // Handle window resize for confetti dimensions
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setWindowDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      // Initial measurement
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!publicKey) {
        setError('Please connect your wallet to view your migration status');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Get EMB balance (paper trading token)
        const embBal = await tokenManager.getEmbBalance(publicKey.toString());
        setEmbBalance(embBal);
        
        // Get EMBAI balance (live trading token)
        const embaiBal = await tokenManager.getTokenBalance(publicKey.toString());
        setEmbaiBalance(embaiBal);
        
        // Get graduation status
        const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
        setGraduationStatus(status);
        setSuccessfulTrades(status.successfulTrades);
        setRequiredTrades(status.requiredTrades);
        
        // Get migration preview
        const preview = await tokenManager.getMigrationPreview(publicKey.toString());
        setMigrationPreview(preview);
        
        // If user is newly ready to graduate, show confetti
        if (status.readyToGraduate && !status.hasGraduated && !showConfetti) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 7000);
        }
        
        // Notify parent component if user has graduated
        if (status.hasGraduated && onGraduated) {
          onGraduated(true);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Error fetching your data: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, [publicKey, tokenManager, onGraduated]);

  // Handle a successful paper trade simulation
  const handleSimulateTrade = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      // Record a successful paper trade with a random profit between 10 and 100
      const profit = Math.floor(Math.random() * 90) + 10;
      const result = await tokenManager.recordSuccessfulPaperTrade(publicKey.toString(), profit);
      
      setSuccessfulTrades(result.successfulTrades);
      setEmbBalance(result.newBalance);
      
      // Update graduation status
      const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
      setGraduationStatus(status);
      
      // If user is newly ready to graduate, show confetti
      if (result.readyToGraduate && !graduationStatus.readyToGraduate) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 7000);
      }
      
      // Update migration preview
      const preview = await tokenManager.getMigrationPreview(publicKey.toString());
      setMigrationPreview(preview);
      
      setLoading(false);
    } catch (err) {
      console.error('Error simulating trade:', err);
      setError(`Error simulating trade: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle migration from EMB to EMBAI
  const handleMigrate = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      
      // In a real implementation, you would use the SPL private key securely from the back-end
      // Here we'll just call the migrate function directly
      const result = await tokenManager.migrate(publicKey.toString());
      
      if (result.success) {
        setMigrationSuccess(true);
        setMigrationResult(result);
        setEmbBalance(0);
        setEmbaiBalance(prev => prev + result.receivedEmbai);
        
        // Show confetti for successful migration
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 7000);
        
        // Update graduation status
        const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
        setGraduationStatus(status);
        
        // Notify parent component if user has graduated
        if (onGraduated) {
          onGraduated(true);
        }
      } else {
        setError(`Migration failed: ${result.error}`);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error during migration:', err);
      setError(`Error during migration: ${err.message}`);
      setLoading(false);
    }
  };

  // Reset for testing purposes
  const handleReset = async () => {
    if (!publicKey) return;
    
    try {
      // Reset the user's paper trading status
      if (publicKey) {
        await tokenManager.updateEmbBalance(publicKey.toString(), 1000);
        tokenManager.migratedUsers.delete(publicKey.toString());
        if (tokenManager.paperTradingUsers[publicKey.toString()]) {
          tokenManager.paperTradingUsers[publicKey.toString()].successfulTrades = 0;
        }
        
        // Fetch updated data
        const embBal = await tokenManager.getEmbBalance(publicKey.toString());
        setEmbBalance(embBal);
        
        const status = await tokenManager.getTraderGraduationStatus(publicKey.toString());
        setGraduationStatus(status);
        setSuccessfulTrades(status.successfulTrades);
        
        const preview = await tokenManager.getMigrationPreview(publicKey.toString());
        setMigrationPreview(preview);
        
        setMigrationSuccess(false);
        setMigrationResult(null);
        setError('');
        
        // Notify parent component if user has been reset
        if (onGraduated) {
          onGraduated(false);
        }
      }
    } catch (err) {
      console.error('Error resetting:', err);
      setError(`Error resetting: ${err.message}`);
    }
  };

  if (!publicKey) {
    return (
      <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Migration Portal</h2>
        <p className="text-gray-300">Please connect your wallet to view your migration status.</p>
      </div>
    );
  }

  // Benefits Modal
  const BenefitsModal = () => {
    if (!showBenefitsModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-2xl w-full">
          <h3 className="text-xl font-bold mb-4 flex justify-between items-center">
            <span>EMBAI Token Benefits</span>
            <button
              onClick={() => setShowBenefitsModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">🔍 Real-time Whale Tracking</h4>
              <p className="text-sm text-gray-300">Monitor whale movements as they happen with detailed wallet analysis</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">💰 Trading Fee Discounts</h4>
              <p className="text-sm text-gray-300">Save 20% on all trading fees when using EMBAI</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">📊 Advanced Analytics</h4>
              <p className="text-sm text-gray-300">Access market sentiment, price impact prediction, and in-depth market analysis</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">🏆 Premium AI Signals</h4>
              <p className="text-sm text-gray-300">Get exclusive trading signals from AIXBT and @mobyagent with higher accuracy</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">⚡ Priority Execution</h4>
              <p className="text-sm text-gray-300">Your trades are prioritized in high-volume market conditions</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">🗳️ Governance Rights</h4>
              <p className="text-sm text-gray-300">Vote on platform updates and fee distributions</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">🌱 Staking Rewards</h4>
              <p className="text-sm text-gray-300">Earn 5% APY by staking your EMBAI tokens</p>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <h4 className="text-blue-400 font-medium mb-1">🔮 Early Access</h4>
              <p className="text-sm text-gray-300">Be first to access new trading features and integrations</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => setShowBenefitsModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMigrationTimeline = () => {
    const steps = [
      { 
        title: "Paper Trading", 
        description: "Practice with EMB tokens",
        status: "completed"
      },
      { 
        title: "Complete 5 Trades", 
        description: "Build your trading skills",
        status: successfulTrades >= requiredTrades ? "completed" : "active" 
      },
      { 
        title: "Token Migration", 
        description: "Convert EMB to EMBAI",
        status: graduationStatus.hasGraduated ? "completed" : 
                graduationStatus.readyToGraduate ? "active" : "upcoming" 
      },
      { 
        title: "Live Trading", 
        description: "Trade with real assets",
        status: graduationStatus.hasGraduated ? "completed" : "upcoming" 
      }
    ];

    return (
      <div className="my-8">
        <h3 className="text-lg font-bold mb-4">Your Graduation Journey</h3>
        <div className="relative">
          {/* Timeline connector */}
          <div className="absolute h-full w-0.5 bg-gray-700 left-6 top-0"></div>
          
          {steps.map((step, i) => (
            <div key={i} className="relative pl-14 pb-8">
              {/* Timeline node */}
              <div className={`absolute left-4 w-4 h-4 rounded-full border-4 transform -translate-x-1/2
                ${step.status === "completed" ? "bg-green-500 border-green-700" : 
                  step.status === "active" ? "bg-blue-500 border-blue-700" : 
                  "bg-gray-600 border-gray-800"}`}>
              </div>
              
              <div className={`${
                step.status === "completed" ? "text-green-400" : 
                step.status === "active" ? "text-blue-400" : 
                "text-gray-400"
              }`}>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="p-6 bg-gray-900 text-white rounded-lg shadow-lg relative overflow-hidden">
      {showConfetti && (
        <Confetti 
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={500}
          colors={['#00ffff', '#0088ff', '#8800ff', '#ff00ff']}
          confettiSource={{
            x: windowDimensions.width / 2,
            y: windowDimensions.height / 10,
            w: 0,
            h: 0
          }}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          Migration Portal
          {graduationStatus.hasGraduated && (
            <span className="ml-2 px-2 py-1 text-xs bg-green-500/30 text-green-400 rounded-full">
              Graduated
            </span>
          )}
        </h2>
        <div className="flex space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Paper Trading</p>
            <p className="font-bold text-blue-400">{embBalance.toLocaleString()} EMB</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Live Trading</p>
            <p className="font-bold text-cyan-400">{embaiBalance.toLocaleString()} EMBAI</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-300 p-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {migrationSuccess ? (
            <div className="py-8">
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4">Migration Successful!</h3>
                <p className="text-lg mb-4">
                  You've successfully migrated to EMBAI tokens and unlocked access to live trading!
                </p>
                <div className="flex justify-center mb-4">
                  <div className="flex flex-col items-center bg-gray-800 rounded-lg p-4 min-w-[220px]">
                    <p className="text-gray-400 mb-1">You received</p>
                    <p className="text-3xl font-bold text-cyan-400">
                      {migrationResult?.receivedEmbai.toLocaleString()} EMBAI
                    </p>
                    <p className="text-sm text-green-400 mt-2">
                      Including a {migrationResult?.bonusAmount.toLocaleString()} EMBAI bonus!
                    </p>
                  </div>
                </div>
                <p className="mb-4">
                  Your account is now upgraded with premium features including advanced analytics, 
                  whale tracking, and reduced trading fees.
                </p>
                <button
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold"
                  onClick={() => setShowBenefitsModal(true)}
                >
                  View Your New Benefits
                </button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-lg font-medium text-green-400 mb-2">What's Next?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🔍</div>
                    <h4 className="font-medium mb-1">Explore Whale Tracker</h4>
                    <p className="text-sm text-gray-400">Monitor large movements in real-time</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl mb-2">💸</div>
                    <h4 className="font-medium mb-1">Start Live Trading</h4>
                    <p className="text-sm text-gray-400">Execute trades with your EMBAI tokens</p>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🌱</div>
                    <h4 className="font-medium mb-1">Stake Your Tokens</h4>
                    <p className="text-sm text-gray-400">Earn 5% APY on your EMBAI holdings</p>
                  </div>
                </div>
              </div>
            </div>
          ) : graduationStatus.readyToGraduate ? (
            <div className="mb-6">
              <div className="bg-green-900 bg-opacity-20 border border-green-500 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-green-400 mb-2">🎓 Ready to Graduate!</h3>
                <p className="mb-4">
                  Congratulations! You've completed {successfulTrades} successful paper trades 
                  and are ready to migrate to live trading with EMBAI tokens.
                </p>
                
                <TokenValueChart migrationPreview={migrationPreview} />
                
                {renderMigrationTimeline()}
                
                <div className="mt-6">
                  <button
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 rounded-lg font-bold"
                    onClick={handleMigrate}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Migrate to EMBAI Now'}
                  </button>
                  <div className="text-center mt-3 text-sm text-gray-400">
                    Receive a 10% bonus on your EMB balance when you migrate!
                  </div>
                </div>
              </div>
              
              <button 
                className="text-sm text-blue-400 hover:text-blue-300"
                onClick={() => setShowBenefitsModal(true)}
              >
                View detailed EMBAI token benefits →
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">Paper Trading Progress</h3>
              <p className="text-gray-300 mb-6">
                Complete {requiredTrades} successful paper trades to unlock live trading with EMBAI tokens.
              </p>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <GraduationProgress current={successfulTrades} required={requiredTrades} />
                
                {renderMigrationTimeline()}
                
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold mt-4"
                  onClick={handleSimulateTrade}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Simulate Successful Trade'}
                </button>
              </div>
              
              <button 
                className="text-sm text-blue-400 hover:text-blue-300"
                onClick={() => setShowBenefitsModal(true)}
              >
                View benefits of upgrading to live trading →
              </button>
            </div>
          )}
          
          <BenefitsChart isPaperTrading={!graduationStatus.hasGraduated} />
          
          {/* For testing purposes only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 pt-4 border-t border-gray-700">
              <button
                className="text-xs text-gray-500 hover:text-gray-400"
                onClick={handleReset}
              >
                [DEV] Reset Status
              </button>
            </div>
          )}
        </>
      )}
      
      <BenefitsModal />
    </div>
  );
};

export default MigrationPortal;