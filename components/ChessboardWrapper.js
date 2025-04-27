'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

/**
 * ChessboardWrapper - A wrapper component for chessboardjsx that handles legacy context API issues
 * 
 * This component isolates the chessboardjsx library and provides error handling for React 19 compatibility
 * It also includes a fallback mechanism to use ChessIsolated when errors occur
 */

// Dynamic import of Chessboard to prevent SSR issues
const Chessboard = dynamic(() => import('chessboardjsx'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-900/80 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#00FFA3] font-medium">Loading chessboard...</div>
      </div>
    </div>
  )
});

// Fallback 2D component in case 3D fails - also dynamic loaded
const ChessIsolated = dynamic(() => import('./ChessIsolated'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-900/80 rounded-xl">
      <div className="flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00FFA3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#00FFA3] font-medium">Loading 2D chess...</div>
      </div>
    </div>
  )
});

/**
 * ChessboardWrapper component
 * @param {Object} props - Component props
 * @param {string} props.position - FEN string representing the board position
 * @param {function} props.onPieceDrop - Callback function when a piece is dropped
 * @param {number} props.boardWidth - Width of the chessboard
 * @param {string} props.boardOrientation - Board orientation ('white' or 'black')
 * @param {string} props.difficulty - Difficulty level for the AI (easy, medium, hard)
 * @param {function} props.onGameEnd - Callback function when the game ends
 * @param {boolean} props.isPremium - Whether the user has premium access
 * @param {function} props.onSpecialMove - Callback function for special moves
 * @returns {JSX.Element} - Rendered component
 */
const ChessboardWrapper = ({
  position = 'start',
  onPieceDrop,
  boardWidth = 500,
  boardOrientation = 'white',
  difficulty = 'medium',
  onGameEnd,
  isPremium = false,
  onSpecialMove = null,
  ...otherProps
}) => {
  const [useChessIsolated, setUseChessIsolated] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const errorCountRef = useRef(0);
  
  // Reset error state when component mounts
  useEffect(() => {
    setErrorOccurred(false);
    errorCountRef.current = 0;
    
    // Add error event listener to catch unhandled errors
    const handleError = (event) => {
      // Check if the error is related to context API
      if (
        event.message && (
          event.message.includes('Context') || 
          event.message.includes('context') || 
          event.message.includes('DragDropContext') ||
          event.message.includes('findDOMNode')
        )
      ) {
        event.preventDefault();
        errorCountRef.current += 1;
        
        // If we've seen multiple errors, switch to ChessIsolated
        if (errorCountRef.current >= 2) {
          console.warn('Multiple context errors detected, switching to ChessIsolated');
          setUseChessIsolated(true);
        }
        
        setErrorOccurred(true);
      }
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  // If we've detected errors or explicitly chosen to use ChessIsolated, render it
  if (useChessIsolated || errorOccurred) {
    return (
      <ChessIsolated 
        position={position}
        onPieceDrop={onPieceDrop}
        boardWidth={boardWidth}
        boardOrientation={boardOrientation}
        difficulty={difficulty}
        onGameEnd={onGameEnd}
        isPremium={isPremium}
        onSpecialMove={onSpecialMove}
        {...otherProps}
      />
    );
  }
  
  // Otherwise, render the chessboardjsx component with DndProvider to fix the context API issues
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative">
        <Chessboard
          position={position}
          onDrop={onPieceDrop}
          width={boardWidth}
          orientation={boardOrientation}
          boardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
          {...otherProps}
        />
      </div>
    </DndProvider>
  );
};

export default ChessboardWrapper;
