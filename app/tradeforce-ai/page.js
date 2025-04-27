// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\app\tradeforce-ai\page.js
'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import SolanaWalletProvider from '../../components/SolanaWalletProvider';

// Dynamically import TradeForceEnhanced component with no SSR to prevent hydration issues
const TradeForceEnhanced = dynamic(
  () => import('../../components/TradeForceEnhanced'),
  { ssr: false }
);

/**
 * TradeforceAIPage Component
 * 
 * Main page for the TradeForce AI trading system.
 * Wraps the core functionality with necessary providers.
 */
export default function TradeforceAIPage() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <SolanaWalletProvider network="devnet">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg text-white">Loading TradeForce AI...</p>
          </div>
        }>
          <TradeForceEnhanced />
        </Suspense>
      </SolanaWalletProvider>
    </div>
  );
}
