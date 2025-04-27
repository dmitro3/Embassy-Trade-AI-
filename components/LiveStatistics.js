'use client';

/**
 * LiveStatistics.js - Real-time performance data display for Embassy Trade AI
 * 
 * This component displays live statistics including:
 * - Win Rate Percentage
 * - Trades Executed
 * - EMB Holder Count
 * - Beta Developer Sign-Ups
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, getFirestore } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import axios from 'axios';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils';
import ErrorBoundary from './ErrorBoundary';

// Main component implementation
const LiveStatisticsComponent = () => {  
  // Set up Sentry transaction for component load  
  useEffect(() => {
    let transaction;
    try {
      transaction = startAppTransaction(
        'live-statistics-component-load',
        'ui.render'
      );
    } catch (error) {
      console.error('Sentry transaction error:', error);
    }
    
    // Clean up the transaction when component unmounts
    return () => {
      try {
        if (transaction) {
          finishAppTransaction(transaction);
        }
      } catch (error) {
        console.error('Error finishing Sentry transaction:', error);
      }
    };
  }, []);
  // Initialize Firestore
  const firestore = getFirestore();
  // State for statistics
  const [stats, setStats] = useState({
    winRate: 0,
    tradesExecuted: 0,
    embHolderCount: 0,
    betaSignups: 0,
    loading: true
  });

  // Animated counter effect
  const AnimatedCounter = ({ value, label, prefix = '', suffix = '', color = 'blue' }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
      // Animate from current display value to the new value
      let start = displayValue;
      const end = value;
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();
      
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smoother animation
        const easeOutQuad = progress => 1 - (1 - progress) * (1 - progress);
        const currentValue = Math.floor(start + (end - start) * easeOutQuad(progress));
        
        setDisplayValue(currentValue);
        
        if (progress === 1) {
          clearInterval(timer);
        }
      }, 16); // ~60fps
      
      return () => clearInterval(timer);
    }, [value]);
    
    // Determine gradient colors based on the color prop
    const gradientColors = {
      blue: 'from-blue-500 to-blue-300',
      green: 'from-green-500 to-green-300',
      purple: 'from-purple-500 to-purple-300',
      orange: 'from-orange-500 to-orange-300'
    };
    
    return (
      <div className="flex flex-col items-center p-4">
        <div className="text-3xl font-bold mb-2">
          <span className={`bg-clip-text text-transparent bg-gradient-to-r ${gradientColors[color]}`}>
            {prefix}{displayValue.toLocaleString()}{suffix}
          </span>
        </div>
        <div className="text-blue-200 text-sm">{label}</div>
      </div>
    );
  };

  // Fetch statistics from various sources
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch win rate and trades executed from Firebase
        const tradesQuery = query(
          collection(firestore, 'trades'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const tradesSnapshot = await getDocs(tradesQuery);
        const trades = [];
        tradesSnapshot.forEach(doc => {
          trades.push(doc.data());
        });
        
        const successfulTrades = trades.filter(trade => trade.successful).length;
        const calculatedWinRate = trades.length > 0 
          ? (successfulTrades / trades.length) * 100 
          : 0;
        
        // Fetch beta developer sign-ups from Firebase
        const usersQuery = query(
          collection(firestore, 'users'),
          where('role', '==', 'developer')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const betaDevCount = usersSnapshot.size;
        
        // Fetch EMB holder count from Pumpfun API
        let embHolders = 0;
        try {
          const response = await axios.get('https://pump.fun/api/token/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump');
          embHolders = response.data.holders || 0;
        } catch (error) {
          console.error('Error fetching EMB holder count:', error);
          // Fallback to Dexscreener API if Pumpfun fails
          try {
            const dexResponse = await axios.get('https://api.dexscreener.com/latest/dex/tokens/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump');
            embHolders = dexResponse.data.pairs[0]?.holders || 0;
          } catch (dexError) {
            console.error('Error fetching from Dexscreener:', dexError);
          }
        }
        
        // Update state with fetched data
        setStats({
          winRate: Math.round(calculatedWinRate * 10) / 10, // Round to 1 decimal place
          tradesExecuted: trades.length,
          embHolderCount: embHolders,
          betaSignups: betaDevCount,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    
    // Initial fetch
    fetchStats();
    
    // Set up real-time listener for trades
    const tradesQuery = query(
      collection(firestore, 'trades'),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(tradesQuery, (snapshot) => {
      const trades = [];
      snapshot.forEach(doc => {
        trades.push(doc.data());
      });
      
      const successfulTrades = trades.filter(trade => trade.successful).length;
      const calculatedWinRate = trades.length > 0 
        ? (successfulTrades / trades.length) * 100 
        : 0;
      
      setStats(prev => ({
        ...prev,
        winRate: Math.round(calculatedWinRate * 10) / 10,
        tradesExecuted: trades.length
      }));
    });
    
    // Set up interval to refresh EMB holder count every 30 seconds
    const embHolderInterval = setInterval(async () => {
      try {
        const response = await axios.get('https://pump.fun/api/token/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump');
        setStats(prev => ({
          ...prev,
          embHolderCount: response.data.holders || prev.embHolderCount
        }));
      } catch (error) {
        console.error('Error refreshing EMB holder count:', error);
      }
    }, 30000);
    
    // Clean up listeners and intervals
    return () => {
      unsubscribe();
      clearInterval(embHolderInterval);
    };
  }, []);

  // Loading state
  if (stats.loading) {
    return (
      <div className="bg-icy-blue-light rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
        <h2 className="text-2xl font-bold mb-4 text-center">Live Statistics</h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
      </div>
    );
  }

  return (
    <div className="bg-icy-blue-light rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
      <h2 className="text-2xl font-bold mb-4 text-center">Live Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCounter 
          value={stats.winRate} 
          label="Win Rate" 
          suffix="%" 
          color="green" 
        />
        
        <AnimatedCounter 
          value={stats.tradesExecuted} 
          label="Trades Executed" 
          color="blue" 
        />
        
        <AnimatedCounter 
          value={stats.embHolderCount} 
          label="EMB Holders" 
          color="purple" 
        />
        
        <AnimatedCounter 
          value={stats.betaSignups} 
          label="Beta Developers" 
          color="orange" 
        />
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-blue-200 text-sm">
          Statistics update in real-time. Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
      
      {/* Subtle shimmer effect instead of snowflakes */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
    </div>
  );
};

// Custom error fallback UI for LiveStatistics component
const liveStatisticsFallback = (error, errorInfo, resetErrorBoundary) => (
  <div className="bg-icy-blue-light rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
    <h2 className="text-2xl font-bold mb-4 text-center">Live Statistics</h2>
    <div className="p-6 bg-gray-800/50 rounded-lg border border-red-500/30 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-full mr-3">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Statistics Error</h3>
          <p className="text-blue-300 text-sm">We encountered an issue loading the statistics</p>
        </div>
      </div>
      
      <p className="text-red-300 text-sm mb-4">{error?.message || 'An unexpected error occurred'}</p>
      
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg flex items-center mx-auto"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
    
    <div className="text-center text-blue-200 text-sm">
      <p>This error has been automatically reported to our team.</p>
    </div>
  </div>
);

// Export the LiveStatistics component wrapped in an ErrorBoundary
const LiveStatistics = () => (
  <ErrorBoundary fallback={liveStatisticsFallback}>
    <LiveStatisticsComponent />
  </ErrorBoundary>
);

export default LiveStatistics;
