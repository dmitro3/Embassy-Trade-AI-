import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/lib/WalletProvider';
import { fetchEMBPrice } from '@/lib/motiaWorkflow';

export default function PortfolioTracker() {
  const { walletAddress, connection, status, switchRpcEndpoint } = useWallet();
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!walletAddress || status !== 'connected') return;

    setLoading(true);
    setError(null);

    try {
      // Fetch SOL and EMB prices with RPC failover
      let retryCount = 0;
      const maxRetries = 3;
      let solBalance, embPrice;

      while (retryCount < maxRetries) {
        try {
          solBalance = await connection.getBalance(new PublicKey(walletAddress));
          embPrice = await fetchEMBPrice();
          break;
        } catch (err) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw err;
          }
          console.warn(`RPC attempt ${retryCount} failed, trying alternate endpoint...`);
          switchRpcEndpoint();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setPortfolioData({
        solBalance: solBalance / 1e9,
        embPrice: embPrice?.price || 0,
        embPriceChange: embPrice?.change || 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Portfolio fetch error:', error);
      setError('Failed to fetch portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, connection, status, switchRpcEndpoint]);

  useEffect(() => {
    fetchPortfolioData();
    // Refresh every minute
    const interval = setInterval(fetchPortfolioData, 60000);
    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  if (!walletAddress || status !== 'connected') {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Portfolio Tracker</h2>
        <p className="text-gray-400">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Portfolio Tracker</h2>
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
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400">SOL Balance</div>
              <div className="text-lg font-bold">{portfolioData.solBalance.toFixed(4)} SOL</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-sm text-gray-400">EMB Price</div>
              <div className="text-lg font-bold">
                ${portfolioData.embPrice.toFixed(4)}
                <span className={`ml-2 text-sm ${
                  portfolioData.embPriceChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {portfolioData.embPriceChange >= 0 ? '+' : ''}
                  {portfolioData.embPriceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">
            Last updated: {new Date(portfolioData.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <p>No portfolio data available</p>
      )}
    </div>
  );
}