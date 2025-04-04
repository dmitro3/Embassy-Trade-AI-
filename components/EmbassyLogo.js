'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Embassy Trade AI logo component with animated hexagonal emblem
 * Updated to use the actual logo from the EMBASSYTRADEAI X account
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
  
  // Logo path - using the actual logo from X account
  const logoPath = '/images/embassy-logo.png';
  
  return (
    <div className={`flex items-center ${container}`}>
      <div className="relative">
        {/* Logo container with hexagon shape and pulsing glow effect */}
        <div className={`relative overflow-hidden rounded-full ${variant === 'simple' ? '' : 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-0.5'}`}>
          {/* Actual logo image from X account */}
          <div className={`${variant === 'simple' ? '' : 'bg-gray-900 rounded-full'}`}>
            <Image 
              src={logoPath} 
              alt="Embassy Trade AI" 
              width={logo} 
              height={logo}
              className="object-contain" 
              priority
            />
          </div>
          
          {/* Animated glow effect - only for non-simple variant */}
          {variant !== 'simple' && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 animate-pulse rounded-full pointer-events-none"></div>
          )}
        </div>
      </div>
      
      {/* Logo text */}
      {showText && (
        <div className="ml-2 flex flex-col">
          <span className="font-bold text-white text-lg leading-tight tracking-tight">
            Embassy
          </span>
          <span className="text-blue-400 text-xs font-medium leading-none">
            TRADE AI
          </span>
        </div>
      )}
    </div>
  );
};

export default EmbassyLogo;