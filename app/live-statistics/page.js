'use client';

/**
 * Live Statistics Page - Embassy Trade AI
 * 
 * This page displays real-time performance metrics including:
 * - Win Rate Percentage
 * - Trades Executed
 * - EMB Holder Count
 * - Beta Developer Sign-Ups
 */

import React, { useEffect } from 'react';
import LiveStatistics from '../../components/LiveStatistics';
import AuthGuard from '../../components/AuthGuard';
import * as Sentry from '@sentry/nextjs';

// Note: metadata should be moved to a separate layout.js file
// The metadata can't be exported from a 'use client' component

export default function LiveStatisticsPage() {
  // Set up Sentry transaction for page load
  useEffect(() => {
    let transaction;
    try {
      transaction = Sentry.startNewTrace({
        name: 'live-statistics-page-load',
        op: 'pageload'
      });
      
      // No need to set the transaction on the scope as it's handled internally
      // by startNewTrace in the newer Sentry versions
    } catch (error) {
      console.error('Sentry transaction error:', error);
    }
    
    // Clean up the transaction when component unmounts
    return () => {
      try {
        if (transaction && typeof transaction.finish === 'function') {
          transaction.finish();
        }
      } catch (error) {
        console.error('Error finishing Sentry transaction:', error);
      }
    };
  }, []);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-white">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Live Statistics
        </span>
      </h1>
      
      <div className="mb-6">
        <p className="text-blue-200 mb-4">
          Track the real-time performance of Embassy Trade AI. All statistics update automatically every 30 seconds.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">About Win Rate</h3>
            <p className="text-blue-200 text-sm">
              Win rate represents the percentage of successful trades executed by our trading bots. 
              A higher win rate indicates more effective trading algorithms and better market prediction.
            </p>
          </div>
          
          <div className="bg-blue-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">About EMB Holders</h3>
            <p className="text-blue-200 text-sm">
              EMB holder count shows the total number of wallets holding Embassy tokens. 
              This metric reflects the growth of our community and adoption of the platform.
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Statistics Component */}
      <AuthGuard>
        <LiveStatistics />
      </AuthGuard>
      
      {/* Additional Information */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3">Trading Performance</h3>
          <p className="text-blue-200 text-sm mb-4">
            Our advanced trading algorithms are continuously optimized to improve win rates and maximize returns.
            The TradeForce agent uses complex indicators including volume increase detection, momentum analysis,
            and price correction identification.
          </p>
          <div className="border-t border-blue-700 pt-4">
            <p className="text-blue-300 text-xs">
              Note: Past performance does not guarantee future results. Trading involves risk.
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3">Community Growth</h3>
          <p className="text-blue-200 text-sm mb-4">
            The Embassy Trade AI community continues to grow as more traders discover the benefits of our platform.
            Join our Social Butterfly feature to connect with other traders, share ideas, and challenge friends to games.
          </p>
          <div className="border-t border-blue-700 pt-4">
            <a href="/social-butterfly" className="text-blue-300 hover:text-blue-100 text-sm flex items-center">
              <span>Join Social Butterfly</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
        
        <div className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3">Beta Program</h3>
          <p className="text-blue-200 text-sm mb-4">
            Our beta developer program allows early access to new features and APIs.
            Beta developers can contribute to the platform's growth and help shape its future.
          </p>
          <div className="border-t border-blue-700 pt-4">
            <a href="#" className="text-blue-300 hover:text-blue-100 text-sm flex items-center">
              <span>Apply for Beta Access</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-blue-300 text-sm">
        <p>
          Data sources: Internal trading records, Firebase authentication, and Pumpfun/Dexscreener APIs.
        </p>
      </div>
    </div>
  );
}
