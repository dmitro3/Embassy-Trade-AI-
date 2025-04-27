'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from /trade to /tradeforce
 * This page exists to maintain backward compatibility with existing links
 */
export default function TradeRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new TradeForce page
    router.replace('/tradeforce');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-blue-500">Redirecting to TradeForce...</div>
    </div>
  );
}
