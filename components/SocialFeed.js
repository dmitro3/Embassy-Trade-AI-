'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

const SocialFeed = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]);
  const [filter, setFilter] = useState('all'); // all, following, popular
  
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would fetch from an API
        // For now, generate mock data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate mock activities
        const activities = [
          {
            id: 'activity_1',
            type: 'graduation',
            user: {
              id: 'user_123',
              name: 'Trader1',
              avatar: '/images/avatar-1.png'
            },
            content: 'has graduated to live trading with $EMBAI!',
            timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
            likes: 24,
            comments: 5,
            isFollowing: Math.random() > 0.5,
          },
          {
            id: 'activity_2',
            type: 'trade',
            user: {
              id: 'user_456',
              name: 'WhaleHunter',
              avatar: '/images/avatar-2.png'
            },
            content: 'executed a profitable trade on SOL/USD based on @mobyagent signal',
            details: {
              profit: '+16.2%',
              market: 'SOL/USD',
              direction: 'LONG'
            },
            timestamp: Date.now() - 1000 * 60 * 45, // 45 minutes ago
            likes: 18,
            comments: 2,
            isFollowing: Math.random() > 0.5,
          },
          {
            id: 'activity_3',
            type: 'milestone',
            user: {
              id: 'user_789',
              name: 'CryptoNinja',
              avatar: '/images/avatar-3.png'
            },
            content: 'achieved a 10-trade winning streak!',
            timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
            likes: 42,
            comments: 7,
            isFollowing: Math.random() > 0.5,
          },
          {
            id: 'activity_4',
            type: 'stake',
            user: {
              id: 'user_101',
              name: 'TokenMaster',
              avatar: '/images/avatar-4.png'
            },
            content: 'staked 5,000 $EMBAI tokens for platform rewards',
            timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
            likes: 15,
            comments: 1,
            isFollowing: Math.random() > 0.5,
          },
          {
            id: 'activity_5',
            type: 'join',
            user: {
              id: 'user_102',
              name: 'NewTrader',
              avatar: '/images/avatar-5.png'
            },
            content: 'joined Embassy Trade AI. Welcome!',
            timestamp: Date.now() - 1000 * 60 * 240, // 4 hours ago
            likes: 8,
            comments: 3,
            isFollowing: false,
          },
          {
            id: 'activity_6',
            type: 'badge',
            user: {
              id: 'user_103',
              name: 'BadgeCollector',
              avatar: '/images/avatar-1.png'
            },
            content: 'earned the "Diamond Hands" badge for holding through volatility',
            timestamp: Date.now() - 1000 * 60 * 300, // 5 hours ago
            likes: 31,
            comments: 4,
            isFollowing: Math.random() > 0.5,
          },
          {
            id: 'activity_7',
            type: 'trade',
            user: {
              id: 'user_104',
              name: 'AITrader',
              avatar: '/images/avatar-2.png'
            },
            content: 'executed a profitable trade on FARTCOIN/USD based on AIXBT signal',
            details: {
              profit: '+143.2%',
              market: 'FARTCOIN/USD',
              direction: 'LONG'
            },
            timestamp: Date.now() - 1000 * 60 * 360, // 6 hours ago
            likes: 76,
            comments: 12,
            isFollowing: Math.random() > 0.5,
            isPopular: true,
          },
          {
            id: 'activity_8',
            type: 'governance',
            user: {
              id: 'user_105',
              name: 'CommunityLeader',
              avatar: '/images/avatar-3.png'
            },
            content: 'created a governance proposal: "Add new trading pairs"',
            timestamp: Date.now() - 1000 * 60 * 420, // 7 hours ago
            likes: 52,
            comments: 15,
            isFollowing: Math.random() > 0.5,
            isPopular: true,
          },
        ];
        
        // Filter activities
        let filteredActivities = [...activities];
        if (filter === 'following') {
          filteredActivities = activities.filter(activity => activity.isFollowing);
        } else if (filter === 'popular') {
          filteredActivities = activities.filter(activity => activity.likes > 30 || activity.isPopular);
        }
        
        setFeed(filteredActivities);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching social feed:', err);
        setLoading(false);
      }
    };
    
    fetchFeed();
  }, [filter]);
  
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };
  
  const handleLike = (activityId) => {
    // In a real app, this would call an API to like the activity
    setFeed(prev => 
      prev.map(activity => 
        activity.id === activityId
          ? { ...activity, likes: activity.likes + 1 }
          : activity
      )
    );
  };
  
  const handleFollow = (userId) => {
    // In a real app, this would call an API to follow the user
    setFeed(prev =>
      prev.map(activity =>
        activity.user.id === userId
          ? { ...activity, isFollowing: true }
          : activity
      )
    );
  };
  
  const getActivityIcon = (type) => {
    switch (type) {
      case 'graduation':
        return (
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      case 'trade':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'milestone':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'stake':
        return (
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'join':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'badge':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'governance':
        return (
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Community Feed</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('following')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'following' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setFilter('popular')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'popular' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Popular
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : feed.length > 0 ? (
        <div className="space-y-4">
          {feed.map(activity => (
            <div key={activity.id} className="bg-gray-800 rounded-lg p-4 animate-fade-in">
              <div className="flex items-start">
                <Link href={`/profile/${activity.user.id}`}>
                  <div className="flex-shrink-0 mr-3">
                    <img 
                      src={activity.user.avatar} 
                      alt={activity.user.name}
                      className="h-10 w-10 rounded-full"
                    />
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center">
                    <Link href={`/profile/${activity.user.id}`} className="font-medium text-blue-400 hover:underline">
                      {activity.user.name}
                    </Link>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="text-sm text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                    
                    {activity.isPopular && (
                      <span className="ml-2 bg-yellow-900/30 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/20">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center">
                    <span className="flex-shrink-0 mr-2">
                      {getActivityIcon(activity.type)}
                    </span>
                    <p className="text-gray-300">{activity.content}</p>
                  </div>
                  
                  {/* Trade details */}
                  {activity.type === 'trade' && activity.details && (
                    <div className="mt-2 bg-gray-900/50 p-2 rounded">
                      <div className="flex justify-between items-center text-sm">
                        <span>Market: <span className="font-medium">{activity.details.market}</span></span>
                        <span>Direction: <span className={`font-medium ${
                          activity.details.direction === 'LONG' ? 'text-green-400' : 'text-red-400'
                        }`}>{activity.details.direction}</span></span>
                        <span>Profit: <span className="font-medium text-green-400">{activity.details.profit}</span></span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <button 
                        onClick={() => handleLike(activity.id)}
                        className="flex items-center space-x-1 text-gray-400 hover:text-blue-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{activity.likes}</span>
                      </button>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <span>{activity.comments}</span>
                      </div>
                    </div>
                    
                    {!activity.isFollowing && (
                      <button
                        onClick={() => handleFollow(activity.user.id)}
                        className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-full"
                      >
                        Follow
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <p className="text-gray-400">No activities found for this filter</p>
          <button
            onClick={() => setFilter('all')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            View all activities
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialFeed;