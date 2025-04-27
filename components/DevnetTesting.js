'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { ErrorBoundary } from 'react-error-boundary';
import axios from 'axios';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils';

// Cache service implementation
const cacheService = {
  getCachedItem: async (key, options = {}) => {
    // Simple mock implementation for the cache
    return null;
  },
  setCachedItem: async (key, value, options = {}) => {
    // Simple mock implementation for the cache
    return true;
  }
};

// Main component implementation
const DevnetTestingComponent = () => {
  // Wallet and connection state
  const { publicKey, connected } = useWallet();
  const [connection, setConnection] = useState(null);
  
  // Testing state
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [botLogs, setBotLogs] = useState([]);
  
  // Token state
  const [embBalance, setEmbBalance] = useState(100);
  const [hasBurned, setHasBurned] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // AI settings
  const [selectedAI, setSelectedAI] = useState('gpt4');
  const [marketScenario, setMarketScenario] = useState('bullish');
  
  // AI comparison data
  const [aiComparison, setAiComparison] = useState({
    'gpt4': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
    'grok-mini': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
    'grok2-mini': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
    'deepseek-r1': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 }
  });
  
  // Strategy performance tracking
  const [strategyPerformance, setStrategyPerformance] = useState({
    'arbitrage': {},
    'momentum': {},
    'statistical': {}
  });
  
  const DEVNET_WALLET = 'Gzf96o4iZdPtytRdoqVwo1fbzgQ4AkhwtET3LhG3p8dS';
  
  // Set up Sentry transaction for component load
  useEffect(() => {
    // Start transaction using our utility function
    const transaction = startAppTransaction(
      'devnet-testing-component-load',
      'ui.render'
    );
    
    // Clean up the transaction when component unmounts
    return () => {
      finishAppTransaction(transaction);
    };
  }, []);
  
  // Initialize connection
  useEffect(() => {
    const conn = new Connection('https://devnet-rpc.shyft.to?api_key=whv00T87G8Sd8TeK', 'confirmed');
    setConnection(conn);
    
    // Check if user has already burned tokens for stress test access
    const hasAlreadyBurned = localStorage.getItem('stressTestBurnCompleted') === 'true';
    setHasBurned(hasAlreadyBurned);
    
    // Load mock balance
    const mockBalance = localStorage.getItem('embBalance') || 100;
    setEmbBalance(Number(mockBalance));
  }, []);
  
  // Burn EMB tokens for stress test access
  const handleBurnForAccess = async () => {
    if (!connected) {
      alert('Please connect your wallet first.');
      return;
    }
    
    if (embBalance < 50) {
      alert('Insufficient EMB balance. You need at least 50 EMB to run a stress test.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate burning 50 EMB tokens
      const newBalance = embBalance - 50;
      setEmbBalance(newBalance);
      localStorage.setItem('embBalance', newBalance);
      
      // Mark as burned for stress test access
      localStorage.setItem('stressTestBurnCompleted', 'true');
      setHasBurned(true);
      
      setLoading(false);
      alert('Successfully burned 50 EMB tokens for stress test access!');
    } catch (error) {
      console.error('Error burning tokens:', error);
      setLoading(false);
      alert(`Failed to burn tokens: ${error.message}`);
    }
  };
  
  // Run AI stress test
  const runStressTest = async () => {
    if (!connected) {
      alert('Please connect your wallet first.');
      return;
    }
    
    if (!hasBurned) {
      alert('You need to burn 50 EMB tokens to access stress testing.');
      return;
    }
    
    setIsRunningTest(true);
    setTestProgress(0);
    setBotLogs([]);
    
    try {
      // Run test with the selected AI model
      await runSingleModelTest(selectedAI, marketScenario);
    } catch (error) {
      console.error('Error in stress test:', error);
      setIsRunningTest(false);
      alert(`Stress test error: ${error.message}`);
    }
  };
  
  // Run comparison test with all AI models
  const runComparisonTest = async () => {
    if (!connected) {
      alert('Please connect your wallet first.');
      return;
    }
    
    if (!hasBurned) {
      alert('You need to burn 50 EMB tokens to access stress testing.');
      return;
    }
    
    setIsRunningTest(true);
    setTestProgress(0);
    setBotLogs([]);
    
    try {
      // Reset AI comparison data
      setAiComparison({
        'gpt4': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
        'grok-mini': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
        'grok2-mini': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 },
        'deepseek-r1': { winRate: 0, avgLatency: 0, profitLoss: 0, errorRate: 0, trades: 0 }
      });
      
      // Add log entry for comparison test
      setBotLogs(prev => [{
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `Starting comparison test across all AI models for ${marketScenario} market scenario`
      }, ...prev]);
      
      // Run tests for each AI model
      const aiModels = ['gpt4', 'grok-mini', 'grok2-mini', 'deepseek-r1'];
      
      for (let i = 0; i < aiModels.length; i++) {
        const model = aiModels[i];
        const progress = Math.floor((i / aiModels.length) * 100);
        setTestProgress(progress);
        
        // Add log entry for current model
        setBotLogs(prev => [{
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Testing ${model} (${i + 1}/${aiModels.length})`
        }, ...prev]);
        
        // Run test for current model
        await runSingleModelTest(model, marketScenario, false);
        
        // Short delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Set test progress to 100%
      setTestProgress(100);
      
      // Add log entry for completion
      setBotLogs(prev => [{
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'info',
        message: `Comparison test complete. All AI models tested for ${marketScenario} market scenario.`
      }, ...prev]);
      
      setIsRunningTest(false);
    } catch (error) {
      console.error('Error in comparison test:', error);
      setIsRunningTest(false);
      alert(`Comparison test error: ${error.message}`);
    }
  };
  
  // Run test with a single AI model
  const runSingleModelTest = async (aiModel, scenario, updateUI = true) => {
    try {
      // Save current AI model
      const currentModel = selectedAI;
      
      // Temporarily set the selected AI model for the test
      if (updateUI) {
        setSelectedAI(aiModel);
      }
      
      // Simulate a stress test with progress updates
      const totalTrades = 100;
      let successfulTrades = 0;
      let failedTrades = 0;
      let profitLoss = 0;
      
      // Simulate API call to the selected AI model
      const aiPrediction = await getAIPrediction(scenario);
      
      if (updateUI) {
        // Update progress in intervals to simulate test running
        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          setTestProgress(progress);
          
          // Add a simulated log entry
          if (progress % 20 === 0) {
            const isSuccess = Math.random() > 0.3;
            if (isSuccess) {
              successfulTrades += 5;
              profitLoss += 0.05;
            } else {
              failedTrades += 5;
              profitLoss -= 0.02;
            }
            
            setBotLogs(prev => [{
              id: `log_${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'trade_batch',
              message: `Completed ${progress} trades. ${isSuccess ? 'Successful' : 'Mixed'} results.`
            }, ...prev]);
          }
          
          if (progress >= 100) {
            clearInterval(interval);
            
            // Set final results
            const winRate = (successfulTrades / totalTrades) * 100;
            setTestResults({
              totalTrades,
              successfulTrades,
              failedTrades,
              profitLoss,
              winRate,
              avgExecutionTime: 250,
              errorRate: (failedTrades / totalTrades) * 100,
              aiModel: aiModel,
              aiAccuracy: winRate,
              marketScenario: scenario
            });
            
            setIsRunningTest(false);
          }
        }, 300);
      }
      
      // Restore the original AI model if we're in a comparison test
      if (!updateUI) {
        setSelectedAI(currentModel);
      }
      
      return true;
    } catch (error) {
      console.error(`Error in ${aiModel} test:`, error);
      if (updateUI) {
        setIsRunningTest(false);
        alert(`Stress test error: ${error.message}`);
      }
      return false;
    }
  };
  
  // Get AI prediction with caching and fallback to local API
  const getAIPrediction = async (marketConditions = null) => {
    try {
      // Use the selected market scenario if no specific conditions are provided
      const conditions = marketConditions || marketScenario;
      
      // Create a cache key based on AI model and market conditions
      const cacheKey = `ai_prediction:${selectedAI}:${conditions}`;
      
      // Check cache first
      const cachedPrediction = await cacheService.getCachedItem(cacheKey, { allowStale: true });
      if (cachedPrediction && !cachedPrediction._stale) {
        console.log('Using cached AI prediction');
        return { ...cachedPrediction, cached: true };
      }
      
      // Prepare API request based on selected AI
      const prompt = `Given the following market conditions: ${conditions}, predict whether a Solana (SOL) trade should be BUY or SELL, with confidence score between 0-100 and optimal trade size as percentage of available capital.`;
      
      let prediction;
      
      try {
        // First try using the local API endpoint
        console.log('Calling local AI test API...');
        const localApiResponse = await axios.post('/api/bot/ai-test', {
          config: {
            takeProfitPercent: 15,
            stopLossPercent: 5,
            mevProtection: true,
            minLiquidityThreshold: 1000
          },
          testCount: 100,
          aiModel: selectedAI,
          marketScenario: conditions,
          wallet: connected ? publicKey.toString() : DEVNET_WALLET,
          tokenBalances: { SOL: 1.0, USDC: 100.0 }
        });
        
        console.log('Local API response:', localApiResponse.data);
        
        if (localApiResponse.data && localApiResponse.data.success) {
          const results = localApiResponse.data.results;
          
          // Store the full results for the test display
          setTestResults({
            totalTrades: results.testsRun || 100,
            successfulTrades: Math.round((results.winRate / 100) * (results.testsRun || 100)),
            failedTrades: Math.round(((100 - results.winRate) / 100) * (results.testsRun || 100)),
            profitLoss: (results.winRate - 50) / 500, // Simplified P/L calculation
            winRate: results.winRate,
            avgExecutionTime: results.averageSnipeTime || 250,
            errorRate: 100 - results.snipeSuccessRate || (100 - results.winRate) / 2,
            aiModel: selectedAI,
            aiAccuracy: results.winRate,
            recommendations: results.recommendations || []
          });
          
          // Convert API results to prediction format
          prediction = {
            direction: results.winRate > 55 ? 'buy' : 'sell',
            confidence: Math.min(100, Math.round(results.winRate)),
            size: 0.1,
            source: selectedAI,
            recommendations: results.recommendations,
            winRate: results.winRate,
            timestamp: new Date().toISOString()
          };
          
          console.log('Successfully used local AI test API');
          
          // Add a log entry
          setBotLogs(prev => [{
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'info',
            message: `${selectedAI.toUpperCase()} test completed with ${results.winRate.toFixed(1)}% win rate`
          }, ...prev]);
          
          // Set test progress to 100%
          setTestProgress(100);
          
          // Cache the prediction for 30 minutes
          await cacheService.setCachedItem(cacheKey, prediction, { 
            ttl: 30 * 60 * 1000, // 30 minutes
            cost: selectedAI === 'openai' ? 0.05 : 0.02 // Estimated API cost
          });
          
          return prediction;
        } else {
          throw new Error('Local API returned unsuccessful response');
        }
      } catch (localApiError) {
        console.warn('Local API failed, falling back to direct API calls:', localApiError.message);
        
        // Add error log
        setBotLogs(prev => [{
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          message: `API error: ${localApiError.message}`
        }, ...prev]);
        
        // If local API fails, fall back to simulated results based on AI model
        let simulatedWinRate;
        let simulatedLatency;
        let simulatedProfitLoss;
        
        switch(selectedAI) {
          case 'gpt4':
            simulatedWinRate = Math.random() * 15 + 60; // 60-75%
            simulatedLatency = Math.random() * 200 + 400; // 400-600ms
            simulatedProfitLoss = (simulatedWinRate - 50) / 400; // Higher profit
            break;
          case 'grok-mini':
            simulatedWinRate = Math.random() * 10 + 55; // 55-65%
            simulatedLatency = Math.random() * 100 + 200; // 200-300ms (faster)
            simulatedProfitLoss = (simulatedWinRate - 50) / 500; // Lower profit
            break;
          case 'grok2-mini':
            simulatedWinRate = Math.random() * 12 + 58; // 58-70%
            simulatedLatency = Math.random() * 150 + 250; // 250-400ms
            simulatedProfitLoss = (simulatedWinRate - 50) / 450; // Medium profit
            break;
          case 'deepseek-r1':
            simulatedWinRate = Math.random() * 18 + 62; // 62-80%
            simulatedLatency = Math.random() * 180 + 350; // 350-530ms
            simulatedProfitLoss = (simulatedWinRate - 50) / 380; // Highest profit
            break;
          default:
            simulatedWinRate = Math.random() * 15 + 60; // 60-75%
            simulatedLatency = Math.random() * 200 + 300; // 300-500ms
            simulatedProfitLoss = (simulatedWinRate - 50) / 450; // Medium profit
        }
        
        // Cap win rate at 95%
        simulatedWinRate = Math.min(95, simulatedWinRate);
        
        // Generate model-specific recommendations
        const baseRecommendations = [
          'Increase minimum liquidity threshold to avoid rug pulls',
          'Enable MEV protection to avoid front-running on trades',
          'Consider backtesting with more historical data for better performance'
        ];
        
        // Add AI model specific recommendations
        let aiRecommendation = '';
        switch(selectedAI) {
          case 'gpt4':
            aiRecommendation = 'GPT-4 excels at complex market analysis but has higher latency; consider using for non-HFT strategies';
            break;
          case 'grok-mini':
            aiRecommendation = 'Grok Mini is fast but less accurate; best for high-frequency trading with tight stop losses';
            break;
          case 'grok2-mini':
            aiRecommendation = 'Grok-2 Mini offers good balance of speed and accuracy; ideal for momentum trading';
            break;
          case 'deepseek-r1':
            aiRecommendation = 'DeepSeek R1 shows strong performance in statistical arbitrage; consider for pairs trading';
            break;
        }
        
        const recommendations = [
          ...baseRecommendations,
          aiRecommendation
        ];
        
        const simulatedResults = {
          totalTrades: 100,
          successfulTrades: Math.round(simulatedWinRate),
          failedTrades: Math.round(100 - simulatedWinRate),
          profitLoss: simulatedProfitLoss,
          winRate: simulatedWinRate,
          avgExecutionTime: simulatedLatency,
          errorRate: (100 - simulatedWinRate) / 2,
          aiModel: selectedAI,
          aiAccuracy: simulatedWinRate,
          marketScenario: conditions,
          recommendations: recommendations
        };
        
        setTestResults(simulatedResults);
        
        // Set test progress to 100%
        setTestProgress(100);
        
        // Create prediction from simulated results
        prediction = {
          direction: simulatedWinRate > 55 ? 'buy' : 'sell',
          confidence: Math.min(100, Math.round(simulatedWinRate)),
          size: 0.1,
          source: `${selectedAI}-simulated`,
          recommendations: simulatedResults.recommendations,
          winRate: simulatedWinRate,
          timestamp: new Date().toISOString()
        };
        
        // Add a log entry for fallback
        setBotLogs(prev => [{
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'info',
          message: `Using simulated ${selectedAI.toUpperCase()} results for ${conditions} market scenario`
        }, ...prev]);
        
        // Update AI comparison data
        setAiComparison(prev => ({
          ...prev,
          [selectedAI]: {
            winRate: simulatedWinRate,
            avgLatency: simulatedLatency,
            profitLoss: simulatedProfitLoss,
            errorRate: (100 - simulatedWinRate) / 2,
            trades: 100
          }
        }));
        
        // Cache the prediction for 15 minutes (shorter time for simulated data)
        await cacheService.setCachedItem(cacheKey, prediction, { 
          ttl: 15 * 60 * 1000, // 15 minutes
          cost: 0.01 // Lower cost for simulated data
        });
        
        return prediction;
      }
    } catch (error) {
      console.error('Error getting AI prediction:', error);
      
      // Add error log
      setBotLogs(prev => [{
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        message: `Error: ${error.message}`
      }, ...prev]);
      
      // Return fallback prediction on error
      return {
        direction: Math.random() > 0.5 ? 'buy' : 'sell',
        confidence: 65,
        size: 0.1,
        source: 'fallback',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Rendering code for UI components would go here
  // ...Component UI implementation

  return (
    <div className="flex flex-col h-full">
      <h1>Devnet Testing</h1>
      <p>This component is a placeholder. The full UI would be implemented here.</p>
    </div>
  );
};

// Custom error fallback UI for DevnetTesting component
const devnetTestingFallback = (error, errorInfo, resetErrorBoundary) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-red-800/30">
    <h2 className="text-2xl font-bold text-white">Devnet Testing Error</h2>
    <p className="text-red-300 font-medium mb-2">{error?.message || 'An unexpected error occurred'}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg"
    >
      Try Again
    </button>
  </div>
);

// Export the DevnetTesting component wrapped in an ErrorBoundary
const DevnetTesting = () => (
  <ErrorBoundary fallbackRender={devnetTestingFallback}>
    <DevnetTestingComponent />
  </ErrorBoundary>
);

export default DevnetTesting;
