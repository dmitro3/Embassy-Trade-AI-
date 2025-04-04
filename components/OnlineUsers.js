import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const OnlineUsers = ({ walletAddress, userStats }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('online');
  const [userProfile, setUserProfile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [avatarSelection, setAvatarSelection] = useState('default');
  const [customStatus, setCustomStatus] = useState('');
  const [feedPosts, setFeedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentIteration, setCurrentIteration] = useState(1);
  const modalRef = useRef(null);
  
  // Mock data for online users
  const mockUsers = [
    {
      id: '1',
      name: 'CryptoWhale',
      avatar: '/traders/avatar1.png',
      status: 'Trading SOL/USDC',
      winRate: 0.78,
      level: 24,
      followers: 1287,
      following: 342,
      trades: [
        { pair: 'SOL/USDC', type: 'long', profit: 1.34, timestamp: Date.now() - 1000 * 60 * 5 },
        { pair: 'BTC/USDC', type: 'short', profit: -0.87, timestamp: Date.now() - 1000 * 60 * 30 },
        { pair: 'ETH/USDC', type: 'long', profit: 2.56, timestamp: Date.now() - 1000 * 60 * 120 },
      ]
    },
    {
      id: '2',
      name: 'MoonHunter',
      avatar: '/traders/avatar2.png',
      status: 'Looking for hidden gems',
      winRate: 0.65,
      level: 18,
      followers: 845,
      following: 203,
      trades: [
        { pair: 'JTO/USDC', type: 'long', profit: 3.21, timestamp: Date.now() - 1000 * 60 * 10 },
        { pair: 'BONK/USDC', type: 'long', profit: 5.43, timestamp: Date.now() - 1000 * 60 * 55 },
      ]
    },
    {
      id: '3',
      name: 'DeFiGuru',
      avatar: '/traders/avatar3.png',
      status: 'Analyzing DeFi protocols',
      winRate: 0.82,
      level: 32,
      followers: 3421,
      following: 127,
      trades: [
        { pair: 'UNI/USDC', type: 'short', profit: -1.23, timestamp: Date.now() - 1000 * 60 * 15 },
        { pair: 'AAVE/USDC', type: 'long', profit: 4.32, timestamp: Date.now() - 1000 * 60 * 45 },
        { pair: 'MKR/USDC', type: 'long', profit: 2.11, timestamp: Date.now() - 1000 * 60 * 180 },
      ]
    },
    {
      id: '4',
      name: 'AlgoTrader',
      avatar: '/traders/avatar4.png',
      status: 'Running my strategy bot',
      winRate: 0.71,
      level: 27,
      followers: 2198,
      following: 311,
      trades: [
        { pair: 'SOL/USDC', type: 'short', profit: 1.87, timestamp: Date.now() - 1000 * 60 * 8 },
        { pair: 'ATOM/USDC', type: 'long', profit: 0.93, timestamp: Date.now() - 1000 * 60 * 62 },
      ]
    },
    {
      id: '5',
      name: 'SolanaMaxi',
      avatar: '/traders/avatar5.png',
      status: 'All in on Solana ecosystem',
      winRate: 0.68,
      level: 21,
      followers: 1543,
      following: 421,
      trades: [
        { pair: 'SOL/USDC', type: 'long', profit: 2.56, timestamp: Date.now() - 1000 * 60 * 25 },
        { pair: 'JTO/USDC', type: 'long', profit: 1.23, timestamp: Date.now() - 1000 * 60 * 95 },
        { pair: 'BONK/USDC', type: 'long', profit: 4.87, timestamp: Date.now() - 1000 * 60 * 150 },
      ]
    }
  ];
  
  // Mock feed data
  const mockFeed = [
    {
      id: '1',
      userId: '1',
      userName: 'CryptoWhale',
      userAvatar: '/traders/avatar1.png',
      content: 'Just made 134% on my SOL long! The technical setup was perfect with a clear cup and handle pattern. Who else caught this move?',
      likes: 42,
      comments: 8,
      timestamp: Date.now() - 1000 * 60 * 30,
      tradePair: 'SOL/USDC',
      tradeType: 'long',
      tradeProfit: 134,
      chartSnapshot: '/charts/sol-breakout.png'
    },
    {
      id: '2',
      userId: '3',
      userName: 'DeFiGuru',
      userAvatar: '/traders/avatar3.png',
      content: 'My analysis shows UNI is forming a head and shoulders pattern. Going short with tight stop loss.',
      likes: 28,
      comments: 12,
      timestamp: Date.now() - 1000 * 60 * 120,
      tradePair: 'UNI/USDC',
      tradeType: 'short',
      chartSnapshot: '/charts/uni-analysis.png'
    },
    {
      id: '3',
      userId: '5',
      userName: 'SolanaMaxi',
      userAvatar: '/traders/avatar5.png',
      content: 'Solana ecosystem is exploding with activity! My strategy: long SOL, JTO, and BONK with 10x leverage. Already up 26% this week.',
      likes: 87,
      comments: 23,
      timestamp: Date.now() - 1000 * 60 * 180,
      tradePair: 'Multiple',
      tradeProfit: 26,
    },
  ];

  // Available avatars
  const avatarOptions = [
    { id: 'default', src: '/traders/default.png', name: 'Default' },
    { id: 'avatar1', src: '/traders/avatar1.png', name: 'Crypto Whale' },
    { id: 'avatar2', src: '/traders/avatar2.png', name: 'Moon Hunter' },
    { id: 'avatar3', src: '/traders/avatar3.png', name: 'DeFi Guru' },
    { id: 'avatar4', src: '/traders/avatar4.png', name: 'Algo Trader' },
    { id: 'avatar5', src: '/traders/avatar5.png', name: 'Solana Maxi' },
    { id: 'avatar6', src: '/traders/avatar6.png', name: 'NFT Collector' },
    { id: 'nft', src: '/traders/nft-placeholder.png', name: 'Connect NFT' },
  ];

  // Set mock data when component mounts
  useEffect(() => {
    setOnlineUsers(mockUsers);
    setFeedPosts(mockFeed);
  }, []);

  // Handle clicks outside the modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenUserProfile = (user) => {
    setUserProfile(user);
    setActiveTab('profile');
  };

  const handleFollow = (userId) => {
    // In a real app, this would make an API call to follow/unfollow
    const updatedUsers = onlineUsers.map(user => {
      if (user.id === userId) {
        // Toggle followed status
        return { 
          ...user, 
          isFollowing: !user.isFollowing,
          followers: user.isFollowing ? user.followers - 1 : user.followers + 1
        };
      }
      return user;
    });
    
    setOnlineUsers(updatedUsers);
    
    if (userProfile && userProfile.id === userId) {
      setUserProfile({
        ...userProfile,
        isFollowing: !userProfile.isFollowing,
        followers: userProfile.isFollowing ? userProfile.followers - 1 : userProfile.followers + 1
      });
    }
  };

  const formatTimestamp = (timestamp) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
  };

  const handlePostLike = (postId) => {
    const updatedPosts = feedPosts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.liked ? post.likes - 1 : post.likes + 1, liked: !post.liked };
      }
      return post;
    });
    setFeedPosts(updatedPosts);
  };

  const handleStatusUpdate = () => {
    // In a real app, this would save to a database
    alert(`Status updated to: ${customStatus}`);
  };

  // New function to handle continuing iteration
  const handleContinueIteration = () => {
    setIsLoading(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Generate new mock posts based on the current iteration
      const newPosts = [
        {
          id: `iteration-${currentIteration}-1`,
          userId: '2',
          userName: 'MoonHunter',
          userAvatar: '/traders/avatar2.png',
          content: `Iteration ${currentIteration}: Found a great setup on JUP/USDC! Looking bullish with increasing volume and positive funding rate.`,
          likes: Math.floor(Math.random() * 50) + 10,
          comments: Math.floor(Math.random() * 15) + 2,
          timestamp: Date.now() - 1000 * 60 * (Math.random() * 10),
          tradePair: 'JUP/USDC',
          tradeType: 'long',
          tradeProfit: (Math.random() * 15 + 5).toFixed(2),
        },
        {
          id: `iteration-${currentIteration}-2`,
          userId: '4',
          userName: 'AlgoTrader',
          userAvatar: '/traders/avatar4.png',
          content: `Iteration ${currentIteration}: My algorithm detected a bearish divergence on BTC. Taking a small short position with tight stop loss.`,
          likes: Math.floor(Math.random() * 40) + 5,
          comments: Math.floor(Math.random() * 10) + 1,
          timestamp: Date.now() - 1000 * 60 * (Math.random() * 20),
          tradePair: 'BTC/USDC',
          tradeType: 'short',
          chartSnapshot: '/charts/btc-analysis.png',
        },
      ];

      // Add the new posts to the existing ones
      setFeedPosts(prevPosts => [...prevPosts, ...newPosts]);
      setCurrentIteration(prevIteration => prevIteration + 1);
      
      // Simulate reaching the end after 5 iterations
      if (currentIteration >= 5) {
        setHasMorePosts(false);
      }
      
      setIsLoading(false);
    }, 1500); // Simulate loading delay
  };

  const renderOnlineUsersTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {onlineUsers.map(user => (
          <div 
            key={user.id}
            className="bg-gray-700 p-3 rounded-lg flex items-center hover:bg-gray-600 cursor-pointer transition-colors"
            onClick={() => handleOpenUserProfile(user)}
          >
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-gray-800 overflow-hidden">
                {user.avatar && (
                  <Image 
                    src={user.avatar} 
                    alt={user.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-700"></div>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex justify-between">
                <h3 className="font-medium text-white">{user.name}</h3>
                <span className="text-xs text-green-400">Lv. {user.level}</span>
              </div>
              <p className="text-xs text-gray-300 truncate max-w-[150px]">{user.status}</p>
              <div className="flex items-center mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5"></div>
                <span className="text-xs text-green-400">Online</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSocialFeedTab = () => (
    <div className="space-y-6">
      {feedPosts.map(post => (
        <div key={post.id} className="bg-gray-700 rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden">
                {post.userAvatar && (
                  <Image 
                    src={post.userAvatar} 
                    alt={post.userName}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                )}
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-white">{post.userName}</h3>
                <div className="flex items-center text-xs text-gray-400">
                  <span>{formatTimestamp(post.timestamp)}</span>
                  {post.tradePair && (
                    <>
                      <span className="mx-1">•</span>
                      <span className={post.tradeType === 'long' ? 'text-green-400' : 'text-red-400'}>
                        {post.tradeType} {post.tradePair}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <p className="mt-3 text-white">{post.content}</p>
            
            {post.chartSnapshot && (
              <div className="mt-3 rounded-md overflow-hidden bg-gray-800">
                <Image 
                  src={post.chartSnapshot} 
                  alt="Trade chart" 
                  width={400}
                  height={200}
                  className="w-full object-cover"
                />
              </div>
            )}
            
            {post.tradeProfit && (
              <div className="mt-3 p-2 bg-gray-800 rounded-md">
                <div className="flex items-center">
                  <div className={`px-2 py-1 rounded ${post.tradeProfit >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {post.tradeProfit >= 0 ? '+' : ''}{post.tradeProfit}%
                  </div>
                  <span className="ml-2 text-sm text-gray-300">profit on {post.tradePair}</span>
                </div>
              </div>
            )}
            
            <div className="mt-3 flex items-center justify-between border-t border-gray-600 pt-3">
              <button 
                className={`flex items-center space-x-1 ${post.liked ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-400`}
                onClick={() => handlePostLike(post.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                <span>{post.likes}</span>
              </button>
              <button className="flex items-center space-x-1 text-gray-400 hover:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                <span>{post.comments}</span>
              </button>
              <button className="text-gray-400 hover:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
      
      <div className="flex justify-center">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-blue-400">Loading...</span>
          </div>
        ) : hasMorePosts ? (
          <button 
            onClick={handleContinueIteration}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
          >
            Continue to iterate?
          </button>
        ) : (
          <p className="text-sm text-gray-400">No more posts to load</p>
        )}
      </div>
    </div>
  );

  const renderProfileTab = () => {
    if (!userProfile) return null;
    
    return (
      <div>
        {/* Profile Header */}
        <div className="relative">
          <div className="h-24 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
            <div className="h-24 w-24 rounded-full bg-gray-700 border-4 border-gray-800 overflow-hidden">
              {userProfile.avatar && (
                <Image 
                  src={userProfile.avatar} 
                  alt={userProfile.name}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="mt-16 text-center">
          <h2 className="text-xl font-bold">{userProfile.name}</h2>
          <p className="text-gray-400 text-sm mt-1">{userProfile.status}</p>
          
          <div className="flex justify-center space-x-6 mt-3">
            <div className="text-center">
              <p className="text-lg font-medium">{userProfile.followers}</p>
              <p className="text-xs text-gray-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">{userProfile.following}</p>
              <p className="text-xs text-gray-400">Following</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">{(userProfile.winRate * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400">Win Rate</p>
            </div>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={() => handleFollow(userProfile.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                userProfile.isFollowing 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {userProfile.isFollowing ? 'Following' : '+ Follow'}
            </button>
            <button className="ml-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm font-medium">
              Message
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Performance</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Win/Loss</p>
                <p className="text-lg font-medium">{Math.round(userProfile.winRate * 100)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Level</p>
                <p className="text-lg font-medium">{userProfile.level}</p>
              </div>
              <div className="w-1/2">
                <div className="flex justify-between text-xs">
                  <span>Win</span>
                  <span>Loss</span>
                </div>
                <div className="h-2 w-full bg-gray-600 rounded-full mt-1">
                  <div 
                    className="h-2 bg-green-500 rounded-full" 
                    style={{ width: `${userProfile.winRate * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Trading Style</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-600 p-2 rounded text-center">
                <p className="text-xs text-gray-400">Avg Hold Time</p>
                <p className="text-sm font-medium">4.2 hours</p>
              </div>
              <div className="bg-gray-600 p-2 rounded text-center">
                <p className="text-xs text-gray-400">Fav Pairs</p>
                <p className="text-sm font-medium">SOL, ETH</p>
              </div>
              <div className="bg-gray-600 p-2 rounded text-center">
                <p className="text-xs text-gray-400">Leverage</p>
                <p className="text-sm font-medium">3.5x</p>
              </div>
              <div className="bg-gray-600 p-2 rounded text-center">
                <p className="text-xs text-gray-400">Strategy</p>
                <p className="text-sm font-medium">Swing</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Trades */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Recent Trades</h3>
          <div className="space-y-3">
            {userProfile.trades && userProfile.trades.map((trade, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      trade.type === 'long' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {trade.type.toUpperCase()}
                    </span>
                    <span className="ml-2 font-medium">{trade.pair}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatTimestamp(trade.timestamp)}</p>
                </div>
                <div className={`text-right ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <p className="text-sm font-medium">{trade.profit >= 0 ? '+' : ''}{trade.profit}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 border-t border-gray-700 pt-4">
          <button 
            onClick={() => setActiveTab('online')} 
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          >
            Back to online users
          </button>
        </div>
      </div>
    );
  };
  
  const renderProfileSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Profile Settings</h3>
      
      {/* Avatar Selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Select Avatar</label>
        <div className="grid grid-cols-4 gap-3">
          {avatarOptions.map(avatar => (
            <div 
              key={avatar.id}
              onClick={() => setAvatarSelection(avatar.id)}
              className={`cursor-pointer rounded-lg p-2 ${
                avatarSelection === avatar.id 
                  ? 'bg-blue-900/40 border border-blue-500' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-gray-800 overflow-hidden">
                <Image 
                  src={avatar.src || '/traders/default.png'} 
                  alt={avatar.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-center mt-2">{avatar.name}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Status Update */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Trading Status</label>
        <div className="flex">
          <input
            type="text"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder="What are you trading today?"
            className="flex-grow px-3 py-2 bg-gray-700 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={50}
          />
          <button 
            onClick={handleStatusUpdate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-lg text-white"
          >
            Update
          </button>
        </div>
      </div>
      
      {/* Profile Visibility */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Privacy Settings</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <span>Show trading history</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <span>Allow followers</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <span>Receive trade notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
          Save Changes
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        <span>{onlineUsers.length} Users Online</span>
      </button>

      {/* Social Network Modal */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
          <div 
            ref={modalRef}
            className="bg-gray-800 w-full max-w-3xl max-h-[80vh] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gray-700 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Trader Network</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="bg-gray-700 border-t border-gray-600">
              <div className="flex px-4">
                <button 
                  onClick={() => setActiveTab('online')}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'online' 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Online Users
                </button>
                <button 
                  onClick={() => setActiveTab('feed')}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'feed' 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Trading Feed
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-3 text-sm font-medium ${activeTab === 'settings' 
                    ? 'text-white border-b-2 border-blue-500' 
                    : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Profile Settings
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 116px)' }}>
              {activeTab === 'online' && renderOnlineUsersTab()}
              {activeTab === 'feed' && renderSocialFeedTab()}
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'settings' && renderProfileSettingsTab()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;