import { useState, useEffect, useMemo } from 'react';
import { fetchLiveTradingSignals, fetchEMBPrice, getAIRecommendation } from '@/lib/motiaWorkflow';

export default function AIRecommendations({ walletAddress }) {
  const [recommendation, setRecommendation] = useState(null);
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [priceData, aiRecommendation] = await Promise.all([
          fetchEMBPrice(),
          getAIRecommendation()
        ]);

        if (priceData) setPrice(priceData);
        if (aiRecommendation) setRecommendation(aiRecommendation);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const riskBadgeColor = useMemo(() => {
    if (!recommendation) return 'bg-gray-600';
    switch (recommendation.riskLevel) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  }, [recommendation?.riskLevel]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-red-600">
        <h2 className="text-xl font-bold text-red-400">AI Analysis Unavailable</h2>
        <p className="text-gray-400 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-blue-400">AI Trade Analysis</h2>
        {price && (
          <div className="text-right">
            <div className="text-sm text-gray-400">EMB Price</div>
            <div className="text-lg font-medium text-white">${price.price.toFixed(4)}</div>
            <div className={`text-sm ${price.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {recommendation && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-1 rounded text-sm text-white ${riskBadgeColor}`}>
              {recommendation.riskLevel.toUpperCase()} RISK
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">Confidence: {recommendation.confidence.toFixed(1)}%</span>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
            <div className="text-lg font-medium text-white mb-2">
              Recommended Action: {recommendation.action.toUpperCase()}
            </div>
            <div className="text-sm text-gray-400">
              Target Price: ${recommendation.price.toFixed(4)}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Analysis</h3>
            {recommendation.reasoning.map((reason, index) => (
              <div key={index} className="text-sm text-white">
                • {reason}
              </div>
            ))}
          </div>

          {walletAddress && recommendation.action !== 'hold' && (
            <button 
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
              onClick={() => alert('Trade execution coming soon!')}
            >
              Execute {recommendation.action.toUpperCase()} Trade
            </button>
          )}
        </>
      )}
    </div>
  );
}