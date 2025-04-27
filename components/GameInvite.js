'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ArcadeNotification from './ArcadeNotification';

/**
 * GameInvite Component
 * 
 * Allows users to send and respond to game invitations,
 * enhancing the integration between Social Butterfly and Arcade.
 */
const GameInvite = ({
  friend = null,
  onInviteSent = () => {},
  onInviteAccepted = () => {},
  onInviteDeclined = () => {},
  className = ''
}) => {
  const { publicKey, connected } = useWallet();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [gameType, setGameType] = useState('chess');
  const [stakingAmount, setStakingAmount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [balance, setBalance] = useState(100); // Mock balance
  
  // Fetch user's EMB balance
  useEffect(() => {
    if (connected && publicKey) {
      // In a real implementation, this would fetch the actual balance
      // For now, we'll use a mock value
      setBalance(Math.floor(Math.random() * 500) + 50);
    }
  }, [connected, publicKey]);
  
  // Handle sending a game invitation
  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    if (!connected) {
      setNotification({
        type: 'error',
        message: 'Please connect your wallet to send game invitations.'
      });
      return;
    }
    
    if (!friend) {
      setNotification({
        type: 'error',
        message: 'Please select a friend to challenge.'
      });
      return;
    }
    
    if (stakingAmount <= 0) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid staking amount.'
      });
      return;
    }
    
    if (stakingAmount > balance) {
      setNotification({
        type: 'error',
        message: 'Insufficient EMB balance for this stake amount.'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would send the invitation to the backend
      // For now, we'll simulate a successful invitation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const inviteData = {
        id: `invite_${Date.now()}`,
        from: publicKey.toString(),
        to: friend.wallet,
        gameType,
        stakingAmount,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      setNotification({
        type: 'success',
        message: `Game invitation sent to ${friend.username || friend.wallet.slice(0, 4) + '...' + friend.wallet.slice(-4)}!`
      });
      
      onInviteSent(inviteData);
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error sending game invitation:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send game invitation. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle accepting a game invitation
  const handleAcceptInvite = async (invite) => {
    if (!connected) {
      setNotification({
        type: 'error',
        message: 'Please connect your wallet to accept game invitations.'
      });
      return;
    }
    
    if (invite.stakingAmount > balance) {
      setNotification({
        type: 'error',
        message: 'Insufficient EMB balance to accept this invitation.'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would update the invitation status in the backend
      // For now, we'll simulate a successful acceptance
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNotification({
        type: 'success',
        message: 'Game invitation accepted! Redirecting to game...'
      });
      
      onInviteAccepted(invite);
    } catch (error) {
      console.error('Error accepting game invitation:', error);
      setNotification({
        type: 'error',
        message: 'Failed to accept game invitation. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle declining a game invitation
  const handleDeclineInvite = async (invite) => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would update the invitation status in the backend
      // For now, we'll simulate a successful decline
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setNotification({
        type: 'info',
        message: 'Game invitation declined.'
      });
      
      onInviteDeclined(invite);
    } catch (error) {
      console.error('Error declining game invitation:', error);
      setNotification({
        type: 'error',
        message: 'Failed to decline game invitation. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the challenge button
  const renderChallengeButton = () => {
    if (!friend) return null;
    
    return (
      <button
        onClick={() => setShowInviteForm(true)}
        className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition transform hover:scale-105"
      >
        <span className="mr-2">🎮</span>
        Challenge to Game
      </button>
    );
  };
  
  // Render the invitation form
  const renderInviteForm = () => {
    if (!showInviteForm) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 border border-gray-700 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Challenge Friend</h3>
            <button 
              onClick={() => setShowInviteForm(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {friend && (
            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold mr-3">
                {friend.username ? friend.username.charAt(0) : friend.wallet.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-white">
                  {friend.username || `${friend.wallet.slice(0, 4)}...${friend.wallet.slice(-4)}`}
                </p>
                {friend.status && (
                  <p className="text-xs text-green-400">
                    {friend.status === 'online' ? 'Online now' : friend.status}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Game Type</label>
              <select 
                value={gameType} 
                onChange={(e) => setGameType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              >
                <option value="chess">Chess</option>
                <option value="poker">Poker</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stake Amount (EMB)</label>
              <div className="flex">
                <input 
                  type="number" 
                  value={stakingAmount}
                  onChange={(e) => setStakingAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  min="0"
                  step="1"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-l p-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => setStakingAmount(balance)}
                  className="bg-blue-700 px-3 rounded-r"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Your balance: {balance} EMB
              </p>
            </div>
            
            {notification && (
              <ArcadeNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification(null)}
              />
            )}
            
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isLoading || !connected || stakingAmount <= 0 || stakingAmount > balance}
                className={`px-5 py-2 rounded flex items-center ${
                  isLoading || !connected || stakingAmount <= 0 || stakingAmount > balance
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Challenge'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Render an incoming invitation
  const renderIncomingInvite = (invite) => {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-fade-in">
        <div className="flex items-start">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold mr-3">
            {invite.fromUsername ? invite.fromUsername.charAt(0) : 'G'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">
              Game Invitation from {invite.fromUsername || `${invite.from.slice(0, 4)}...${invite.from.slice(-4)}`}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              {invite.gameType === 'chess' ? '♟️ Chess Match' : '🃏 Poker Game'} • {invite.stakingAmount} EMB stake
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={() => handleDeclineInvite(invite)}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Decline
          </button>
          <button
            onClick={() => handleAcceptInvite(invite)}
            disabled={isLoading || invite.stakingAmount > balance}
            className={`px-4 py-2 rounded ${
              isLoading || invite.stakingAmount > balance
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white'
            }`}
          >
            {isLoading ? 'Processing...' : 'Accept & Play'}
          </button>
        </div>
        
        {invite.stakingAmount > balance && (
          <p className="text-xs text-red-400 mt-2 text-right">
            Insufficient EMB balance to accept this invitation.
          </p>
        )}
      </div>
    );
  };
  
  return (
    <div className={className}>
      {renderChallengeButton()}
      {renderInviteForm()}
      {notification && !showInviteForm && (
        <ArcadeNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default GameInvite;
