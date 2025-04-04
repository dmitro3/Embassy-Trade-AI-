'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Isolated wrapper for ChessGame component that prevents any WebSocket or Solana connections
// by keeping it completely isolated from the rest of the application

// Dynamic import with no SSR to prevent server-side errors
const ChessGame = dynamic(() => import('./ChessGame'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-800 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-blue-400">Loading 3D chess...</div>
      </div>
    </div>
  )
});

/**
 * Isolated chess game component that doesn't rely on any external services
 * This component is completely standalone and doesn't use WebSockets or Solana
 */
const ChessIsolated = ({ difficulty = 'medium', onGameEnd = () => {} }) => {
  return (
    <div className="w-full h-full relative">
      {/* Render the isolated chess component */}
      <ChessGame 
        difficulty={difficulty} 
        onGameEnd={onGameEnd}
        isIsolated={true} // Signal that this is a completely isolated version
      />
    </div>
  );
};

export default ChessIsolated;