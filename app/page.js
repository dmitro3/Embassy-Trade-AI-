'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import EmbassyBanner from '@/components/EmbassyBanner';
import TradeSignals from '@/components/TradeSignals';
import { WalletProvider } from '@/lib/WalletProvider';

export default function Home() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-950">
        <Header />
        
        <main className="container mx-auto px-4 py-6">
          {/* Hero Section with Banner */}
          <div className="relative rounded-xl overflow-hidden mb-10">
            {/* Banner component with X profile banner */}
            <EmbassyBanner className="h-[300px] md:h-[400px]" />
            
            {/* Hero content overlay */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12">
              <div className="max-w-2xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  Trading Intelligence <span className="text-blue-400">Simplified</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 mb-8">
                  Embassy Trade AI uses cutting-edge technology to deliver high-confidence trade signals and market analysis
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/trade" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium">
                    Start Trading
                  </Link>
                  <Link href="/simulation" className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium">
                    Try Simulation
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Trade Signals</h3>
              <p className="text-gray-300">
                Receive professional-grade signals from our AIXBT algorithm and @mobyagent whale tracking system
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Auto-Trading</h3>
              <p className="text-gray-300">
                Our Photon integration lets you automatically execute trades from signals with customizable risk parameters
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">EMB Token</h3>
              <p className="text-gray-300">
                Unlock premium features and earn rewards with our utility token designed for traders
              </p>
            </div>
          </div>
          
          {/* Recent Signals Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Trading Signals</h2>
            <TradeSignals onAcceptSignal={() => {}} />
            <div className="mt-4 text-center">
              <Link href="/trade" className="inline-flex items-center text-blue-400 hover:text-blue-300">
                View all trading signals
                <svg className="w-5 h-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-8 border border-blue-800/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl font-bold text-white mb-2">Ready to elevate your trading?</h2>
                <p className="text-gray-300">Connect your wallet and start receiving premium signals today</p>
              </div>
              <Link 
                href="/trade" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                Get Started Now
              </Link>
            </div>
          </div>
        </main>
      </div>
    </WalletProvider>
  );
}