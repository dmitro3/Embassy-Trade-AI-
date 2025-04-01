import { useState, useEffect } from 'react';
import { analyzePortfolioPerformance } from '@/lib/portfolio';

export default function PnLTab({ trades = [], walletAddress }) {
  const [performance, setPerformance] = useState(null);
  const [sortedTrades, setSortedTrades] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    if (trades.length > 0) {
      // Sort trades by timestamp in descending order
      const sorted = [...trades].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      setSortedTrades(sorted);

      // Convert trades to portfolio format for analysis
      const portfolioData = {
        history: trades.map(trade => ({
          date: trade.timestamp,
          value: trade.amount * trade.price
        }))
      };
      const metrics = analyzePortfolioPerformance(portfolioData);
      setPerformance(metrics);
    }
  }, [trades]);

  const filterTrades = () => {
    if (timeframe === 'all') return sortedTrades;
    const now = new Date();
    const cutoff = new Date();
    switch (timeframe) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      default:
        return sortedTrades;
    }
    return sortedTrades.filter(trade => new Date(trade.timestamp) > cutoff);
  };

  const calculatePnL = () => {
    const filteredTrades = filterTrades();
    return filteredTrades.reduce((total, trade) => {
      const profit = trade.type === 'buy' ? 
        trade.amount * (trade.exitPrice || trade.price) - (trade.amount * trade.price) :
        trade.amount * trade.price - (trade.amount * trade.entryPrice);
      return total + profit;
    }, 0);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const renderPerformanceBadge = (value) => {
    const color = value >= 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{value >= 0 ? '+' : ''}{value.toFixed(2)}%</span>;
  };

  // Handle withdraw funds button click
  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
    // Auto-hide the modal after 3 seconds
    setTimeout(() => {
      setShowWithdrawModal(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Total P&L</h3>
          <p className="text-2xl font-bold">{formatCurrency(calculatePnL())}</p>
          
          {/* New Withdraw Funds button */}
          <div className="mt-3">
            <button 
              onClick={handleWithdrawClick}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md opacity-70 hover:opacity-100 transition-opacity flex items-center space-x-2"
              disabled={calculatePnL() <= 0}
            >
              <span className="text-sm">Withdraw Funds</span>
              <span className="text-xs bg-yellow-800 text-yellow-300 px-1.5 py-0.5 rounded">Coming Soon</span>
            </button>
          </div>
        </div>
        {performance && (
          <>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400">Daily Change</h3>
              <p className="text-2xl font-bold">{renderPerformanceBadge(performance.dailyChange)}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400">Weekly Change</h3>
              <p className="text-2xl font-bold">{renderPerformanceBadge(performance.weeklyChange)}</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400">Monthly Change</h3>
              <p className="text-2xl font-bold">{renderPerformanceBadge(performance.monthlyChange)}</p>
            </div>
          </>
        )}
      </div>

      {/* Timeframe Filter */}
      <div className="flex space-x-4">
        <button 
          onClick={() => setTimeframe('all')}
          className={`px-4 py-2 rounded ${timeframe === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          All Time
        </button>
        <button 
          onClick={() => setTimeframe('day')}
          className={`px-4 py-2 rounded ${timeframe === 'day' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          24h
        </button>
        <button 
          onClick={() => setTimeframe('week')}
          className={`px-4 py-2 rounded ${timeframe === 'week' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          7d
        </button>
        <button 
          onClick={() => setTimeframe('month')}
          className={`px-4 py-2 rounded ${timeframe === 'month' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          30d
        </button>
      </div>

      {/* Trade History */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="p-4">Time</th>
              <th className="p-4">Type</th>
              <th className="p-4">Strategy</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Price</th>
              <th className="p-4">Total</th>
              <th className="p-4">P&L</th>
            </tr>
          </thead>
          <tbody>
            {filterTrades().map((trade, index) => {
              const total = trade.amount * trade.price;
              const pnl = trade.type === 'buy' ? 
                (trade.exitPrice ? (trade.exitPrice - trade.price) * trade.amount : null) :
                (trade.entryPrice ? (trade.price - trade.entryPrice) * trade.amount : null);

              return (
                <tr key={index} className="border-t border-gray-800">
                  <td className="p-4">{new Date(trade.timestamp).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">{trade.strategy}</td>
                  <td className="p-4">{trade.amount}</td>
                  <td className="p-4">{formatCurrency(trade.price)}</td>
                  <td className="p-4">{formatCurrency(total)}</td>
                  <td className="p-4">
                    {pnl !== null && (
                      <span className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatCurrency(pnl)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Withdrawals Coming Soon</h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-300 mb-4">
              Withdrawals will be available once live trading mode is activated. Currently, all trades are simulated in paper trading mode.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}