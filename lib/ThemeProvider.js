'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a context for theme state
const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
  setLightMode: () => {},
});

/**
 * ThemeProvider component for managing dark/light mode
 * 
 * This provider handles theme state management and persistence,
 * automatically detecting system preferences and allowing manual overrides.
 */
export function ThemeProvider({ children }) {
  // Initialize with system preference, defaulting to dark mode if can't detect
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme on component mount
  useEffect(() => {
    // Check for saved preference in localStorage
    const savedTheme = localStorage.getItem('embassy-theme');
    
    if (savedTheme) {
      // Use saved preference if available
      setIsDarkMode(savedTheme === 'dark');
    } else {
      // Otherwise, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
    
    setIsInitialized(true);
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    if (!isInitialized) return;
    
    // Update document class for global styling
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    
    // Save preference to localStorage
    localStorage.setItem('embassy-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode, isInitialized]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      if (!localStorage.getItem('embassy-theme')) {
        setIsDarkMode(e.matches);
      }
    };
    
    // Add event listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Clean up
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Toggle between dark and light mode
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Set dark mode
  const setDarkMode = () => {
    setIsDarkMode(true);
  };

  // Set light mode
  const setLightMode = () => {
    setIsDarkMode(false);
  };

  // Context value
  const contextValue = {
    isDarkMode,
    toggleTheme,
    setDarkMode,
    setLightMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom hook for accessing theme context
 * 
 * @returns {Object} Theme context with isDarkMode state and theme control functions
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
