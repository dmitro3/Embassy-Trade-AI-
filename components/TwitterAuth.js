'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Component for Twitter OAuth authentication
 */
const TwitterAuth = ({ onLogin }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is already logged in (token in localStorage)
  useEffect(() => {
    const token = localStorage.getItem('twitter_token');
    if (token) {
      setIsLoggedIn(true);
      onLogin && onLogin(token);
    }
  }, [onLogin]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would use the actual Twitter OAuth flow
      // For now, we'll simulate the OAuth process
      const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "simulated_client_id";
      const redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || "http://localhost:3000/auth/twitter/callback";
      
      // In production, redirect to Twitter OAuth page
      // window.location.href = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=users.read%20tweet.read&state=state&code_challenge=challenge&code_challenge_method=plain`;
      
      // For demo purposes, simulate a successful login after a delay
      setTimeout(() => {
        const mockToken = "simulated_twitter_token_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('twitter_token', mockToken);
        setIsLoggedIn(true);
        setIsLoading(false);
        onLogin && onLogin(mockToken);
      }, 1500);
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      setError('Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('twitter_token');
    setIsLoggedIn(false);
    onLogin && onLogin(null);
  };

  return (
    <div className="flex flex-col items-center">
      {!isLoggedIn ? (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`flex items-center justify-center space-x-2 bg-[#1DA1F2] hover:bg-[#1a94da] text-white py-2 px-4 rounded-lg transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              <span>Sign in with X</span>
            </>
          )}
        </button>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center space-x-1 text-green-400 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="text-sm">Connected to X</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-red-400 text-sm">{error}</div>
      )}
    </div>
  );
};

export default TwitterAuth;