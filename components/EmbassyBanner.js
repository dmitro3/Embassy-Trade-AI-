'use client';

import React, { useState } from 'react';
import Image from 'next/image';

/**
 * Banner component that displays prominently at the top of the page
 * with Embassy branding and information
 */
const EmbassyBanner = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full bg-gradient-to-r from-blue-900/80 to-indigo-900/80 backdrop-blur-sm border-b border-blue-700/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative w-10 h-10 mr-3">
              <Image
                src="/images/logo.png"
                alt="Embassy Trade AI Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="hidden md:block">
              <h3 className="text-white font-medium">Embassy Trade AI</h3>
              <p className="text-blue-200 text-sm">Advanced trading with AI assistance</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="relative min-w-[300px] h-16 mr-4">
              <Image
                src="/images/banner.png"
                alt="Embassy Trade Banner"
                layout="fill"
                objectFit="contain"
                className="object-right"
              />
            </div>
            
            <button 
              onClick={handleClose}
              className="text-blue-300 hover:text-white transition-colors"
              aria-label="Close banner"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbassyBanner;