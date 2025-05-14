'use client';

import React, { useState, useEffect, useCallback } from 'react';

/**
 * ArcadeTetris component - A fully functional Tetris game for the Arcade section
 * 
 * @returns {JSX.Element} The rendered Tetris game
 */
export default function ArcadeTetris() {
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const EMPTY_CELL = 0;
  
  // Tetromino shapes and their rotations
  const SHAPES = [
    // I
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    // J
    [
      [2, 0, 0],
      [2, 2, 2],
      [0, 0, 0]
    ],
    // L
    [
      [0, 0, 3],
      [3, 3, 3],
      [0, 0, 0]
    ],
    // O
    [
      [4, 4],
      [4, 4]
    ],
    // S
    [
      [0, 5, 5],
      [5, 5, 0],
      [0, 0, 0]
    ],
    // T
    [
      [0, 6, 0],
      [6, 6, 6],
      [0, 0, 0]
    ],
    // Z
    [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0]
    ]
  ];
  
  const COLORS = [
    'bg-gray-900',             // Empty cell
    'bg-cyan-500',             // I
    'bg-blue-600',             // J
    'bg-orange-500',           // L
    'bg-yellow-400',           // O
    'bg-green-500',            // S
    'bg-purple-600',           // T
    'bg-red-600'               // Z
  ];
  
  // Game state
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nextPiece, setNextPiece] = useState(null);
  const [highScore, setHighScore] = useState(0);
  
  // Create empty board
  function createEmptyBoard() {
    return Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(EMPTY_CELL));
  }
  
  // Generate a random tetromino
  const getRandomPiece = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    return SHAPES[randomIndex];
  }, []);
  
  // Start a new game
  const startGame = useCallback(() => {
    setBoard(createEmptyBoard());
    const newPiece = getRandomPiece();
    const nextNewPiece = getRandomPiece();
    setCurrentPiece(newPiece);
    setNextPiece(nextNewPiece);
    setCurrentPosition({ 
      x: Math.floor((BOARD_WIDTH - newPiece[0].length) / 2), 
      y: 0 
    });
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setLines(0);
    setIsPlaying(true);
  }, [getRandomPiece]);
  
  // Check if the current piece can move to a new position
  const isValidMove = useCallback((piece, position) => {
    if (!piece) return false;
    
    for (let y = 0; y < piece.length; y++) {
      for (let x = 0; x < piece[y].length; x++) {
        if (piece[y][x] !== EMPTY_CELL) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          // Check boundaries
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }
          
          // Check collision with other pieces
          if (boardY >= 0 && board[boardY][boardX] !== EMPTY_CELL) {
            return false;
          }
        }
      }
    }
    return true;
  }, [board]);
  
  // Rotate a piece
  const rotatePiece = useCallback((piece) => {
    const newPiece = [];
    for (let i = 0; i < piece[0].length; i++) {
      const row = [];
      for (let j = piece.length - 1; j >= 0; j--) {
        row.push(piece[j][i]);
      }
      newPiece.push(row);
    }
    return newPiece;
  }, []);
  
  // Lock the current piece on the board
  const lockPiece = useCallback(() => {
    if (!currentPiece) return;
    
    const newBoard = [...board];
    for (let y = 0; y < currentPiece.length; y++) {
      for (let x = 0; x < currentPiece[y].length; x++) {
        if (currentPiece[y][x] !== EMPTY_CELL) {
          const boardY = currentPosition.y + y;
          const boardX = currentPosition.x + x;
          
          if (boardY >= 0) {
            newBoard[boardY][boardX] = currentPiece[y][x];
          } else {
            // If piece is locked above the board, game over
            setGameOver(true);
            setIsPlaying(false);
            return;
          }
        }
      }
    }
    
    // Check for completed lines
    let completedLines = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== EMPTY_CELL)) {
        // Remove the line
        newBoard.splice(y, 1);
        // Add empty line at the top
        newBoard.unshift(Array(BOARD_WIDTH).fill(EMPTY_CELL));
        completedLines++;
        y++; // Check the same y-position again
      }
    }
    
    // Update score based on completed lines
    if (completedLines > 0) {
      const linePoints = [0, 40, 100, 300, 1200]; // Points for 0,1,2,3,4 lines
      const newScore = score + linePoints[completedLines] * level;
      const newLines = lines + completedLines;
      const newLevel = Math.floor(newLines / 10) + 1;
      
      setScore(newScore);
      setLines(newLines);
      setLevel(newLevel);
      
      // Update high score if needed
      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem('tetrisHighScore', newScore.toString());
      }
    }
    
    setBoard(newBoard);
    
    // Get next piece
    setCurrentPiece(nextPiece);
    setNextPiece(getRandomPiece());
    setCurrentPosition({ 
      x: Math.floor((BOARD_WIDTH - nextPiece[0].length) / 2), 
      y: 0 
    });
  }, [board, currentPiece, currentPosition, getRandomPiece, highScore, level, lines, nextPiece, score]);
  
  // Move the current piece down
  const moveDown = useCallback(() => {
    if (gameOver || !isPlaying) return;
    
    const newPosition = { ...currentPosition, y: currentPosition.y + 1 };
    if (isValidMove(currentPiece, newPosition)) {
      setCurrentPosition(newPosition);
    } else {
      lockPiece();
    }
  }, [currentPiece, currentPosition, gameOver, isPlaying, isValidMove, lockPiece]);
  
  // Move the current piece left or right
  const moveHorizontal = useCallback((direction) => {
    if (gameOver || !isPlaying) return;
    
    const newPosition = { 
      ...currentPosition, 
      x: currentPosition.x + direction 
    };
    if (isValidMove(currentPiece, newPosition)) {
      setCurrentPosition(newPosition);
    }
  }, [currentPiece, currentPosition, gameOver, isPlaying, isValidMove]);
  
  // Rotate the current piece
  const handleRotate = useCallback(() => {
    if (gameOver || !isPlaying) return;
    
    const rotatedPiece = rotatePiece(currentPiece);
    if (isValidMove(rotatedPiece, currentPosition)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, currentPosition, gameOver, isPlaying, isValidMove, rotatePiece]);
  
  // Hard drop the current piece
  const hardDrop = useCallback(() => {
    if (gameOver || !isPlaying) return;
    
    let newY = currentPosition.y;
    while (isValidMove(currentPiece, { ...currentPosition, y: newY + 1 })) {
      newY++;
    }
    
    setCurrentPosition({ ...currentPosition, y: newY });
    lockPiece();
  }, [currentPiece, currentPosition, gameOver, isPlaying, isValidMove, lockPiece]);
  
  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          handleRotate();
          break;
        case ' ': // Space
          hardDrop();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotate, hardDrop, isPlaying, moveDown, moveHorizontal]);
  
  // Game tick
  useEffect(() => {
    if (!isPlaying) return;
    
    // Get previous high score from local storage
    const storedHighScore = localStorage.getItem('tetrisHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
    
    const speed = Math.max(100, 1000 - (level - 1) * 100); // Speed increases with level
    const gameInterval = setInterval(moveDown, speed);
    
    return () => clearInterval(gameInterval);
  }, [isPlaying, level, moveDown]);
  
  // Render the current piece on the game board
  const renderBoard = useCallback(() => {
    // Create a copy of the board
    const displayBoard = board.map(row => [...row]);
    
    // Add the current piece to the display board
    if (currentPiece && isPlaying) {
      for (let y = 0; y < currentPiece.length; y++) {
        for (let x = 0; x < currentPiece[y].length; x++) {
          if (currentPiece[y][x] !== EMPTY_CELL) {
            const boardY = currentPosition.y + y;
            const boardX = currentPosition.x + x;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece[y][x];
            }
          }
        }
      }
    }
    
    return displayBoard;
  }, [board, currentPiece, currentPosition, isPlaying]);
  
  // Render the next piece preview
  const renderNextPiece = useCallback(() => {
    if (!nextPiece) return null;
    
    return (
      <div className="grid gap-0.5 p-2">
        {nextPiece.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`w-4 h-4 border ${cell ? COLORS[cell] : 'bg-gray-900'}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }, [nextPiece]);
  
  return (
    <div className="flex flex-col items-center bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-800">
      <h2 className="text-2xl font-bold mb-4 text-cyan-500">Embassy Tetris</h2>
      
      <div className="flex mb-4">
        {/* Game info */}
        <div className="flex flex-col mr-4 text-gray-300">
          <div className="bg-gray-800 p-2 mb-2 rounded">
            <h3 className="text-sm font-semibold mb-1">Score</h3>
            <p className="text-xl font-bold text-cyan-400">{score}</p>
          </div>
          
          <div className="bg-gray-800 p-2 mb-2 rounded">
            <h3 className="text-sm font-semibold mb-1">High Score</h3>
            <p className="text-xl font-bold text-yellow-400">{highScore}</p>
          </div>
          
          <div className="bg-gray-800 p-2 mb-2 rounded">
            <h3 className="text-sm font-semibold mb-1">Level</h3>
            <p className="text-xl font-bold text-green-400">{level}</p>
          </div>
          
          <div className="bg-gray-800 p-2 mb-2 rounded">
            <h3 className="text-sm font-semibold mb-1">Lines</h3>
            <p className="text-xl font-bold text-purple-400">{lines}</p>
          </div>
          
          <div className="bg-gray-800 p-2 rounded">
            <h3 className="text-sm font-semibold mb-1">Next</h3>
            {renderNextPiece()}
          </div>
        </div>
        
        {/* Game board */}
        <div className="border-2 border-gray-700 bg-gray-950 p-0.5">
          <div className="grid gap-0">
            {renderBoard().map((row, y) => (
              <div key={y} className="flex">
                {row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={`w-6 h-6 ${COLORS[cell]} border border-opacity-20 border-gray-700`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Game controls */}
      <div className="flex space-x-2 mb-4">
        {!isPlaying ? (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 transition"
          >
            {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        ) : (
          <button
            onClick={() => setIsPlaying(false)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white font-medium rounded hover:from-red-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition"
          >
            Pause
          </button>
        )}
      </div>
      
      {/* Mobile controls */}
      <div className="flex space-x-2">
        <button
          onClick={() => moveHorizontal(-1)}
          className="p-3 bg-gray-800 rounded-l text-white font-bold hover:bg-gray-700 focus:outline-none"
        >
          ←
        </button>
        <button
          onClick={moveDown}
          className="p-3 bg-gray-800 text-white font-bold hover:bg-gray-700 focus:outline-none"
        >
          ↓
        </button>
        <button
          onClick={handleRotate}
          className="p-3 bg-gray-800 text-white font-bold hover:bg-gray-700 focus:outline-none"
        >
          ↻
        </button>
        <button
          onClick={() => moveHorizontal(1)}
          className="p-3 bg-gray-800 rounded-r text-white font-bold hover:bg-gray-700 focus:outline-none"
        >
          →
        </button>
        <button
          onClick={hardDrop}
          className="p-3 bg-gray-800 rounded text-white font-bold hover:bg-gray-700 focus:outline-none ml-2"
        >
          Drop
        </button>
      </div>
      
      {/* Game over message */}
      {gameOver && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-75 text-white rounded">
          <p>Game Over! Your score: {score}</p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Keyboard controls: Arrow keys to move, Up to rotate, Space to hard drop</p>
      </div>
    </div>
  );
}
