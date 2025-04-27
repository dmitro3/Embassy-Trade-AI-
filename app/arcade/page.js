'use client';

import React from 'react';
import ArcadeWrapper from '../../components/ArcadeWrapper';
import dynamic from 'next/dynamic';

// Dynamically import WalletProvider to avoid SSR issues with wallet connection
const WalletProviderWrapper = dynamic(
  () => import('../../lib/WalletProvider').then(mod => mod.default || mod),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center min-h-screen">
                    <div className="text-blue-500">Loading wallet connection...</div>
                   </div>
  }
);

/**
 * Arcade page
 */
export default function ArcadePage() {
  return (
    <WalletProviderWrapper>
      <ArcadeWrapper />
    </WalletProviderWrapper>
  );
}
