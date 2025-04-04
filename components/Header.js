'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import EmbassyLogo from './EmbassyLogo';
import { useTokenService } from '@/lib/tokenService';

/**
 * Header component for the Embassy Trade AI application
 */
const Header = () => {
  const pathname = usePathname();
  const { walletConnected, publicKey, balance, connectWallet, disconnectWallet } = useTokenService();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Navigation items
  const navItems = [
    { label: 'Trade', path: '/trade' },
    { label: 'Arcade', path: '/arcade' },
    { label: 'Simulation', path: '/simulation' },
    { label: 'Portfolio', path: '/portfolio' },
  ];
  
  // Badge display - would show verified/premium status
  const BadgeDisplay = () => (
    <div className="flex items-center ml-2">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-0.5">
        <div className="bg-blue-600/20 rounded-full p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 backdrop-filter backdrop-blur-lg bg-gray-900/80 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <EmbassyLogo size="md" />
            </Link>
            <BadgeDisplay />
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.path 
                        ? 'bg-blue-900/30 text-blue-400' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Wallet connection */}
          <div className="flex items-center">
            {walletConnected ? (
              <div className="hidden md:flex items-center">
                <div className="mr-3 bg-gray-800 rounded-lg px-3 py-1.5">
                  <div className="text-xs text-gray-400">EMB Balance</div>
                  <div className="text-white font-medium">{balance ? balance.toFixed(2) : '0.00'}</div>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center text-sm"
                  >
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <button 
                          onClick={disconnectWallet}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          role="menuitem"
                        >
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Wallet
              </button>
            )}
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden ml-2 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-3">
            <ul className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === item.path 
                        ? 'bg-blue-900/30 text-blue-400' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              
              {walletConnected && (
                <li>
                  <button 
                    onClick={() => {
                      disconnectWallet();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Disconnect Wallet
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;