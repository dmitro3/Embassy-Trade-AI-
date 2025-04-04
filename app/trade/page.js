'use client';

import React from 'react';
import Header from '@/components/Header';
import TradeTab from '@/components/TradeTab';
import EmbassyBanner from '@/components/EmbassyBanner';
import { WalletProvider } from '@/lib/WalletProvider';

/**
 * Trade page that displays the Photon trading interface
 */
export default function TradePage() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 py-6">
          {/* Trade page header with banner */}
          <div className="relative mb-6 rounded-xl overflow-hidden">
            <EmbassyBanner className="h-[180px]" variant="light" />
            
            {/* Overlay content */}
            <div className="absolute inset-0 flex items-center px-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Photon Trading</h1>
                <p className="text-gray-300 max-w-xl">
                  Advanced AI-powered trading platform with real-time signals and automated execution
                </p>
              </div>
            </div>
          </div>
          
          <div className="h-[calc(100vh-64px-48px-212px)]">
            <TradeTab />
          </div>
        </main>
      </div>
    </WalletProvider>
  );
}