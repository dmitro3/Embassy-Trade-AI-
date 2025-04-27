'use client';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import logger from '@/lib/logger';

export default function TradeForm() {
  const { publicKey, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [tradeData, setTradeData] = useState(null);
  const [error, setError] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Log component mount for debugging
    logger.info('TradeForm component mounted');
    console.log('TradeForm component mounted');
    console.log('Wallet connected:', connected);
    console.log('Public key:', publicKey?.toString());

    // Create a new AbortController for this effect
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const fetchData = async () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Only fetch data if wallet is connected
      if (!connected || !publicKey) {
        console.log('Wallet not connected, skipping data fetch');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching trade data from API...');
        setError(null);
        setIsLoading(true);

        // Set a timeout to abort the fetch after 10 seconds
        const timeout = setTimeout(() => {
          if (abortControllerRef.current) {
            console.error('API request timed out after 10 seconds');
            abortControllerRef.current.abort();
            setError('Request timed out. Please try again.');
            setIsLoading(false);
          }
        }, 10000);
        
        setTimeoutId(timeout);

        // Make the fetch request with the abort signal
        const response = await fetch('http://localhost:5000/api/tradeform-data', {
          signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Clear the timeout since the request completed
        clearTimeout(timeout);
        setTimeoutId(null);

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Trade data received:', data);
        
        setTradeData(data);
        setIsLoading(false);
      } catch (err) {
        // Don't update state if the component is unmounting
        if (signal.aborted && err.name === 'AbortError') {
          console.log('Fetch aborted due to component unmount or timeout');
          return;
        }

        console.error('Error fetching trade data:', err);
        setError(err.message || 'Failed to fetch trade data');
        setIsLoading(false);
        
        // Log the error for debugging
        logger.error(`TradeForm fetch error: ${err.message}`);
      }
    };

    fetchData();

    // Cleanup function to abort any in-flight requests when the component unmounts
    return () => {
      console.log('TradeForm component unmounting, cleaning up');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [connected, publicKey]);

  // Handle retry button click
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    
    // Force re-fetch by updating the publicKey dependency
    // This will trigger the useEffect again
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
    
    // Re-fetch data
    fetch('http://localhost:5000/api/tradeform-data', {
      signal: abortControllerRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Trade data received on retry:', data);
      setTradeData(data);
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Error fetching trade data on retry:', err);
      setError(err.message || 'Failed to fetch trade data');
      setIsLoading(false);
    });
  };

  // Wallet not connected state
  if (!connected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-lg border border-blue-800/30 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-4">Trade Form</h1>
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/30 text-center">
            <p className="text-blue-300 mb-4">Please connect your wallet to access the trade form</p>
            <button 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
              onClick={() => console.log('Connect wallet clicked')}
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-lg border border-blue-800/30 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-4">Trade Form</h1>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-blue-300">Loading trade data...</p>
            <p className="text-gray-400 text-sm mt-2">Fetching from API endpoint</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-lg border border-red-800/30 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-4">Trade Form</h1>
          <div className="bg-red-900/20 p-6 rounded-lg border border-red-800/30">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="flex space-x-4">
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
              >
                Retry
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-300"
              >
                Go to Home
              </button>
            </div>
            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg text-sm text-gray-400">
              <p className="font-semibold mb-2">Debugging Information:</p>
              <p>Wallet connected: {connected ? 'Yes' : 'No'}</p>
              <p>Public key: {publicKey ? publicKey.toString() : 'None'}</p>
              <p>API endpoint: http://localhost:5000/api/tradeform-data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Success state
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-lg border border-blue-800/30 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Trade Form</h1>
        <div className="bg-gray-900/50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">Trade Data</h2>
          {tradeData ? (
            <pre className="bg-gray-800 p-4 rounded-lg overflow-auto text-gray-300 text-sm">
              {JSON.stringify(tradeData, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No trade data available</p>
          )}
          
          <div className="mt-6 flex space-x-4">
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
            >
              Refresh Data
            </button>
            <button 
              onClick={() => window.location.href = '/tradeforce'}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-300"
            >
              Go to TradeForce
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
