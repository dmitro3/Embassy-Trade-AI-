'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '../lib/FirebaseProvider';
import { getAuth, signInWithPopup, GoogleAuthProvider, TwitterAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';

/**
 * AuthGuard component to protect routes that require authentication
 * Redirects unauthenticated users to login and creates user profiles in Firestore
 */
const AuthGuard = ({ children }) => {
  const { user, loading } = useFirebase();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Only proceed after Firebase auth state is determined
    if (!loading) {
      if (!user) {
        setShowLoginModal(true);
      } else {
        // User is authenticated, check/create profile
        createUserProfileIfNeeded(user);
        setIsAuthChecked(true);
      }
    }
  }, [user, loading]);

  // Create user profile in Firestore if it doesn't exist
  const createUserProfileIfNeeded = async (user) => {
    try {
      const firestore = getFirestore();
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user profile
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Anonymous User',
          photoURL: user.photoURL || '/images/default-avatar.png',
          createdAt: new Date().toISOString(),
          role: 'user',
          winRate: 0,
          tradesExecuted: 0
        });
        console.log('New user profile created');
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };
  // Handle Twitter sign in
  const handleTwitterSignIn = async () => {
    try {
      const auth = getAuth();
      const provider = new TwitterAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      console.error('Twitter sign in error:', error);
      
      // Provide more helpful error messages
      if (error.code === 'auth/operation-not-allowed') {
        alert('Twitter authentication is not enabled in Firebase. Please contact the administrator.');
      } else {
        alert(`Authentication error: ${error.message}`);
      }
    }
  };

  // Loading state
  if (loading || (!user && !showLoginModal)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-xl text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Login modal
  if (showLoginModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-b from-blue-900 to-blue-700 rounded-lg shadow-xl overflow-hidden max-w-md w-full">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <span className="text-3xl mr-2">❄️</span>
              Authentication Required
            </h2>
            
            <p className="text-gray-300 mb-6">
              Please sign in with your Google or Twitter account to access this feature.
              Your account will be used to save your preferences and track your trading performance.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
              
              <button 
                onClick={handleTwitterSignIn}
                className="w-full flex items-center justify-center bg-[#1DA1F2] hover:bg-[#1a94df] text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                Sign in with X (Twitter)
              </button>
            </div>
            
            <div className="mt-6 text-center text-gray-400 text-sm">
              <p>
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return isAuthChecked ? children : null;
};

export default AuthGuard;
