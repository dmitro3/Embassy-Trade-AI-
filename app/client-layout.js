'use client';

import { useState, useEffect } from 'react';
import FirebaseProvider from "../lib/FirebaseProvider";
import { ThemeProvider } from "../lib/ThemeProvider";

// Simple client layout component for debugging
export default function ClientLayout({ children }) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Only render components after initial mount to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <ThemeProvider>
      <FirebaseProvider>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
