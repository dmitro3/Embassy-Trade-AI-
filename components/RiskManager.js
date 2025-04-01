import { useState, useEffect } from 'react';
import { analyzeTradeRisk, analyzeLeverageRisk, validateLeverageTrade } from '@/lib/riskManagement';

export default function RiskManager({ tradeHistory, leverage = 1, currentMarket }) {
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [leverageRisk, setLeverageRisk] = useState(null);
  const [accountValue, setAccountValue] = useState(0);

  useEffect(() => {
    if (tradeHistory?.length > 0) {
      const analyze = async () => {
        const analysis = await analyzeTradeRisk(tradeHistory);
        setRiskAnalysis(analysis);
        setAccountValue(tradeHistory[0]?.accountValue || 0);

        // Add leverage-specific risk analysis
        if (leverage > 1 && analysis.metrics.volatility) {
          const leverageAnalysis = analyzeLeverageRisk(
            leverage,
            analysis.metrics.volatility / 100,
            tradeHistory[0]?.accountValue || 0
          );
          setLeverageRisk(leverageAnalysis);
        }
      };
      analyze();
    }
  }, [tradeHistory, leverage]);

  if (!riskAnalysis) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Risk Analysis</h2>
      
      <div className="space-y-4">
        {/* Base Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-400">Volatility</span>
            <p className="text-white">{riskAnalysis.metrics.volatility.toFixed(2)}%</p>
          </div>
          <div>
            <span className="text-gray-400">Max Drawdown</span>
            <p className="text-white">{riskAnalysis.metrics.maxDrawdown.toFixed(2)}%</p>
          </div>
          <div>
            <span className="text-gray-400">Sharpe Ratio</span>
            <p className="text-white">{riskAnalysis.metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-gray-400">Risk Level</span>
            <p className={getRiskColor(riskAnalysis.riskLevel)}>{riskAnalysis.riskLevel}</p>
          </div>
        </div>

        {/* Leverage-specific Risk Section */}
        {leverage > 1 && leverageRisk && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Leverage Risk ({leverage}x)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400">Leveraged Volatility</span>
                <p className={getRiskColor(leverageRisk.riskLevel)}>
                  {(leverageRisk.leveragedVolatility * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-gray-400">Max Position Size</span>
                <p className="text-white">${leverageRisk.maxPositionSize.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Max Potential Loss</span>
                <p className="text-red-400">${leverageRisk.maxPotentialLoss.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-400">Recommended Stop-Loss</span>
                <p className="text-white">{leverageRisk.recommendedStopLoss.toFixed(1)}%</p>
              </div>
            </div>

            {/* Risk Warnings */}
            {leverageRisk.leveragedVolatility > 0.15 && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
                <p className="font-bold">⚠️ High Risk Warning</p>
                <p className="text-sm">
                  {leverage}x leverage significantly amplifies your risk. Consider reducing
                  leverage or position size in current market conditions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h3>
          <ul className="space-y-2">
            {riskAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-white">• {rec}</li>
            ))}
            {leverage > 1 && (
              <li className="text-sm text-white">
                • Set stop-loss at {leverageRisk?.recommendedStopLoss.toFixed(1)}% to protect against leveraged losses
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}