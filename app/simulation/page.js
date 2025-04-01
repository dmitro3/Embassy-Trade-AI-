'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useWallet } from '@/lib/WalletProvider';
import CoinSelector from '@/components/CoinSelector';

// Dynamically import components with browser APIs
const TradingSimulator = dynamic(
  () => import('@/components/TradingSimulator'),
  { ssr: false }
);

export default function SimulationPage() {
  const [selectedCoin, setSelectedCoin] = useState('SOL');
  const [mockBalances, setMockBalances] = useState({
    SOL: 100,
    USDC: 100,
    JITO: 100,
    EMB: 0
  });
  const [mockTradeResults, setMockTradeResults] = useState([]);
  const { publicKey } = useWallet();
  const walletAddress = publicKey ? publicKey.toString() : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800/80 backdrop-blur-sm p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Embassy Trading Simulator</h1>
          </div>
          <Link href="/" className="text-blue-400 hover:text-blue-300">Back to Dashboard</Link>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Trading Simulator</h2>
          {walletAddress ? (
            <div>
              <CoinSelector 
                selectedCoin={selectedCoin} 
                onCoinChange={setSelectedCoin} 
              />
              
              <TradingSimulator 
                onSuccessfulTrade={(trade) => {
                  const tradeWithCoin = { ...trade, tradingCoin: selectedCoin };
                  setMockTradeResults(prev => [...prev, tradeWithCoin]);
                }}
                selectedCoin={selectedCoin}
                coinBalance={mockBalances[selectedCoin]}
              />
            </div>
          ) : (
            <p className="text-gray-400">Connect your wallet to start trading simulation</p>
          )}
        </div>
      </main>
    </div>
  );
}