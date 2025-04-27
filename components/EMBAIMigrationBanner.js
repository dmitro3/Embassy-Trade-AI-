'use client';

import React from 'react';
import Link from 'next/link';

const EMBAIMigrationBanner = () => {
  return (
    <div className="mt-8 bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-5 rounded-lg border border-blue-800/40">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-4 md:mb-0 md:mr-6">
          <h4 className="text-lg text-white font-medium mb-2 flex items-center">
            <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Migrate to $EMBAI — The Future of AI Trading
          </h4>
          <p className="text-sm text-gray-300">
            $EMB powers our playground—soon you'll be able to burn it for $EMBAI, the official token with complete utility and tokenomics.
          </p>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="bg-blue-900/30 px-3 py-1 rounded-full text-xs text-blue-300 flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
              Reduced Trading Fees
            </div>
            <div className="bg-green-900/30 px-3 py-1 rounded-full text-xs text-green-300 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              Enhanced AI Signals
            </div>
            <div className="bg-purple-900/30 px-3 py-1 rounded-full text-xs text-purple-300 flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
              Governance Rights
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-60 group-hover:opacity-80 transition duration-1000 group-hover:duration-300"></div>
            <Link 
              href="/api/migration-guide" 
              target="_blank"
              className="relative bg-gray-900 rounded-lg px-5 py-2.5 flex items-center justify-center"
            >
              <span className="text-white font-medium">View Migration Guide</span>
            </Link>
          </div>
          
          <button
            onClick={() => window.open('https://pump.fun/coin/D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump', '_blank')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
          >
            Get $EMB Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EMBAIMigrationBanner;