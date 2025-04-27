'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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

// Fallback to hardcoded values if environment variables are not available
// This helps during development but should be removed in production
if (!firebaseConfig.apiKey) {
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

// Check if we're in the browser environment and Firebase hasn't been initialized yet
if (typeof window !== 'undefined') {
  const apps = getApps();
  if (apps.length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = apps[0];
  }
  
  auth = getAuth(app);
  
  // Only initialize analytics on the client side
  try {
    analytics = getAnalytics(app);
  } catch (analyticsError) {
    console.warn('Firebase analytics initialization failed:', analyticsError);
  }
}

export { app, auth, analytics };
export default app;
