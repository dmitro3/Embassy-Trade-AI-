'use client';

import React from 'react';
import { useTheme } from '../lib/ThemeProvider';

/**
 * ThemeToggle component for switching between light and dark mode
 * 
 * This component provides a stylish toggle button that reflects the current
 * theme state and allows users to switch between light and dark mode.
 */
const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-full shadow-lg flex items-center justify-center tooltip transition-all duration-300 transform hover:scale-105"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      data-tooltip={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)' 
          : 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
      }}
    >
      {isDarkMode ? (
        // Moon icon for dark mode
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
