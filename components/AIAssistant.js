import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/lib/WalletProvider';
import { getAIRecommendation } from '@/lib/motiaWorkflow';

export default function AIAssistant({ mockTradeResults }) {
  const { walletAddress, connection, switchRpcEndpoint, status } = useWallet();
  const [portfolioData, setPortfolioData] = useState(null);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!walletAddress || !connection || status !== 'connected') return;

    setLoading(true);
    setError(null);

    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Try to get balance with retries
      let balance;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          balance = await connection.getBalance(publicKey);
          break;
        } catch (err) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw err;
          }
          console.warn(`RPC attempt ${retryCount} failed, trying alternate endpoint...`);
          switchRpcEndpoint();
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Get AI recommendation
      const recommendation = await getAIRecommendation();

      setPortfolioData({ 
        balance: balance / 1e9,
        trades: mockTradeResults?.length || 0,
        recommendation
      });
    } catch (error) {
      console.error('Portfolio analysis error:', error);
      setError('Failed to fetch portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, connection, status, switchRpcEndpoint, mockTradeResults]);

  useEffect(() => {
    fetchPortfolioData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  if (!walletAddress || status !== 'connected') {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
        <p className="text-gray-400">Connect your wallet to view AI insights</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">AI Assistant</h2>
        <button
          onClick={fetchPortfolioData}
          disabled={loading}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="text-red-400 space-y-2">
          <p>{error}</p>
          <button 
            onClick={fetchPortfolioData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : portfolioData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-lg font-bold">{portfolioData.balance.toFixed(4)} SOL</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">Recent Trades</div>
              <div className="text-lg font-bold">{portfolioData.trades}</div>
            </div>
          </div>
          
          {portfolioData.recommendation && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <h3 className="font-bold mb-2">AI Recommendation</h3>
              <div className="space-y-2 text-sm">
                <p>Signal: <span className="font-medium">{portfolioData.recommendation.action}</span></p>
                <p>Confidence: <span className="font-medium">{portfolioData.recommendation.confidence}%</span></p>
                <p>Risk Level: <span className="font-medium">{portfolioData.recommendation.riskLevel}</span></p>
                <div className="mt-3 text-gray-400">
                  {portfolioData.recommendation.reasoning.map((reason, i) => (
                    <p key={i}>• {reason}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>No portfolio data available</p>
      )}
    </div>
  );
}