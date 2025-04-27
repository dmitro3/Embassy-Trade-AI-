'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import EmbassyLogo from './EmbassyLogo';
import { useTokenService } from '../lib/tokenService';

/**
 * Header component for the Embassy Trade AI application
 */
const Header = () => {
  const pathname = usePathname();
  const { walletConnected, publicKey, connectWallet, disconnectWallet } = useTokenService();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const [sparkleEffect, setSparkleEffect] = useState(true);
  const [rotateEffect, setRotateEffect] = useState(false); // New state for rotate effect
  const [prevWalletState, setPrevWalletState] = useState(false);

  // Track scroll position to adjust header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close menu when wallet connection state changes
  useEffect(() => {
    // Only close the menu when wallet gets connected (not disconnected)
    if (walletConnected && !prevWalletState) {
      // Add a small delay for a smoother transition
      const timer = setTimeout(() => {
        setIsMenuOpen(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    setPrevWalletState(walletConnected);
  }, [walletConnected, prevWalletState]);

  // Enhanced animations for the Kill Some Time link
  useEffect(() => {
    // Pulse animation toggle
    const pulseInterval = setInterval(() => {
      setPulseAnimation((prev) => !prev);
    }, 3000);

    // Sparkle effect toggle
    const sparkleInterval = setInterval(() => {
      setSparkleEffect((prev) => !prev);
    }, 1500);

    // Rotate effect for added attention (brief shake)
    const rotateInterval = setInterval(() => {
      setRotateEffect(true);
      setTimeout(() => setRotateEffect(false), 300);
    }, 5000);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(sparkleInterval);
      clearInterval(rotateInterval);
    };
  }, []);

  // Navigation items (without Arcade, since we'll add a special "Kill Some Time" button)
  const navItems = [
    { label: 'TradeForce', path: '/tradeforce' },
    { label: 'Portfolio', path: '/portfolio' },
    { label: 'Token Discovery', path: '/token-discovery' },
    { label: 'Simulation', path: '/simulation' },
    { label: 'Social Butterfly', path: '/social-butterfly' },
    { label: 'Live Statistics', path: '/live-statistics' },
  ];

  // Handle wallet connection
  const handleConnectWallet = async () => {
    await connectWallet();
    // Menu will be closed by the useEffect that tracks wallet connection state
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'backdrop-blur-xl bg-[#1A1F2E]/90 border-b border-gray-800/50 py-3'
          : 'backdrop-blur-sm bg-[#1A1F2E]/70 py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <EmbassyLogo size="md" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center">
            <ul className="flex space-x-1 mr-4">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      pathname === item.path
                        ? 'bg-gradient-to-r from-[#9945FF]/20 to-[#00FFA3]/20 text-white border border-[#9945FF]/30'
                        : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {/* Super eye-catching Kill Some Time tab for Arcade with enhanced effects */}
              <li className="relative">
                <Link
                  href="/arcade"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all relative 
                    ${pathname === '/arcade'
                      ? 'bg-gradient-to-r from-[#FF6B4A] to-[#FF9A5A] text-gray-900 shadow-lg shadow-[#FF6B4A]/30 scale-105'
                      : `bg-gradient-to-br from-[#FF6B4A] via-[#FF8650] to-[#FF9A5A] text-gray-900 hover:shadow-lg hover:shadow-[#FF6B4A]/20 hover:scale-105 transform transition-all
                      ${pulseAnimation ? 'animate-pulse-slow' : ''} 
                      ${sparkleEffect ? 'sparkle-button' : ''} 
                      ${rotateEffect ? 'animate-wiggle' : ''}`
                    }`}
                  style={{
                    textShadow: pathname !== '/arcade' ? '0 0 2px rgba(255,255,255,0.5)' : 'none',
                  }}
                >
                  <svg
                    className={`w-5 h-5 mr-1.5 ${pathname !== '/arcade' && 'animate-bounce-gentle'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="relative">
                    Kill Some Time
                    {/* Animated underline effect */}
                    {pathname !== '/arcade' && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-300 to-yellow-500 animate-width-expand rounded-full"></span>
                    )}
                  </span>

                  {/* Animated badge with improved visuals */}
                  {pathname !== '/arcade' && (
                    <span className="flex h-6 w-6 absolute -top-2 -right-2 z-10">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
                      <span className="relative rounded-full h-5 w-5 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-[9px] font-bold text-gray-900 border border-yellow-300/50 shadow-inner">
                        NEW
                      </span>
                    </span>
                  )}

                  {/* Extra highlights and glows for more attention */}
                  {pathname !== '/arcade' && (
                    <>
                      <span className="absolute inset-0 rounded-lg overflow-hidden">
                        <span className="absolute inset-0 rounded-lg glow-effect"></span>
                      </span>
                      <span className="absolute -inset-1 rounded-lg overflow-hidden opacity-30">
                        <span className="absolute inset-x-0 -bottom-1 h-1 sparkle-bar"></span>
                      </span>
                      {/* New: Rotating stars decoration */}
                      <span className="absolute -top-1 -right-1 z-0 animate-spin-slow">✨</span>
                      <span className="absolute -bottom-1 -left-1 z-0 animate-spin-slow-reverse">✨</span>
                    </>
                  )}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Wallet connection */}
          <div className="flex items-center">
            {walletConnected ? (
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="bg-gradient-to-r from-[#9945FF]/20 to-[#9945FF]/40 hover:from-[#9945FF]/30 hover:to-[#9945FF]/50 text-white px-4 py-2.5 rounded-lg flex items-center text-sm border border-[#9945FF]/40 transition-all"
                  >
                    <span className="w-2 h-2 bg-[#00FFA3] rounded-full mr-2"></span>
                    {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-gray-800/90 backdrop-blur-xl border border-gray-700/50">
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
                onClick={handleConnectWallet}
                className="bg-gradient-to-r from-[#00FFA3] to-[#9945FF] text-gray-900 px-5 py-2.5 rounded-lg flex items-center text-sm font-medium hover:opacity-90 transform transition hover:scale-105"
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
              className="md:hidden ml-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 focus:outline-none"
              aria-label="Toggle mobile menu"
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
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-700/30 pt-3">
            <ul className="space-y-2">
              {/* Enhanced eye-catching Kill Some Time button for mobile */}
              <li>
                <Link
                  href="/arcade"
                  className="block px-4 py-3 rounded-lg text-base font-bold bg-gradient-to-r from-[#FF6B4A] to-[#FF9A5A] text-gray-900 relative shadow-lg shadow-[#FF6B4A]/20 border border-orange-300/20"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 animate-bounce-gentle" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a 1 1 0 011.12-.38z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="relative">
                        Kill Some Time
                        {/* Mobile version animated underline */}
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-300 to-yellow-500 animate-width-expand rounded-full"></span>
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-gray-900 animate-pulse-slow">
                      NEW!
                    </span>
                  </div>

                  {/* Enhanced glow effect */}
                  <span className="absolute inset-0 rounded-lg overflow-hidden">
                    <span className="absolute inset-0 rounded-lg glow-effect"></span>
                  </span>

                  {/* Confetti-like particle effects */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="confetti-particle"></div>
                    <div className="confetti-particle" style={{ animationDelay: '0.5s' }}></div>
                    <div className="confetti-particle" style={{ animationDelay: '1s' }}></div>
                  </div>
                </Link>
              </li>

              {/* Regular nav items */}
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`block px-4 py-3 rounded-lg text-base font-medium ${
                      pathname === item.path
                        ? 'bg-gradient-to-r from-[#9945FF]/20 to-[#00FFA3]/20 text-white border border-[#9945FF]/30'
                        : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {walletConnected && (
                <>
                  <li className="px-4 py-2">
                    <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-4 py-2 border border-gray-700/30">
                      <span className="text-gray-400 text-sm">Wallet</span>
                      <span className="text-white text-sm">
                        {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                      </span>
                    </div>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-400 hover:bg-gray-700/60 hover:text-red-300"
                    >
                      Disconnect Wallet
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
        )}
      </div>

      {/* Enhanced animations for the "Kill Some Time" tab */}
      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes bounce-gentle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes width-expand {
          0% {
            width: 0;
            left: 50%;
            opacity: 0;
          }
          50% {
            width: 100%;
            left: 0;
            opacity: 1;
          }
          90% {
            width: 100%;
            opacity: 1;
          }
          100% {
            width: 0;
            left: 50%;
            opacity: 0;
          }
        }

        @keyframes wiggle {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(0deg);
          }
          75% {
            transform: rotate(2deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        @keyframes spin-slow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-slow-reverse {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out;
        }

        .animate-width-expand {
          animation: width-expand 3s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 10s linear infinite;
        }

        .sparkle-button::before {
          content: '';
          position: absolute;
          inset: -2px;
          z-index: -1;
          background: linear-gradient(90deg, #ffd700, #ff6b4a, #ffd700);
          background-size: 200% 200%;
          border-radius: 0.5rem;
          animation: sparkle 2s linear infinite;
          opacity: 0.7;
        }

        .glow-effect {
          background: radial-gradient(circle at center, rgba(255, 107, 74, 0.8) 0%, rgba(255, 107, 74, 0) 70%);
          opacity: 0.5;
          mix-blend-mode: screen;
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .sparkle-bar {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
          background-size: 200% 100%;
          animation: sparkle 1.5s linear infinite;
        }

        .confetti-particle {
          position: absolute;
          width: 5px;
          height: 5px;
          background-color: #ffd700;
          border-radius: 50%;
          top: 50%;
          left: 20%;
          animation: confetti 2s ease-out infinite;
        }

        .confetti-particle:nth-child(2) {
          background-color: #ff6b4a;
          left: 50%;
        }

        .confetti-particle:nth-child(3) {
          background-color: white;
          left: 80%;
          animation-duration: 2.5s;
        }
      `}</style>
    </header>
  );
};

export default Header;
