'use client';

import { useState, useEffect } from 'react';
import FirebaseProvider from "../lib/FirebaseProvider";
import { ThemeProvider } from "../lib/ThemeProvider";
import dynamic from 'next/dynamic';

// Import the Firebase fixer without SSR to ensure it runs only on client side
const FirebaseFixer = dynamic(() => import('../lib/firebaseFixer'), {
  ssr: false,
});

// Simple client layout component for debugging
export default function ClientLayout({ children }) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Only render components after initial mount to avoid hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <>
      {/* Load Firebase fixer before anything else */}
      <FirebaseFixer />
      
      <ThemeProvider>
        <FirebaseProvider>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </FirebaseProvider>
      </ThemeProvider>
    </>
  );
}
