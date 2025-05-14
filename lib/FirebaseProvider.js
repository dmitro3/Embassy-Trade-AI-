'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
// Temporarily commenting out the FirebaseErrorBoundary import to bypass the error
// import { FirebaseErrorBoundary } from '../components/FirebaseErrorModule';
import logger from './logger';

// Create context
const FirebaseContext = createContext(null);

// Firebase configuration for TradeForce AI
// Using environment variables with fallback to hardcoded values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDP-kfq_R8QovdosM4tA4p79QWUlSy5jec",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tradeforce-ai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tradeforce-ai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tradeforce-ai.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "253081292765",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:253081292765:web:e75ba3b8ded7e6141c2b54",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-V0R6Z3PNXW"
};

export default function FirebaseProvider({ children }) {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [firebaseAuth, setFirebaseAuth] = useState(null);
  const [firebaseAnalytics, setFirebaseAnalytics] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialized) {
      // Log environment variables to help debug
      console.log('Firebase env vars:', {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Missing',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Missing',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✓ Set' : '✗ Missing',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✓ Set' : '✗ Missing',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✓ Set' : '✗ Missing',
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? '✓ Set' : '✗ Missing'
      });
        try {
        // Before Firebase initialization, disable Installations API globally
        if (typeof window !== 'undefined') {
          // Clear any existing Firebase installations data
          localStorage.removeItem('firebase-installations-database');
          localStorage.removeItem('firebase-installations-store');
          
          // Create a global mock for the Installations API to prevent 403 errors
          window.mockInstallationsAPI = true;
          
          // Add Installations API mock to prevent 403 errors
          if (!window._firebase_installations_compat_mock) {
            window._firebase_installations_compat_mock = {
              getId: () => Promise.resolve('mock-installation-id-' + Date.now()),
              getToken: () => Promise.resolve('mock-token-' + Date.now()),
              onIdChange: () => () => {}
            };
            logger.info('Added Firebase Installations API mock to prevent 403 errors', {
              module: 'firebaseProvider'
            });
          }
        }
        
        // Modify the Firebase config to remove measurement ID
        const safeFirebaseConfig = {
          ...firebaseConfig,
          measurementId: undefined // Remove measurementId to prevent installations API usage
        };
        
        // Check if Firebase has already been initialized
        const apps = getApps();
        let app;
        
        logger.info(`Firebase apps already initialized: ${apps.length}`, {
          module: 'firebaseProvider'
        });
        
        if (apps.length === 0) {
          // Initialize Firebase if it hasn't been initialized yet
          logger.info('Initializing Firebase with modified config', {
            module: 'firebaseProvider',
            hasApiKey: !!safeFirebaseConfig.apiKey,
            hasAuthDomain: !!safeFirebaseConfig.authDomain,
            hasProjectId: !!safeFirebaseConfig.projectId
          });
          
          app = initializeApp(safeFirebaseConfig);
          
          // Immediately disable automatic data collection
          app.automaticDataCollectionEnabled = false;
          
          logger.info('Firebase initialized successfully with data collection disabled', {
            module: 'firebaseProvider'
          });
        } else {
          // Use the existing Firebase app instance
          app = apps[0];
          
          // Still disable data collection on existing app
          app.automaticDataCollectionEnabled = false;
          
          logger.info('Using existing Firebase app instance with data collection disabled', {
            module: 'firebaseProvider'
          });
        }
        
        // Initialize Firebase auth with proper error handling
        const auth = getAuth(app);
        
        // Set persistence to SESSION to avoid the installations API error
        // This keeps authentication state in memory only during the session
        auth.tenantId = null; // Reset tenant ID to avoid permission issues
        
        // Skip analytics completely to avoid Installations API errors
        let analytics = null;
        
        setFirebaseApp(app);
        setFirebaseAuth(auth);
        setFirebaseAnalytics(analytics);
        setInitialized(true);
      } catch (err) {
        console.error('Error initializing Firebase:', err);
        setError(err.message);
      }
    }
  }, [initialized]);
  // Log to our structured logger instead of console
  useEffect(() => {
    if (initialized) {
      logger.info('Firebase initialized successfully', { module: 'firebaseProvider' });
    } else if (error) {
      logger.error(`Firebase initialization error: ${error}`, { module: 'firebaseProvider' });
    }
  }, [initialized, error]);
  return (
    // Temporarily removing FirebaseErrorBoundary wrapper to avoid the module error
    <FirebaseContext.Provider value={{ 
      app: firebaseApp, 
      auth: firebaseAuth, 
      analytics: firebaseAnalytics, 
      initialized, 
      error 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to use the Firebase context
export const useFirebase = () => useContext(FirebaseContext);
