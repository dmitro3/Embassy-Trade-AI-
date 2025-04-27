'use client';

/**
 * SocialButterfly.js - Social interaction component for Embassy Trade AI
 */

import React, { useState, useEffect, useRef } from 'react';
import { startAppTransaction, finishAppTransaction } from '../lib/sentryUtils';
import ErrorBoundary from './ErrorBoundary';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import GameInvite from './GameInvite';
import ArcadeNotification from './ArcadeNotification';

// Main component implementation
const SocialButterflyComponent = () => {
  // Set up Sentry transaction for component load
  useEffect(() => {
    let transaction;
    try {
      transaction = startAppTransaction(
        'social-butterfly-component-load',
        'ui.render'
      );
    } catch (error) {
      console.error('Sentry transaction error:', error);
    }
    
    // Clean up the transaction when component unmounts
    return () => {
      try {
        if (transaction) {
          finishAppTransaction(transaction);
        }
      } catch (error) {
        console.error('Error finishing Sentry transaction:', error);
      }
    };
  }, []);
  // Initialize Firestore
  const firestore = getFirestore();
  // Auth state
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  
  // Component state
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [tradingIdeas, setTradingIdeas] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newIdea, setNewIdea] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isActivated, setIsActivated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  // Refs
  const chatEndRef = useRef(null);
  
  // Activate Social Butterfly feature
  const activateSocialButterfly = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        socialButterflyActivated: true
      });
      
      setIsActivated(true);
      
      // Create initial user status
      const userStatusRef = doc(firestore, 'userStatus', user.uid);
      await updateDoc(userStatusRef, {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '/images/default-avatar.png',
        lastSeen: serverTimestamp(),
        winRate: userProfile?.winRate || 0,
        tradesExecuted: userProfile?.tradesExecuted || 0
      }).catch(() => {
        // If document doesn't exist, create it
        addDoc(collection(firestore, 'userStatus'), {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous User',
          photoURL: user.photoURL || '/images/default-avatar.png',
          lastSeen: serverTimestamp(),
          winRate: userProfile?.winRate || 0,
          tradesExecuted: userProfile?.tradesExecuted || 0
        });
      });
    } catch (error) {
      console.error('Error activating Social Butterfly:', error);
    }
  };
  
  // Send a chat message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    try {
      await addDoc(collection(firestore, 'socialChat'), {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '/images/default-avatar.png',
        message: newMessage,
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Share a trading idea
  const shareIdea = async (e) => {
    e.preventDefault();
    if (!newIdea.trim() || !user) return;
    
    try {
      await addDoc(collection(firestore, 'tradingIdeas'), {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous User',
        photoURL: user.photoURL || '/images/default-avatar.png',
        idea: newIdea,
        likes: 0,
        timestamp: serverTimestamp()
      });
      
      setNewIdea('');
    } catch (error) {
      console.error('Error sharing idea:', error);
    }
  };
  
  // Send a friend request
  const sendFriendRequest = async (toUid) => {
    if (!user) return;
    
    try {
      // Check if request already exists
      const q = query(
        collection(firestore, 'friendRequests'),
        where('from', '==', user.uid),
        where('to', '==', toUid)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log('Friend request already sent');
        return;
      }
      
      // Add friend request
      await addDoc(collection(firestore, 'friendRequests'), {
        from: user.uid,
        fromName: user.displayName || 'Anonymous User',
        fromPhoto: user.photoURL || '/images/default-avatar.png',
        to: toUid,
        status: 'pending',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };
  
  // Accept a friend request
  const acceptFriendRequest = async (requestId, fromUid) => {
    if (!user) return;
    
    try {
      // Update request status
      await updateDoc(doc(firestore, 'friendRequests', requestId), {
        status: 'accepted'
      });
      
      // Update local state
      setFriends(prev => [...prev, fromUid]);
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };
  
  // Decline a friend request
  const declineFriendRequest = async (requestId) => {
    if (!user) return;
    
    try {
      // Update request status
      await updateDoc(doc(firestore, 'friendRequests', requestId), {
        status: 'declined'
      });
      
      // Update local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };
  
  // Start an arcade game with a friend
  const startArcadeGame = (friendUid, gameType) => {
    router.push(`/arcade?opponent=${friendUid}&game=${gameType}`);
  };
  
  // Format timestamp
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // If user is not logged in, show login prompt
  if (!user && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-icy-blue-dark rounded-lg shadow-lg text-white min-h-[400px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
        <h2 className="text-2xl font-bold mb-4">Social Butterfly</h2>
        <p className="text-center mb-6">Please log in to access the Social Butterfly feature.</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-full font-semibold transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }
  
  // If Social Butterfly is not activated, show activation screen
  if (!isActivated && user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-icy-blue-dark rounded-lg shadow-lg text-white min-h-[400px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
        <h2 className="text-2xl font-bold mb-4">Become a Social Butterfly!</h2>
        <p className="text-center mb-6">
          Connect with other traders, share ideas, and challenge friends to games in the Arcade.
        </p>
        <div className="w-64 h-64 relative mb-6">
          <Image 
            src="/images/social-butterfly.png" 
            alt="Social Butterfly" 
            width={256}
            height={256}
            objectFit="contain"
          />
        </div>
        <button 
          onClick={activateSocialButterfly}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          I'm ready to become a Social Butterfly!
        </button>
      </div>
    );
  }
  
  // Main component UI
  return (
    <div className="bg-icy-blue-dark rounded-lg shadow-lg text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
      {/* Header with tabs */}
      <div className="flex border-b border-blue-600">
        <button 
          className={`px-4 py-3 font-semibold ${activeTab === 'chat' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat Room
        </button>
        <button 
          className={`px-4 py-3 font-semibold ${activeTab === 'ideas' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}
          onClick={() => setActiveTab('ideas')}
        >
          Trading Ideas
        </button>
        <button 
          className={`px-4 py-3 font-semibold ${activeTab === 'friends' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
          {friendRequests.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {friendRequests.length}
            </span>
          )}
        </button>
      </div>
      
      {/* Main content area */}
      <div className="flex h-[600px]">
        {/* Left sidebar - Online users */}
        <div className="w-64 border-r border-blue-600 p-4 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">Online Traders</h3>
          {onlineUsers.length === 0 ? (
            <p className="text-blue-300 text-sm">No users online right now</p>
          ) : (
            <ul>
              {onlineUsers.map(user => (
                <li key={user.uid} className="mb-4 flex items-start">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 border-2 border-green-400">
                    <Image 
                      src={user.photoURL || '/images/default-avatar.png'} 
                      alt={user.displayName} 
                      width={40} 
                      height={40} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.displayName}</p>
                    <p className="text-xs text-blue-300">
                      Win Rate: {user.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-300">
                      Trades: {user.tradesExecuted}
                    </p>
                    {!friends.includes(user.uid) && (
                      <button 
                        onClick={() => sendFriendRequest(user.uid)}
                        className="mt-1 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Main content - Changes based on active tab */}
        <div className="flex-1 flex flex-col">
          {/* Chat Room */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 p-4 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <p className="text-blue-300 text-center my-8">No messages yet. Be the first to say hello!</p>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`flex items-start ${msg.uid === user?.uid ? 'justify-end' : ''}`}>
                        {msg.uid !== user?.uid && (
                          <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                            <Image 
                              src={msg.photoURL || '/images/default-avatar.png'} 
                              alt={msg.displayName} 
                              width={32} 
                              height={32} 
                            />
                          </div>
                        )}
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          msg.uid === user?.uid 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-blue-800 text-white rounded-tl-none'
                        }`}>
                          {msg.uid !== user?.uid && (
                            <p className="text-xs font-semibold text-blue-300 mb-1">{msg.displayName}</p>
                          )}
                          <p>{msg.message}</p>
                          <p className="text-xs text-blue-300 mt-1 text-right">{formatTime(msg.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-blue-600">
                <form onSubmit={sendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-l-lg bg-blue-800 text-white placeholder-blue-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-lg font-semibold"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
          
          {/* Trading Ideas */}
          {activeTab === 'ideas' && (
            <>
              <div className="flex-1 p-4 overflow-y-auto">
                {tradingIdeas.length === 0 ? (
                  <p className="text-blue-300 text-center my-8">No trading ideas shared yet. Share your insights!</p>
                ) : (
                  <div className="space-y-6">
                    {tradingIdeas.map(idea => (
                      <div key={idea.id} className="bg-blue-800 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                            <Image 
                              src={idea.photoURL || '/images/default-avatar.png'} 
                              alt={idea.displayName} 
                              width={40} 
                              height={40} 
                            />
                          </div>
                          <div>
                            <p className="font-semibold">{idea.displayName}</p>
                            <p className="text-xs text-blue-300">{new Date(idea.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="mb-3">{idea.idea}</p>
                        <div className="flex justify-between items-center">
                          <button className="flex items-center text-sm text-blue-300 hover:text-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            {idea.likes} {idea.likes === 1 ? 'Like' : 'Likes'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-blue-600">
                <form onSubmit={shareIdea} className="flex flex-col">
                  <textarea
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    placeholder="Share a trading idea or success story..."
                    className="w-full px-4 py-2 rounded-lg bg-blue-800 text-white placeholder-blue-400 focus:outline-none mb-2 min-h-[80px]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold self-end"
                  >
                    Share
                  </button>
                </form>
              </div>
            </>
          )}
          
          {/* Friends */}
          {activeTab === 'friends' && (
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Friend Requests */}
              {friendRequests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">Friend Requests</h3>
                  <div className="space-y-4">
                    {friendRequests.map(request => (
                      <div key={request.id} className="bg-blue-800 rounded-lg p-3 flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                          <Image 
                            src={request.fromPhoto || '/images/default-avatar.png'} 
                            alt={request.fromName} 
                            width={40} 
                            height={40} 
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{request.fromName}</p>
                          <p className="text-xs text-blue-300">Sent {new Date(request.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => acceptFriendRequest(request.id, request.from)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => declineFriendRequest(request.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Friends List */}
              <h3 className="text-lg font-bold mb-3">Friends</h3>
              {friends.length === 0 ? (
                <p className="text-blue-300">You don't have any friends yet. Add friends from the online users list!</p>
              ) : (
                <div className="space-y-4">
                  {friends.map(friendId => {
                    const friendUser = onlineUsers.find(u => u.uid === friendId);
                    const isOnline = !!friendUser;
                    
                    return (
                      <div key={friendId} className="bg-blue-800 rounded-lg p-3 flex items-center">
                        <div className={`w-10 h-10 rounded-full overflow-hidden mr-3 border-2 ${isOnline ? 'border-green-400' : 'border-gray-500'}`}>
                          <Image 
                            src={friendUser?.photoURL || '/images/default-avatar.png'} 
                            alt={friendUser?.displayName || 'Friend'} 
                            width={40} 
                            height={40} 
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{friendUser?.displayName || 'Friend'}</p>
                          <p className="text-xs text-blue-300">
                            {isOnline ? 'Online now' : 'Offline'}
                          </p>
                        </div>
                        {isOnline && (
                          <GameInvite 
                            friend={{
                              wallet: friendId,
                              username: friendUser?.displayName || 'Friend',
                              status: 'online'
                            }}
                            onInviteSent={(invite) => {
                              // In a real implementation, this would save the invitation to Firestore
                              console.log('Game invitation sent:', invite);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom error fallback UI for SocialButterfly component
const socialButterflyFallback = (error, errorInfo, resetErrorBoundary) => (
  <div className="bg-icy-blue-dark rounded-lg shadow-lg text-white overflow-hidden relative p-6">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-blue-600/5 rounded-lg shimmer"></div>
    
    <div className="p-6 bg-gray-800/50 rounded-lg border border-red-500/30 mb-4 relative z-10">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-full mr-3">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Social Butterfly Error</h3>
          <p className="text-blue-300 text-sm">We encountered an issue loading the social features</p>
        </div>
      </div>
      
      <p className="text-red-300 text-sm mb-4">{error?.message || 'An unexpected error occurred'}</p>
      
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg flex items-center mx-auto"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Retry
      </button>
    </div>
    
    <div className="text-center text-blue-200 text-sm relative z-10">
      <p>This error has been automatically reported to our team.</p>
      <p className="mt-2">You can try refreshing the page or come back later.</p>
    </div>
  </div>
);

// Export the SocialButterfly component wrapped in an ErrorBoundary
const SocialButterfly = () => (
  <ErrorBoundary fallback={socialButterflyFallback}>
    <SocialButterflyComponent />
  </ErrorBoundary>
);

export default SocialButterfly;
