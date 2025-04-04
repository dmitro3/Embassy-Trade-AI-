'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';

const Governance = () => {
  const { publicKey, connected } = useWallet();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Proposal creation form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['Yes', 'No', 'Abstain']);
  
  // User's EMBAI balance for proposal creation threshold
  const [balance, setBalance] = useState(0);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  
  // Minimum tokens required for proposal creation
  const MIN_TOKENS_FOR_PROPOSAL = 10000;
  
  // Fetch proposals and user balance
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch proposals
        const proposalsRes = await axios.get('/api/embai/proposals');
        setProposals(proposalsRes.data.proposals || []);
        
        // If wallet is connected, get balance and premium status
        if (connected && publicKey) {
          const balanceRes = await axios.get(`/api/embai/balance?wallet=${publicKey.toString()}`);
          setBalance(balanceRes.data.balance || 0);
          
          const premiumRes = await axios.get(`/api/embai/premium-access?wallet=${publicKey.toString()}`);
          setHasPremiumAccess(premiumRes.data.hasPremiumAccess || false);
        }
      } catch (err) {
        console.error("Failed to fetch governance data", err);
        setError("Failed to load governance data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Poll for updates every 2 minutes
    const intervalId = setInterval(fetchData, 120000);
    return () => clearInterval(intervalId);
  }, [connected, publicKey]);
  
  // Handle proposal creation
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    
    if (!connected) {
      setError("Please connect your wallet first.");
      return;
    }
    
    if (!title.trim()) {
      setError("Please enter a proposal title.");
      return;
    }
    
    if (!description.trim()) {
      setError("Please enter a proposal description.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const filteredOptions = options.filter(opt => opt.trim() !== '');
      if (filteredOptions.length < 2) {
        throw new Error("At least 2 voting options are required.");
      }
      
      const response = await axios.post('/api/embai/proposals', {
        wallet: publicKey.toString(),
        title: title.trim(),
        description: description.trim(),
        options: filteredOptions
      });
      
      if (response.data.success) {
        setSuccess("Proposal created successfully!");
        setProposals([...proposals, response.data.proposal]);
        
        // Reset form
        setTitle('');
        setDescription('');
        setOptions(['Yes', 'No', 'Abstain']);
        setShowCreateForm(false);
      } else {
        setError(response.data.error || "Failed to create proposal.");
      }
    } catch (err) {
      console.error("Error creating proposal", err);
      setError(err.response?.data?.error || "Failed to create proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle voting on a proposal
  const handleVote = async (proposalId, option) => {
    if (!connected) {
      setError("Please connect your wallet first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.post('/api/embai/vote', {
        wallet: publicKey.toString(),
        proposalId,
        option
      });
      
      if (response.data.success) {
        setSuccess(`You voted ${option} with ${response.data.votingPower} voting power.`);
        
        // Update the proposal in the UI
        setProposals(proposals.map(p => 
          p.id === proposalId 
            ? { ...p, votes: { ...p.votes, [option]: { ...p.votes[option], count: p.votes[option].count + response.data.votingPower } } }
            : p
        ));
      } else {
        setError(response.data.error || "Failed to vote on proposal.");
      }
    } catch (err) {
      console.error("Error voting on proposal", err);
      setError(err.response?.data?.error || "Failed to vote. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle option input change
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  // Add a new option to the list
  const addOption = () => {
    setOptions([...options, '']);
  };
  
  // Remove an option from the list
  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      setError("At least 2 options are required.");
    }
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate time remaining for voting
  const getTimeRemaining = (endTime) => {
    const now = Date.now();
    const diff = endTime - now;
    
    if (diff <= 0) return "Voting ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };
  
  // Get progress bar width and color for voting results
  const getProgressStyle = (votes, option, totalVotes) => {
    if (!totalVotes) return { width: '0%', color: 'bg-gray-500' };
    
    const percentage = (votes[option].count / totalVotes * 100).toFixed(1);
    
    let color = 'bg-gray-500';
    if (option === 'Yes') color = 'bg-green-500';
    else if (option === 'No') color = 'bg-red-500';
    else if (option === 'Abstain') color = 'bg-yellow-500';
    else color = `bg-blue-${Math.floor(Math.random() * 4 + 4)}00`;
    
    return { width: `${percentage}%`, color };
  };
  
  // Calculate total votes for a proposal
  const calculateTotalVotes = (votes) => {
    return Object.values(votes).reduce((sum, optionData) => sum + optionData.count, 0);
  };
  
  // Check if user has already voted on a proposal
  const hasVoted = (votes, walletAddress) => {
    if (!walletAddress) return false;
    
    return Object.values(votes).some(option => 
      option.voters && option.voters[walletAddress]
    );
  };
  
  // Render proposal status badge
  const renderStatusBadge = (status) => {
    let bgColor = 'bg-gray-500';
    if (status === 'active') bgColor = 'bg-blue-500';
    else if (status === 'passed') bgColor = 'bg-green-500';
    else if (status === 'executed') bgColor = 'bg-purple-500';
    else if (status === 'failed') bgColor = 'bg-red-500';
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${bgColor}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Embassy DAO Governance</h2>
        
        {connected && (
          <button
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <span className="mr-2">{showCreateForm ? 'Cancel' : 'Create Proposal'}</span>
            <span>{showCreateForm ? '×' : '+'}</span>
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-900/50 text-green-200 rounded">
          {success}
        </div>
      )}
      
      {showCreateForm && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Create a New Proposal</h3>
          
          {balance < MIN_TOKENS_FOR_PROPOSAL ? (
            <div className="bg-yellow-900/50 text-yellow-200 p-3 rounded mb-4">
              <p>You need at least {MIN_TOKENS_FOR_PROPOSAL} EMBAI tokens to create a proposal.</p>
              <p className="mt-2">Your current balance: {balance.toFixed(2)} EMBAI</p>
            </div>
          ) : (
            <form onSubmit={handleCreateProposal}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full bg-gray-700 rounded p-2 text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Proposal title"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Description</label>
                <textarea
                  className="w-full bg-gray-700 rounded p-2 text-white min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your proposal in detail..."
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Voting Options</label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-gray-700 rounded p-2 text-white"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="bg-red-600 hover:bg-red-700 p-2 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center"
                >
                  <span className="mr-1">+</span> Add Option
                </button>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  disabled={loading || balance < MIN_TOKENS_FOR_PROPOSAL}
                >
                  {loading ? 'Creating...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      
      {loading && proposals.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-lg mb-3">No proposals have been created yet.</p>
          {connected ? (
            balance >= MIN_TOKENS_FOR_PROPOSAL ? (
              <p>Be the first to create a proposal for the community to vote on!</p>
            ) : (
              <p>You need at least {MIN_TOKENS_FOR_PROPOSAL} EMBAI tokens to create a proposal.</p>
            )
          ) : (
            <p>Connect your wallet to create and vote on proposals.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map(proposal => {
            const totalVotes = calculateTotalVotes(proposal.votes);
            const userVoted = connected && hasVoted(proposal.votes, publicKey?.toString());
            
            return (
              <div key={proposal.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{proposal.title}</h3>
                  {renderStatusBadge(proposal.status)}
                </div>
                
                <p className="text-gray-300 mb-4">{proposal.description}</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Created: {formatDate(proposal.createdAt)}</span>
                    <span>{proposal.status === 'active' ? getTimeRemaining(proposal.votingEndsAt) : `Ended: ${formatDate(proposal.votingEndsAt)}`}</span>
                  </div>
                  
                  <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-1 bg-blue-500"
                      style={{ 
                        width: `${proposal.status === 'active' ? ((Date.now() - proposal.createdAt) / (proposal.votingEndsAt - proposal.createdAt) * 100) : 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm text-gray-400 mb-2">Voting Results {totalVotes > 0 && `(${totalVotes} total votes)`}</h4>
                  
                  <div className="space-y-2">
                    {Object.entries(proposal.votes).map(([option, voteData]) => {
                      const { width, color } = getProgressStyle(proposal.votes, option, totalVotes);
                      
                      return (
                        <div key={option} className="mb-1">
                          <div className="flex justify-between mb-1">
                            <span>{option}</span>
                            <span>{totalVotes > 0 ? `${(voteData.count / totalVotes * 100).toFixed(1)}% (${voteData.count})` : '0%'}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-2 ${color}`} style={{ width }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {proposal.status === 'active' && connected && !userVoted && (
                  <div className="mt-4">
                    <h4 className="text-sm text-gray-400 mb-2">Cast Your Vote</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(proposal.votes).map(option => (
                        <button
                          key={option}
                          onClick={() => handleVote(proposal.id, option)}
                          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
                          disabled={loading}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {proposal.status === 'active' && connected && userVoted && (
                  <div className="mt-4 text-green-400 text-sm">
                    You have already voted on this proposal.
                  </div>
                )}
                
                {proposal.status !== 'active' && proposal.result && (
                  <div className={`mt-4 text-sm ${proposal.status === 'passed' ? 'text-green-400' : proposal.status === 'failed' ? 'text-red-400' : 'text-blue-400'}`}>
                    Result: {proposal.result} was selected with {proposal.votes[proposal.result]?.count || 0} votes.
                    {proposal.status === 'executed' && ' This proposal has been executed.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-8 bg-gradient-to-r from-blue-900 to-purple-900 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">About Embassy DAO</h3>
        <p className="text-sm mb-3">
          Embassy DAO is the decentralized governance system for Embassy Trade AI. 
          EMBAI token holders can create and vote on proposals to shape the future of the platform.
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Create proposals with at least {MIN_TOKENS_FOR_PROPOSAL} EMBAI tokens</li>
          <li>Voting power is proportional to your EMBAI holdings</li>
          <li>Proposals stay active for 7 days of voting</li>
          <li>Execution happens after a 48-hour delay if passed</li>
        </ul>
      </div>
    </div>
  );
};

export default Governance;