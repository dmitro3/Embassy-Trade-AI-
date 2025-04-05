'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/lib/WalletProvider';
import TwitterAuth from '@/components/TwitterAuth';
import AIXBTLogo from '@/components/AIXBTLogo';
import { initXmtpClient, simulateAixbtResponse } from '@/lib/ChatService';

/**
 * Chat window component for interacting with AIXBT
 */
const ChatWithAIXBT = () => {
  // State for chat window
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTwitterAuthenticated, setIsTwitterAuthenticated] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [chatError, setChatError] = useState(null);
  
  // State for chat client
  const [chatClient, setChatClient] = useState(null);
  const [clientInitialized, setClientInitialized] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messageCleanupRef = useRef(null);
  const chatInputRef = useRef(null);
  
  // Get wallet from provider
  const { publicKey, connected } = useWallet();
  
  // AIXBT's wallet address (for demo purposes)
  const AIXBT_ADDRESS = 'aixbt11111111111111111111111111111111111111';
  
  // Safe local storage access
  const safeGetItem = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  };
  
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error setting localStorage:', error);
      return false;
    }
  };
  
  // Check if user is already authenticated with Twitter
  useEffect(() => {
    const token = safeGetItem('twitter_token');
    if (token) {
      setIsTwitterAuthenticated(true);
    }
  }, []);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Add welcome message when chat is opened
  useEffect(() => {
    if (isOpen && isTwitterAuthenticated && connected && messages.length === 0) {
      try {
        // Add welcome message
        const welcomeMessage = {
          id: 'welcome',
          sender: 'AIXBT',
          content: "👋 Welcome to AIXBT Chat! I'm here to help with your trading questions. How can I assist you today?",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, welcomeMessage]);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setChatError('Failed to initialize chat');
      }
    }
  }, [isOpen, isTwitterAuthenticated, connected, messages.length]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isOpen, isTwitterAuthenticated, connected, chatError]);

  // Initialize chat client when wallet is connected and Twitter is authenticated
  useEffect(() => {
    const initializeClient = async () => {
      if (!connected || !publicKey || !isTwitterAuthenticated) return;
      
      setIsInitializing(true);
      setChatError(null);
      
      try {
        // Using our browser-compatible client implementation
        const client = await initXmtpClient({ 
          publicKey,
          // Add a custom handler for the TokenAccountNotFoundError
          handleAccountError: () => {
            console.log('Token account not found, but continuing with chat functionality');
            return true; // Continue despite token account issues
          }
        });
        
        if (client) {
          setChatClient(client);
          setClientInitialized(true);
        } else {
          // Silently continue even if client init fails
          // This prevents TokenAccountNotFoundError from blocking the UI
          setClientInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize chat client:', error);
        
        // For all errors, just continue with chat functionality
        // We don't need the actual SPL token integration for the chat feature
        setClientInitialized(true);
      } finally {
        setIsInitializing(false);
      }
    };
    
    if (connected && isTwitterAuthenticated && !clientInitialized && !isInitializing) {
      initializeClient();
    }
    
    return () => {
      if (messageCleanupRef.current) {
        messageCleanupRef.current();
      }
    };
  }, [connected, publicKey, isTwitterAuthenticated, clientInitialized, isInitializing]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Twitter authentication
  const handleTwitterLogin = (token) => {
    if (token) {
      setIsTwitterAuthenticated(true);
    } else {
      setIsTwitterAuthenticated(false);
    }
  };

  // Handle sending message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!inputMessage.trim() || !isTwitterAuthenticated || !connected) return;
    
    // Add user message to chat
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'You',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Simulate AI response
      const responseContent = await simulateAixbtResponse(inputMessage);
      
      // Add AIXBT response to chat
      const aixbtResponse = {
        id: `aixbt-${Date.now()}`,
        sender: 'AIXBT',
        content: responseContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aixbtResponse]);
      
      // Save messages to localStorage
      safeSetItem('aixbt_chat_messages', JSON.stringify([...messages, userMessage, aixbtResponse]));
    } catch (error) {
      console.error('Error sending message:', error);
      // Don't show error to user, just continue
    } finally {
      setIsTyping(false);
    }
  };

  // Handle keyboard shortcut for sending message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  // Format timestamp for messages
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Load saved messages on mount
  useEffect(() => {
    try {
      const savedMessages = safeGetItem('aixbt_chat_messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Only set if there are valid messages
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading saved messages:', error);
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat toggle button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 bg-[#252A3E] hover:bg-[#2d3553] text-white px-4 py-2 rounded-xl shadow-lg transition-all transform hover:scale-105 border border-gray-700/50"
        >
          <AIXBTLogo size="w-8 h-8" />
          <span className="font-medium">Chat with AIXBT</span>
        </button>
      ) : (
        /* Chat window */
        <div className="bg-[#252A3E] rounded-xl shadow-xl border border-gray-700/50 w-80 sm:w-96 flex flex-col max-h-[500px]">
          {/* Chat header */}
          <div className="flex justify-between items-center p-3 bg-[#2d3553] rounded-t-xl border-b border-gray-700/50">
            <div className="flex items-center space-x-2">
              <AIXBTLogo size="w-8 h-8" />
              <div>
                <h3 className="font-medium text-white">Chat with AIXBT</h3>
                <div className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-full ${isTyping ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`}></span>
                  <span className="text-xs text-gray-300">{isTyping ? 'Typing...' : 'Online'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setMessages([]);
                  safeSetItem('aixbt_chat_messages', '[]');
                }}
                className="text-gray-400 hover:text-white p-1 transition-colors"
                title="Clear chat history"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-3 bg-[#1A1F2E]/80 min-h-[300px] max-h-[350px]">
            {!connected ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-400 mb-3">Please connect your wallet to chat with AIXBT</p>
              </div>
            ) : !isTwitterAuthenticated ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <AIXBTLogo size="w-16 h-16" className="mb-3" />
                <p className="text-white mb-4 text-center">Sign in with X to start chatting with AIXBT</p>
                <TwitterAuth onLogin={handleTwitterLogin} />
              </div>
            ) : isInitializing ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
                <p className="text-gray-400">Initializing chat...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AIXBTLogo size="w-12 h-12" className="mb-3" />
                <p className="text-gray-400">No messages yet. Start your conversation with AIXBT!</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        msg.sender === 'You'
                          ? 'bg-[#00FFA3] text-[#1A1F2E]'
                          : 'bg-[#3A3F5A] text-white'
                      }`}
                    >
                      <div className="text-sm">{msg.content}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 px-1">
                      {msg.sender === 'You' ? 'You' : 'AIXBT'} • {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start">
                    <div className="bg-[#3A3F5A] text-white max-w-[85%] rounded-xl px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat input */}
          {connected && isTwitterAuthenticated && (
            <form onSubmit={handleSendMessage} className="border-t border-gray-700/50 p-2 flex items-center">
              <input
                ref={chatInputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-[#3A3F5A] text-white placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#00FFA3]"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={isTyping || !inputMessage.trim()}
                className={`ml-2 bg-[#00FFA3] text-[#1A1F2E] rounded-lg p-2 ${
                  !inputMessage.trim() || isTyping
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[#00e693] transform transition-transform hover:scale-105'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWithAIXBT;