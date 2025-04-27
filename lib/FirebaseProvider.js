'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Create context
const FirebaseContext = createContext(null);

// Firebase configuration using the environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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
        // Check if Firebase has already been initialized
        const apps = getApps();
        let app;
        
        console.log(`Firebase apps already initialized: ${apps.length}`);
        
        if (apps.length === 0) {
          // Initialize Firebase if it hasn't been initialized yet
          console.log('Initializing Firebase with config:', {
            apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
            authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
            projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing'
          });
          
          app = initializeApp(firebaseConfig);
          console.log('Firebase initialized successfully');
        } else {
          // Use the existing Firebase app instance
          app = apps[0];
          console.log('Using existing Firebase app instance');
        }
        
        // Initialize Firebase services
        const auth = getAuth(app);
        
        // Only initialize analytics on the client side
        let analytics = null;
        if (typeof window !== 'undefined') {
          try {
            analytics = getAnalytics(app);
          } catch (analyticsError) {
            console.warn('Firebase analytics initialization failed:', analyticsError);
          }
        }
        
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

  return (
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
