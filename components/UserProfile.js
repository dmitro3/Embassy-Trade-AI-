'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

const UserProfile = ({ userId }) => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    id: '',
    username: '',
    avatar: '',
    bio: '',
    walletAddress: '',
    joinedDate: new Date(),
    successfulTrades: 0,
    winRate: 0,
    pnl: 0,
    embBalance: 0,
    embaiBalance: 0,
    hasGraduated: false,
    badges: [],
    followers: 0,
    following: 0,
  });
  
  // Form state for editing profile
  const [formData, setFormData] = useState({
    username: '',
    avatar: '',
    bio: '',
    profilePrivacy: 'public',
  });
  
  // User's NFTs for avatar selection
  const [nfts, setNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [showNftSelector, setShowNftSelector] = useState(false);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // In a real application, we would fetch this data from an API
        // For now, we'll simulate the API call with mock data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock user profile data
        const mockUserData = {
          id: userId || 'user_123',
          username: 'TraderPro',
          avatar: '/images/avatar-1.png',
          bio: 'Experienced crypto trader specializing in AI-driven strategies. Always looking for the next moonshot opportunity!',
          walletAddress: userId || publicKey?.toString() || 'wallet_address_placeholder',
          joinedDate: new Date('2023-11-15T10:30:00'),
          successfulTrades: 37,
          totalTrades: 52,
          winRate: 71,
          pnl: 8432.50,
          embBalance: 2500,
          embaiBalance: 5000,
          hasGraduated: true,
          badges: ['Graduate', 'Top 10 Trader', 'Diamond Hands'],
          followers: 124,
          following: 45,
          recentActivity: [
            { type: 'trade', details: 'Successfully traded SOL/USD', timestamp: Date.now() - 1000 * 60 * 60 * 2 },
            { type: 'stake', details: 'Staked 1,000 $EMBAI', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
            { type: 'governance', details: 'Voted on proposal #12', timestamp: Date.now() - 1000 * 60 * 60 * 72 },
          ]
        };
        
        // If this is the current user's profile, we might add more data
        const isCurrentUser = publicKey && publicKey.toString() === userId;
        if (isCurrentUser) {
          mockUserData.isCurrentUser = true;
        }
        
        setProfile(mockUserData);
        setFormData({
          username: mockUserData.username,
          avatar: mockUserData.avatar,
          bio: mockUserData.bio,
          profilePrivacy: 'public',
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [userId, publicKey]);
  
  const fetchUserNfts = async () => {
    try {
      setLoadingNfts(true);
      
      // In a real application, we would call the Solana API to fetch user's NFTs
      // For now, we'll simulate this with mock data
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const mockNfts = [
        { tokenId: 'nft1', name: 'Cool NFT #123', image: '/images/nft-1.png' },
        { tokenId: 'nft2', name: 'Embassy Trader #456', image: '/images/nft-2.png' },
        { tokenId: 'nft3', name: 'Diamond Hands #789', image: '/images/nft-3.png' },
        { tokenId: 'nft4', name: 'Crypto Punk #1011', image: '/images/nft-4.png' },
      ];
      
      setNfts(mockNfts);
      setShowNftSelector(true);
      setLoadingNfts(false);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      setLoadingNfts(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const selectNftAsAvatar = (nft) => {
    setFormData({
      ...formData,
      avatar: nft.image,
    });
    setShowNftSelector(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // In a real application, we would submit to an API
      // For now, we'll just update the local state
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update the profile
      setProfile({
        ...profile,
        username: formData.username,
        avatar: formData.avatar,
        bio: formData.bio,
      });
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };
  
  const handleFollow = async () => {
    // In a real application, we would call an API to follow/unfollow
    // For now, just update the local state
    setProfile({
      ...profile,
      followers: profile.followers + 1,
      isFollowing: true,
    });
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  const isCurrentUser = publicKey && publicKey.toString() === profile.walletAddress;
  
  // Format wallet address for display
  const formatWalletAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="bg-gray-900 text-white rounded-lg overflow-hidden">
      {/* Profile header */}
      <div className="relative h-48 bg-gradient-to-r from-blue-800 to-purple-800">
        {/* Edit button (only show for current user) */}
        {isCurrentUser && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 bg-gray-800/60 hover:bg-gray-700 text-white p-2 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        
        {/* Follow button (only show for other users) */}
        {!isCurrentUser && !profile.isFollowing && (
          <button
            onClick={handleFollow}
            className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full"
          >
            Follow
          </button>
        )}
        
        {/* Already following badge */}
        {!isCurrentUser && profile.isFollowing && (
          <div className="absolute top-4 right-4 bg-gray-800/60 text-white px-4 py-2 rounded-full flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Following
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 relative">
        {/* Avatar */}
        <div className="absolute -top-16 left-6 border-4 border-gray-900 rounded-full overflow-hidden">
          <img 
            src={profile.avatar || '/images/default-avatar.png'} 
            alt={profile.username} 
            className="h-32 w-32 object-cover"
          />
        </div>
        
        {/* Badges below avatar */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="absolute left-6 top-20 flex flex-wrap gap-1 max-w-[150px]">
            {profile.badges.map((badge, index) => (
              <span 
                key={index}
                className="bg-yellow-900/30 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/20"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        
        {/* Graduated badge if applicable */}
        {profile.hasGraduated && (
          <div className="absolute right-6 top-6 bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full flex items-center border border-purple-500/20">
            <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
            Live Trader
          </div>
        )}
        
        {/* Basic info with right margin to not overlap with avatar */}
        <div className="ml-40 mt-4">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-gray-400 mt-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Wallet: {formatWalletAddress(profile.walletAddress)}
          </p>
          <p className="text-gray-400 mt-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Joined {new Date(profile.joinedDate).toLocaleDateString()}
          </p>
          
          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-sm">PnL</p>
              <p className="text-xl font-bold text-green-400">${profile.pnl.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-sm">Win Rate</p>
              <p className="text-xl font-bold">{profile.winRate}%</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-sm">Trades</p>
              <p className="text-xl font-bold">{profile.successfulTrades}/{profile.totalTrades}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <p className="text-gray-400 text-sm">Connections</p>
              <div className="flex items-center space-x-2">
                <span className="text-sm">{profile.followers} followers</span>
                <span className="text-gray-500">·</span>
                <span className="text-sm">{profile.following} following</span>
              </div>
            </div>
          </div>
          
          {/* Bio */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <p className="text-gray-300">{profile.bio}</p>
          </div>
          
          {/* Tokens section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Token Balances</h3>
            <div className="flex flex-wrap gap-4">
              <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400">$EMB</p>
                <p className="text-xl font-bold">{profile.embBalance.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Paper Trading</p>
              </div>
              <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-500/20">
                <p className="text-sm text-purple-400">$EMBAI</p>
                <p className="text-xl font-bold">{profile.embaiBalance.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Live Trading</p>
              </div>
            </div>
          </div>
          
          {/* Recent activity */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {profile.recentActivity?.map((activity, index) => (
                <div key={index} className="bg-gray-800/50 p-3 rounded-lg flex items-center">
                  {activity.type === 'trade' && (
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  {activity.type === 'stake' && (
                    <svg className="w-5 h-5 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {activity.type === 'governance' && (
                    <svg className="w-5 h-5 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  <div>
                    <p className="text-gray-300">{activity.details}</p>
                    <p className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Profile Form */}
      {isEditing && (
        <div className="p-6 bg-gray-800 mt-4">
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                maxLength={20}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Profile Picture</label>
              <div className="flex items-center space-x-3">
                <img 
                  src={formData.avatar || '/images/default-avatar.png'}
                  alt="Profile preview"
                  className="h-16 w-16 rounded-full object-cover border border-gray-600"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowNftSelector(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                  >
                    Choose NFT
                  </button>
                  <input
                    type="text"
                    name="avatar"
                    value={formData.avatar}
                    onChange={handleInputChange}
                    placeholder="Or enter image URL"
                    className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                rows={4}
                maxLength={250}
              />
              <p className="text-right text-gray-500 text-sm mt-1">{formData.bio.length}/250</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Profile Privacy</label>
              <select
                name="profilePrivacy"
                value={formData.profilePrivacy}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
                <option value="private">Private</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* NFT Selector Modal */}
      {showNftSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Choose an NFT</h3>
              <button
                onClick={() => setShowNftSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loadingNfts ? (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : nfts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {nfts.map((nft) => (
                  <div 
                    key={nft.tokenId}
                    onClick={() => selectNftAsAvatar(nft)}
                    className="bg-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-600"
                  >
                    <img 
                      src={nft.image} 
                      alt={nft.name} 
                      className="w-full aspect-square object-cover rounded mb-2"
                    />
                    <p className="text-sm truncate">{nft.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No NFTs found in your wallet</p>
                <button
                  onClick={fetchUserNfts}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Refresh NFTs
                </button>
              </div>
            )}
            
            <div className="mt-6 border-t border-gray-700 pt-4">
              <button
                onClick={fetchUserNfts}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
              >
                {nfts.length > 0 ? 'Refresh NFTs' : 'Load My NFTs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;