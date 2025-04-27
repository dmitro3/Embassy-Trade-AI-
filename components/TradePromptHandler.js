import React from 'react';
import TradePromptModal from './TradePromptModal';
import useTradeWebSocket from '../lib/useTradeWebSocket';

/**
 * Component that handles trade prompts from WebSocket and renders the modal when needed
 * This is designed to be included in app/layout.js so it's always available
 */
export default function TradePromptHandler() {
  const { 
    tradePrompt, 
    handleTradeAccept, 
    handleTradeDecline,
    autoAccept,
    toggleAutoAccept
  } = useTradeWebSocket();

  // If there's no trade prompt, don't render anything
  if (!tradePrompt) return null;

  return (
    <TradePromptModal 
      trade={tradePrompt}
      onAccept={() => handleTradeAccept(tradePrompt)}
      onDecline={() => handleTradeDecline(tradePrompt)}
      autoAccept={autoAccept}
      onAutoAcceptToggle={toggleAutoAccept}
    />
  );
}