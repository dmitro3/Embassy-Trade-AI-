'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Embassy Trade AI logo component with animated hexagonal emblem
 * Enhanced with Solana-inspired styling and animations
 */
const EmbassyLogo = ({ size = 'md', showText = true, variant = 'default' }) => {
  // Set dimensions based on size prop
  const dimensions = {
    xs: { logo: 24, container: 'h-6' },
    sm: { logo: 30, container: 'h-8' },
    md: { logo: 40, container: 'h-10' },
    lg: { logo: 50, container: 'h-12' },
    xl: { logo: 60, container: 'h-16' }
  };
  
  const { logo, container } = dimensions[size] || dimensions.md;
  
  // Logo path - with fallback option
  const logoPath = '/images/embassy-logo.png';
  
  // Handle image error by falling back to a placeholder
  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/150x150.png?text=Embassy+Logo';
    e.target.onerror = null; // Prevent infinite loop
  };

  return (
    <div className={`flex items-center ${container}`}>
      <div className="relative">
        {/* Logo container with elegant glow effect using Solana colors */}
        <div className={`relative overflow-hidden rounded-full ${
          variant === 'simple' ? '' : 'bg-gradient-to-br from-[#9945FF]/30 to-[#00FFA3]/30 p-0.5'}`
        }>
          <div className={`${variant === 'simple' ? '' : 'bg-gray-900 rounded-full flex items-center justify-center overflow-hidden'}`}>
            <Image 
              src={logoPath} 
              alt="Embassy Trade AI" 
              width={logo} 
              height={logo}
              className="object-contain" 
              priority
              onError={handleImageError}
              style={{
                filter: variant === 'simple' ? 'none' : 'drop-shadow(0 0 3px rgba(0, 255, 163, 0.5))'
              }}
            />
          </div>
          
          {/* Enhanced animated glow effect with Solana colors */}
          {variant !== 'simple' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#9945FF]/20 via-transparent to-[#00FFA3]/20 animate-pulse rounded-full pointer-events-none"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#9945FF]/5 to-[#00FFA3]/5 animate-spin-slow rounded-full pointer-events-none opacity-75" style={{ animationDuration: '8s' }}></div>
            </>
          )}
        </div>
      </div>
      
      {/* Enhanced logo text with Solana-inspired gradient */}
      {showText && (
        <div className="ml-2.5 flex flex-col">
          <span className="font-bold text-white text-lg leading-tight tracking-tight">
            Embassy
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF] text-xs font-medium leading-none">
            TRADE AI
          </span>
        </div>
      )}
      
      {/* Add keyframe animation for slow spinning */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EmbassyLogo;