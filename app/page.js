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
      <div className="min-h-screen bg-[#1A1F2E] text-white">
        <Header />
        
        <main className="container mx-auto px-4 py-6">
          {/* Hero Section with Banner */}
          <div className="relative mb-12">
            {/* Banner component with properly positioned content */}
            <EmbassyBanner className="h-[300px] md:h-[400px]" full={true} />
          </div>
          
          {/* Features section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-[#00FFA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Trade Signals"
              description="Receive professional-grade signals from our AIXBT algorithm and @mobyagent whale tracking system"
            />
            
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-[#9945FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="Auto-Trading"
              description="Our Photon integration lets you automatically execute trades from signals with customizable risk parameters"
            />
            
            <FeatureCard
              icon={
                <svg className="w-6 h-6 text-[#00FFA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="EMB Token"
              description="Unlock premium features and earn rewards with our utility token designed for traders"
            />
          </div>
          
          {/* Recent Signals Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF]">Recent Trading Signals</h2>
            <TradeSignals onAcceptSignal={() => {}} />
            <div className="mt-4 text-center">
              <Link href="/trade" className="inline-flex items-center text-[#9945FF] hover:text-[#9945FF]/80 transition-colors">
                View all trading signals
                <svg className="w-5 h-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#9945FF]/10 to-[#00FFA3]/10 rounded-xl p-8 border border-[#9945FF]/20">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl font-bold text-white mb-2">Ready to elevate your trading?</h2>
                <p className="text-gray-300">Connect your wallet and start receiving premium signals today</p>
              </div>
              <Link 
                href="/trade" 
                className="bg-gradient-to-r from-[#00FFA3] to-[#9945FF] text-gray-900 px-8 py-3 rounded-lg font-medium transition transform hover:scale-105"
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

// Feature card component
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-[#00FFA3]/30 transition-colors">
    <div className="w-12 h-12 bg-gray-700/40 rounded-xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
    <p className="text-gray-300">
      {description}
    </p>
  </div>
);