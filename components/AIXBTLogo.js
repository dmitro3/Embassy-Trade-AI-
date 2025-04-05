'use client';

import React from 'react';

/**
 * AIXBTLogo Component
 * A consistent display of the AIXBT logo with fallback to SVG when image fails to load
 *
 * @param {Object} props - Component props
 * @param {string} props.size - Size classes for width and height (default: "w-8 h-8")
 * @param {string} props.className - Additional CSS classes
 */
const AIXBTLogo = ({ size = "w-8 h-8", className = "" }) => {
  const [imageLoaded, setImageLoaded] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div className={`${size} bg-blue-600/70 rounded-full flex items-center justify-center text-white overflow-hidden ${className}`}>
      {!imageError ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src="/images/aixbt.png"
            alt="AIXBT"
            className={`w-full h-full object-cover ${imageLoaded ? '' : 'hidden'}`}
            onError={handleImageError}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">AI</div>
            </div>
          )}
        </div>
      ) : (
        // Fallback SVG when image fails to load
        <div className="relative w-full h-full">
          <svg className="absolute inset-0 w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">AI</div>
        </div>
      )}
    </div>
  );
};

export default AIXBTLogo;