'use client';

import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-tabs/style/react-tabs.css';
import 'react-toastify/dist/ReactToastify.css';

import PhantomWalletConnector from './PhantomWalletConnector';
import ExchangeConnector from './ExchangeConnector';
import PnLTracking from './PnLTracking';
import AITradingEngine from './AITradingEngine';
import useEnhancedShyftWebSocket from '../lib/enhancedShyftWebSocket';
import logger from '../lib/logger';
import tradeExecutionService from '../lib/tradeExecutionService';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, Connection, clusterApiUrl } from '@solana/web3.js';

/**
 * TradeForceDashboard Component
 * 
 * Main dashboard for the TradeForce AI trading dApp:
 * - Integrates all components (wallet, exchanges, trading, PnL)
 * - Provides a unified UI for the trading experience
 * - Handles state management between components
 */
const TradeForceDashboard = () => {
  // State variables
  const [activeTab, setActiveTab] = useState(0);
  const [walletState, setWalletState] = useState({
    connected: false,
    publicKey: null,
    balance: 0
  });
  const [exchangeState, setExchangeState] = useState({
    exchange: null,
    status: 'disconnected',
    shyftStatus: 'disconnected',
    connectedCount: 0
  });
  const [trades, setTrades] = useState([]);
  
  // Get Shyft WebSocket data for real-time token updates
  const { 
    connectionStatus: shyftStatus, 
    tokenData 
  } = useEnhancedShyftWebSocket({
    tokens: ['SOL', 'RAY', 'JUP', 'BONK', 'USDC']
  });
  
  // Get wallet from wallet adapter context (for direct blockchain interactions)
  const wallet = useWallet();
  
  // Create connection to Solana DevNet
  const connection = React.useMemo(() => 
    new Connection(clusterApiUrl('devnet'), 'confirmed'),
    []
  );
  
  // Handle wallet changes
  const handleWalletChange = (walletInfo) => {
    setWalletState(walletInfo);
    
    if (walletInfo.connected) {
      toast.success('Wallet connected');
      logger.info(`Wallet connected: ${walletInfo.publicKey}`);
    } else {
      logger.info('Wallet disconnected');
    }
  };
  
  // Handle exchange status changes
  const handleExchangeStatus = (status) => {
    setExchangeState(status);
    
    if (status.exchange && status.status === 'connected') {
      toast.success(`Connected to ${status.exchange}`);
    }
  };
  
  // Handle trade execution
  const handleTradeExecuted = (trade) => {
    setTrades(prev => [...prev, trade]);
  };
  
  // Request DevNet SOL airdrop
  const requestAirdrop = async () => {
    if (!walletState.connected || !walletState.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    try {
      toast.info('Requesting DevNet SOL airdrop...');
      
      // Request airdrop (2 SOL)
      const signature = await connection.requestAirdrop(
        wallet.publicKey, 
        2 * LAMPORTS_PER_SOL
      );
      
      // Confirm transaction
      await connection.confirmTransaction(signature);
      
      toast.success('Received 2 DevNet SOL');
      logger.info(`Airdrop successful: ${signature}`);
      
      // Update wallet balance after short delay
      setTimeout(async () => {
        try {
          const newBalance = await connection.getBalance(wallet.publicKey);
          setWalletState(prev => ({
            ...prev,
            balance: newBalance / LAMPORTS_PER_SOL
          }));
        } catch (error) {
          logger.error(`Failed to update balance: ${error.message}`);
        }
      }, 2000);
    } catch (error) {
      toast.error(`Airdrop failed: ${error.message}`);
      logger.error(`Airdrop failed: ${error.message}`);
    }
  };
  
  // Execute sample trade for testing
  const executeSampleTrade = async () => {
    if (!walletState.connected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!exchangeState.exchange || exchangeState.status !== 'connected') {
      toast.error('Please connect to an exchange first');
      return;
    }
    
    try {
      toast.info('Executing sample trade...');
      
      // Call trade execution service
      const result = await tradeExecutionService.executeTrade({
        token: 'SOL',
        amount: 0.1,
        price: tokenData.SOL?.price || 100,
        side: 'buy',
        exchange: exchangeState.exchange,
        // Use paper trading mode for safety
        paperTrading: true
      });
      
      if (result.success) {
        toast.success('Sample trade executed successfully');
        
        // Add to trades list
        const newTrade = {
          id: `trade-${Date.now()}`,
          token: 'SOL',
          action: 'buy',
          amount: 0.1,
          price: tokenData.SOL?.price || 100,
          timestamp: Date.now(),
          status: 'completed'
        };
        
        setTrades(prev => [...prev, newTrade]);
      } else {
        toast.error(`Trade failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Trade failed: ${error.message}`);
      logger.error(`Sample trade failed: ${error.message}`);
    }
  };
  
  return (
    <div className="trade-force-dashboard max-w-7xl mx-auto px-4 py-8">
      <ToastContainer 
        position="top-right"
        theme="dark"
        autoClose={5000}
      />
      
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        {/* Wallet Section */}
        <div className="w-full md:w-64">
          <div className="bg-gray-800 rounded-lg p-5 shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Wallet</h2>
            <PhantomWalletConnector 
              onWalletChange={handleWalletChange}
            />
            
            {walletState.connected && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={requestAirdrop}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition"
                >
                  Request DevNet SOL
                </button>
              </div>
            )}
          </div>
          
          {/* Exchange Connection */}
          <ExchangeConnector 
            onStatusChange={handleExchangeStatus}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 bg-gray-800 rounded-lg shadow-lg p-5">
          <Tabs 
            selectedIndex={activeTab} 
            onSelect={index => setActiveTab(index)}
            className="react-tabs"
          >
            <TabList className="flex mb-6 border-b border-gray-700">
              <Tab 
                className="px-4 py-2 border-b-2 border-transparent cursor-pointer transition" 
                selectedClassName="border-blue-500 text-blue-400"
              >
                Dashboard
              </Tab>
              <Tab 
                className="px-4 py-2 border-b-2 border-transparent cursor-pointer transition"
                selectedClassName="border-blue-500 text-blue-400"
              >
                Trading
              </Tab>
              <Tab 
                className="px-4 py-2 border-b-2 border-transparent cursor-pointer transition"
                selectedClassName="border-blue-500 text-blue-400"
              >
                PnL Tracking
              </Tab>
            </TabList>
            
            <TabPanel>
              {/* Dashboard Tab */}
              <div className="space-y-6">
                {/* Market Overview */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['SOL', 'RAY', 'JUP', 'BONK'].map(token => {
                      const tokenInfo = tokenData[token];
                      return (
                        <div key={token} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-lg font-medium">{token}</span>
                            {tokenInfo ? (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                (tokenInfo.priceChange24h || 0) >= 0 
                                  ? 'bg-green-900/50 text-green-400'
                                  : 'bg-red-900/50 text-red-400'
                              }`}>
                                {(tokenInfo.priceChange24h || 0) >= 0 ? '+' : ''}
                                {(tokenInfo.priceChange24h || 0).toFixed(2)}%
                              </span>
                            ) : (
                              <div className="w-12 h-6 bg-gray-600 animate-pulse rounded-full"></div>
                            )}
                          </div>
                          
                          {tokenInfo ? (
                            <div className="text-2xl font-bold">${tokenInfo.price.toFixed(2)}</div>
                          ) : (
                            <div className="h-8 bg-gray-600 animate-pulse rounded mb-2 w-24"></div>
                          )}
                          
                          {tokenInfo ? (
                            <div className="text-xs text-gray-400 mt-2">
                              Vol: ${(tokenInfo.volume24h || 0).toLocaleString(undefined, {
                                maximumFractionDigits: 0
                              })}
                            </div>
                          ) : (
                            <div className="h-4 bg-gray-600 animate-pulse rounded w-20 mt-2"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Connection Status */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">System Status</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Wallet</div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {walletState.connected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className={`h-3 w-3 rounded-full ${walletState.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Exchange</div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {exchangeState.status === 'connected' ? (
                            <span className="capitalize">{exchangeState.exchange}</span>
                          ) : (
                            'Disconnected'
                          )}
                        </div>
                        <div className={`h-3 w-3 rounded-full ${
                          exchangeState.status === 'connected' ? 'bg-green-500' : 
                          exchangeState.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                          'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Shyft WebSocket</div>
                      <div className="flex items-center justify-between">
                        <div className="font-medium capitalize">{shyftStatus}</div>
                        <div className={`h-3 w-3 rounded-full ${
                          shyftStatus === 'connected' ? 'bg-green-500' : 
                          shyftStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                          'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <button
                      onClick={requestAirdrop}
                      disabled={!walletState.connected}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      DevNet Airdrop
                    </button>
                    
                    <button
                      onClick={executeSampleTrade}
                      disabled={!walletState.connected || exchangeState.status !== 'connected'}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Sample Trade
                    </button>
                    
                    <button
                      onClick={() => setActiveTab(2)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition"
                    >
                      View PnL
                    </button>
                    
                    <button
                      onClick={() => setActiveTab(1)}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition"
                    >
                      AI Trading
                    </button>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                  
                  {trades.length > 0 ? (
                    <div className="bg-gray-700 rounded-lg overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Token</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.slice().reverse().slice(0, 5).map((trade, index) => (
                            <tr key={index} className="border-t border-gray-600">
                              <td className="px-4 py-3 text-sm">{trade.token}</td>
                              <td className="px-4 py-3 text-sm capitalize">{trade.action}</td>
                              <td className="px-4 py-3 text-sm">{trade.amount}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                {new Date(trade.timestamp).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-8 text-center text-gray-400">
                      <p>No recent activity</p>
                      <p className="text-sm mt-2">Connect your wallet and execute trades to see activity</p>
                    </div>
                  )}
                </div>
              </div>
            </TabPanel>
            
            <TabPanel>
              {/* Trading Tab */}
              <AITradingEngine 
                tokenData={tokenData}
                walletConnected={walletState.connected}
                onTradeExecuted={handleTradeExecuted}
              />
            </TabPanel>
            
            <TabPanel>
              {/* PnL Tracking Tab */}
              <PnLTracking 
                wallet={walletState}
                trades={trades}
              />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default TradeForceDashboard;
