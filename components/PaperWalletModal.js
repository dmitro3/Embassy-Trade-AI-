'use client';

import { useState } from 'react';

export default function PaperWalletModal({ isOpen, onClose, onConnect }) {
  const [selectedNetwork, setSelectedNetwork] = useState('devnet');
  
  if (!isOpen) return null;
  
  const handleConnect = (wallet) => {
    onConnect({
      network: selectedNetwork,
      wallet: wallet,
      balance: selectedNetwork === 'devnet' ? 1 : 2 // 1 SOL for devnet, 2 for testnet
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Connect Wallet</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-5">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Network</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedNetwork('devnet')}
                className={`px-4 py-3 rounded-lg border ${selectedNetwork === 'devnet' 
                  ? 'border-blue-500 bg-blue-900/30' 
                  : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-4 w-4 mr-2">
                    <span className={`block h-3 w-3 rounded-full ${selectedNetwork === 'devnet' ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
                  </div>
                  <div className="text-white font-medium">Devnet</div>
                </div>
                <div className="mt-1 text-xs text-gray-400">Start with 1 SOL</div>
              </button>
              
              <button
                onClick={() => setSelectedNetwork('testnet')}
                className={`px-4 py-3 rounded-lg border ${selectedNetwork === 'testnet' 
                  ? 'border-blue-500 bg-blue-900/30' 
                  : 'border-gray-700 hover:border-gray-600'}`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-4 w-4 mr-2">
                    <span className={`block h-3 w-3 rounded-full ${selectedNetwork === 'testnet' ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
                  </div>
                  <div className="text-white font-medium">Testnet</div>
                </div>
                <div className="mt-1 text-xs text-gray-400">Start with 2 SOL</div>
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Wallet</label>
            <div className="space-y-3">
              <button
                onClick={() => handleConnect('phantom')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold">P</span>
                  </div>
                  <span className="text-white">Phantom</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => handleConnect('solflare')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <span className="text-white">Solflare</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <button
                onClick={() => handleConnect('paper')}
                className="w-full flex items-center justify-between px-4 py-3 bg-green-800 hover:bg-green-700 rounded-lg transition"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-white">Paper Trading (No Wallet Required)</span>
                </div>
                <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-gray-900/50 text-xs text-gray-400">
          Note: This is a paper trading environment. No real funds will be used.
        </div>
      </div>
    </div>
  );
}
