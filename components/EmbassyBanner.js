'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Embassy Trade AI banner component
 * Uses the actual banner from the EMBASSYTRADEAI X account
 */
const EmbassyBanner = ({ className = '', variant = 'default', children }) => {
  // Banner path - using the actual banner from X account 
  const bannerPath = '/images/embassy-banner.png';
  
  // Apply different styling based on variant
  const variantStyles = {
    default: 'opacity-70',
    light: 'opacity-40',
    dark: 'opacity-90'
  };

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Banner image */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={bannerPath}
          alt="Embassy Trade AI Banner"
          fill
          priority
          className={`object-cover ${variantStyles[variant] || variantStyles.default}`}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-transparent"></div>
      </div>
      
      {/* Optional children content */}
      {children}
    </div>
  );
};

export default EmbassyBanner;