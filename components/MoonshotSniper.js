import React, { useState, useEffect } from 'react';
import useElectron from '../lib/useElectron';

/**
 * MoonshotSniper component for finding high-potential early coin investments
 * Desktop app exclusive feature for identifying new coin listings
 */
const MoonshotSniper = ({ onClose }) => {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [searchInput, setSearchInput] = useState('');
  const [snipingCoin, setSnipingCoin] = useState(null);
  const [snipeAmount, setSnipeAmount] = useState(5);
  const { moonshotSniper, showNotification, isDesktopApp } = useElectron();

  // Load coin data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Either get from API or from moonshotSniper in Electron
        let data;
        if (moonshotSniper) {
          data = await moonshotSniper.getListings();
        } else {
          // Fallback data for web version demo
          data = getMockData();
        }
        setCoins(data);
      } catch (error) {
        console.error('Failed to fetch coins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [moonshotSniper]);

  // Handle sniping a coin
  const handleSnipe = async (coin) => {
    setSnipingCoin(coin);
    
    // In real app, would connect to exchange/wallet
    try {
      if (moonshotSniper) {
        const result = await moonshotSniper.snipeCoin({
          symbol: coin.symbol,
          amount: snipeAmount,
          timestamp: new Date().toISOString()
        });
        
        setTimeout(() => {
          showNotification(
            'Moonshot Sniped!', 
            `Successfully sniped ${coin.symbol} for $${snipeAmount}. Watch for potential gains!`
          );
          setSnipingCoin(null);
          
          // Update the coin in the list
          setCoins(coins.map(c => {
            if (c.id === coin.id) {
              return { ...c, sniped: true, investedAmount: snipeAmount };
            }
            return c;
          }));
        }, 1500);
      } else {
        // Web mode simulation
        setTimeout(() => {
          showNotification(
            'Demo Mode', 
            'Moonshot Sniper is fully functional in the desktop app'
          );
          setSnipingCoin(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Snipe failed:', error);
      showNotification('Snipe Failed', error.message || 'Failed to snipe coin');
      setSnipingCoin(null);
    }
  };

  // Filter and search coins
  const filteredCoins = coins.filter(coin => {
    // Apply filter
    if (filter === 'upcoming' && !coin.upcoming) return false;
    if (filter === 'sniped' && !coin.sniped) return false;
    if (filter === 'trending' && !coin.trending) return false;
    
    // Apply search
    if (searchInput) {
      const search = searchInput.toLowerCase();
      return (
        coin.name.toLowerCase().includes(search) ||
        coin.symbol.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // Mock data for demonstration
  function getMockData() {
    return [
      {
        id: '1',
        name: 'MetaVerse Coin',
        symbol: 'MVC',
        logo: 'https://via.placeholder.com/40',
        price: '$0.00012',
        listingDate: '2023-12-15T14:00:00Z',
        exchange: 'Binance',
        trending: true,
        upcoming: true,
        score: 92,
        potentialROI: '50-100x',
        description: 'Novel metaverse gaming token with strong team and backing'
      },
      {
        id: '2',
        name: 'AI Protocol',
        symbol: 'AIP',
        logo: 'https://via.placeholder.com/40',
        price: '$0.0085',
        listingDate: '2023-12-18T10:00:00Z',
        exchange: 'Coinbase',
        trending: true,
        upcoming: true,
        score: 88,
        potentialROI: '20-40x',
        description: 'Decentralized AI computing platform'
      },
      {
        id: '3',
        name: 'Quantum Finance',
        symbol: 'QFIN',
        logo: 'https://via.placeholder.com/40',
        price: '$0.023',
        listingDate: '2023-12-20T16:00:00Z',
        exchange: 'KuCoin',
        trending: false,
        upcoming: true,
        score: 75,
        potentialROI: '10-20x',
        description: 'Next-gen DeFi protocol with quantum-resistant encryption'
      },
      {
        id: '4',
        name: 'Carbon Credit Token',
        symbol: 'CCT',
        logo: 'https://via.placeholder.com/40',
        price: '$0.17',
        listingDate: '2023-12-14T09:00:00Z',
        exchange: 'Bitfinex',
        trending: true,
        upcoming: true,
        score: 82,
        potentialROI: '5-15x',
        description: 'Tokenized carbon credits on blockchain for sustainability'
      },
      {
        id: '5',
        name: 'Supply Chain Token',
        symbol: 'SCT',
        logo: 'https://via.placeholder.com/40',
        price: '$0.045',
        listingDate: '2023-12-25T13:00:00Z',
        exchange: 'OKX',
        trending: false,
        upcoming: true,
        score: 79,
        potentialROI: '8-15x',
        description: 'Blockchain solution for supply chain tracking and verification'
      }
    ];
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden w-full max-w-3xl">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Moonshot Sniper</h2>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Desktop App Indicator */}
      {!isDesktopApp && (
        <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 px-4 py-2 text-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Limited functionality:</strong> For full Moonshot Sniper features, please use our desktop app
            </span>
          </div>
        </div>
      )}
      
      {/* Search and Filter Controls */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              placeholder="Search coins..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-1 sm:space-x-2">
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'upcoming' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'trending' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setFilter('trending')}
            >
              Trending
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                filter === 'sniped' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => setFilter('sniped')}
            >
              Sniped
            </button>
          </div>
        </div>
      </div>

      {/* Coin Listings */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-240px)]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredCoins.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No coins found matching your criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCoins.map(coin => (
              <div 
                key={coin.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <img 
                        src={coin.logo} 
                        alt={coin.name} 
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          {coin.name}
                          {coin.trending && (
                            <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-orange-900 dark:text-orange-300">
                              Trending
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center mt-1">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                            {coin.symbol}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {coin.price}
                          </span>
                          <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(coin.listingDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded mb-1">
                        Score: {coin.score}/100
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {coin.exchange}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {coin.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Potential ROI:
                        </span>
                        <span className="ml-1 text-sm font-bold text-green-600 dark:text-green-400">
                          {coin.potentialROI}
                        </span>
                      </div>
                      
                      {coin.sniped ? (
                        <div className="flex items-center">
                          <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-medium px-3 py-1.5 rounded-full">
                            Sniped ${coin.investedAmount}
                          </span>
                        </div>
                      ) : snipingCoin && snipingCoin.id === coin.id ? (
                        <div className="flex items-center">
                          <div className="animate-pulse bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full">
                            Sniping...
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <select
                            className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2"
                            value={snipeAmount}
                            onChange={(e) => setSnipeAmount(Number(e.target.value))}
                            disabled={!isDesktopApp}
                          >
                            <option value={5}>$5</option>
                            <option value={10}>$10</option>
                            <option value={25}>$25</option>
                            <option value={50}>$50</option>
                          </select>
                          <button
                            onClick={() => handleSnipe(coin)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-full"
                            disabled={!isDesktopApp && !moonshotSniper}
                          >
                            Invest Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoonshotSniper;