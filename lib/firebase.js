'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuration states
const isDevelopment = process.env.NODE_ENV === 'development';
const disableFirebase = process.env.DISABLE_FIREBASE === 'true' || isDevelopment;

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// For local development testing without Firebase
if (disableFirebase) {
  console.info('Firebase disabled for local development. Using mock implementation.');
  // Leave the config as is, but we'll skip actual initialization
} 
// Fallback to hardcoded values if environment variables are not available and we're not in development
else if (!firebaseConfig.apiKey && !isDevelopment) {
  console.warn('Firebase environment variables not found, using fallback config');
  firebaseConfig.apiKey = "AIzaSyC62zg1RaBwTjwULUfuTCzpjE5sPD17lHg";
  firebaseConfig.authDomain = "embassytradeai.firebaseapp.com";
  firebaseConfig.projectId = "embassytradeai";
  firebaseConfig.storageBucket = "embassytradeai.firebasestorage.app";
  firebaseConfig.messagingSenderId = "696542024912";
  firebaseConfig.appId = "1:696542024912:web:d32a1f5b6af4e402fe7ad5";
  firebaseConfig.measurementId = "G-TFBE91NNDT";
}

// Initialize Firebase
let app;
let auth;
let analytics = null;

// Mock implementations for development mode
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'dev-user-id' } }),
  signOut: () => Promise.resolve(),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'dev-user-id' } }),
  sendPasswordResetEmail: () => Promise.resolve(),
};

// Check if we're in the browser environment and Firebase hasn't been initialized yet
if (typeof window !== 'undefined') {
  if (disableFirebase) {
    // Use mock implementations for local development
    console.info('Using mock Firebase auth for local development');
    app = null;
    auth = mockAuth;
    analytics = { logEvent: () => {} };
  } else {
    const apps = getApps();
    if (apps.length === 0) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (initError) {
        console.error('Firebase initialization error:', initError);
        app = null;
        auth = mockAuth; // Fallback to mock if initialization fails
      }
    } else {
      app = apps[0];
    }
    
    if (app) {
      try {
        auth = getAuth(app);
      } catch (authError) {
        console.error('Firebase auth initialization error:', authError);
        auth = mockAuth;
      }
      
      // Only initialize analytics on the client side with a valid app
      try {
        analytics = getAnalytics(app);
      } catch (analyticsError) {
        console.warn('Firebase analytics initialization failed:', analyticsError);
        analytics = { logEvent: () => {} };
      }
    } else {
      auth = mockAuth;
      analytics = { logEvent: () => {} };
    }
  }
}

export { app, auth, analytics };
export default app;
