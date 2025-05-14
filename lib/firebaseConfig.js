'use client';

/**
 * Firebase Configuration
 * 
 * This file provides Firebase configuration for the TradeForce AI Trading System.
 * In development mode, Firebase is disabled to avoid authentication errors.
 */

// Mock Firebase object for development
const mockFirebase = {
  apps: [],
  initializeApp: () => {
    console.log('[Firebase] Using mock implementation for local development');
    return {
      auth: () => ({
        onAuthStateChanged: (callback) => callback(null),
        signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'mock-user-id' } }),
        signOut: () => Promise.resolve(),
      }),
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
            set: () => Promise.resolve(),
          }),
        }),
      }),
    };
  },
};

// Configuration object
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456789",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ABCDEF123"
};

// Initialize Firebase or use mock based on environment
const initFirebase = () => {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (isDev) {
    console.warn('[Firebase] Environment variables not found, using mock implementation');
    console.log('[Firebase] To enable Firebase, add the required API keys to your .env file');
    return mockFirebase;
  }

  // Import Firebase only if we're going to use it
  try {
    const firebase = require('firebase/app');
    require('firebase/auth');
    require('firebase/firestore');
    
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    return firebase;
  } catch (error) {
    console.error('[Firebase] Error initializing Firebase:', error);
    return mockFirebase;
  }
};

// Export the Firebase instance
export const firebase = initFirebase();
export default firebase;
