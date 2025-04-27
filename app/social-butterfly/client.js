'use client';

import React, { useEffect } from 'react';
import SocialButterfly from '../../components/SocialButterfly';
import AuthGuard from '../../components/AuthGuard';
import * as Sentry from '@sentry/nextjs';

export default function SocialButterflyClient() {
  // Set up Sentry transaction for page load
  useEffect(() => {
    let transaction;
    try {
      transaction = Sentry.startNewTrace({
        name: 'social-butterfly-page-load',
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
          Social Butterfly
        </span>
      </h1>
      
      <div className="mb-6">
        <p className="text-blue-200 mb-4">
          Connect with other traders, share trading ideas, and challenge friends to games in the Arcade.
          Track your friends' trading performance and build a community of like-minded investors.
        </p>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-blue-900/50 rounded-lg p-4 flex-1 min-w-[250px]">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Chat Room</h3>
            <p className="text-blue-200 text-sm">
              Exchange messages with other traders in real-time. Ask questions, share insights, and build connections.
            </p>
          </div>
          
          <div className="bg-blue-900/50 rounded-lg p-4 flex-1 min-w-[250px]">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Trading Ideas</h3>
            <p className="text-blue-200 text-sm">
              Share your trading strategies and success stories. Learn from others and improve your trading skills.
            </p>
          </div>
          
          <div className="bg-blue-900/50 rounded-lg p-4 flex-1 min-w-[250px]">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Arcade Games</h3>
            <p className="text-blue-200 text-sm">
              Challenge your friends to chess or poker games with $EMB stakes. Have fun while testing your strategic thinking.
            </p>
          </div>
        </div>
      </div>
      
      {/* Social Butterfly Component */}
      <AuthGuard>
        <SocialButterfly />
      </AuthGuard>
      
      <div className="mt-8 text-center text-blue-300 text-sm">
        <p>
          Note: All trading performance data is shared anonymously. Your account balance is always kept private.
        </p>
      </div>
    </div>
  );
}
