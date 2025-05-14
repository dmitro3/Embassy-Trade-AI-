'use client';

import { Suspense } from 'react';
import BacktestingDashboard from '../../components/BacktestingDashboard';

export default function BacktestingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center py-20">Loading Backtesting System...</div>}>
        <BacktestingDashboard />
      </Suspense>
    </div>
  );
}
