'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import EMBAIMigrationBanner from '@/components/EMBAIMigrationBanner';
import * as Sentry from '@sentry/nextjs';

// Dynamically import components with browser APIs
const DevnetTesting = dynamic(
  () => import('@/components/DevnetTesting'),
  { ssr: false, loading: () => <p className="text-gray-400">Loading Devnet Testing Suite...</p> }
);

export default function DevnetTestingPage() {
  // Set up Sentry transaction for page load
  useEffect(() => {
    let transaction;
    try {
      transaction = Sentry.startNewTrace({
        name: 'devnet-testing-page-load',
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Beta Banner */}
      <div className="bg-amber-500 text-black p-2 text-center font-medium">
        Beta Mode: Proof of Concept for Solana Early Adopters
      </div>
      
      {/* Navigation */}
      <nav className="bg-gray-800/80 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex space-x-6 md:flex-row flex-col md:space-y-0 space-y-2">
            <a href="/" className="text-white hover:text-blue-300">Dashboard</a>
            <a href="/simulation" className="text-white hover:text-blue-300">Simulation</a>
            <a href="/devnet-testing" className="text-blue-400 hover:text-blue-300 font-medium">Devnet Testing</a>
            <a href="/arcade" className="text-white hover:text-blue-300">Arcade</a>
          </div>
          <div>
            <h1 className="text-xl font-bold">Embassy Trading AI</h1>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        <DevnetTesting />
        <div className="mb-8">
          <EMBAIMigrationBanner />
        </div>
      </main>
      
      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
        }
        
        .shadow-glow {
          animation: glow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
