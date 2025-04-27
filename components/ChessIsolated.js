'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as ChessJS from 'chess.js';
const { Chess } = ChessJS;

/**
 * A lightweight 2D chess implementation that serves as a fallback
 * when 3D WebGL fails to load or for browsers with limited WebGL support
 * Now enhanced with advanced AI, castling support, and better UX
 */
const ChessIsolated = ({ difficulty = 'medium', onGameEnd, isPremium = false, onSpecialMove = null, theme = 'standard' }) => {
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  // For storing sounds
  const soundsRef = useRef({
    move: null,
    capture: null,
    check: null,
    castle: null,
    checkmate: null,
  });
  const boardRef = useRef(null);
  
  // Piece SVG mapping for the 2D board
  const pieceSvgs = {
    'wp': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></g></svg>',
    'wr': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7 1.5-2.5h17l1.5 2.5h-20zm-.5 4h21v-4H12v4z"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt"/><path d="M14 16.5 11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/></g></svg>',
    'wn': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/></g></svg>',
    'wb': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#000" stroke-linejoin="miter"/></g></svg>',
    'wq': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0zm16.5-4.5a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM41 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM16 8.5a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM33 9a2 2 0 1 1 4 0 2 2 0 1 1-4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g></svg>',
    'wk': '<svg viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
    'bp': '<svg viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'br': '<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7 1.5-2.5h17l1.5 2.5h-20zm-.5 4h21v-4H12v4z" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 16.5 11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/><path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/></g></svg>',
    'bn': '<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/><path d="M24.55 10.4 24 11.85l-.6 5.5 5.5 2.3" stroke-linejoin="miter"/><path d="m30 15-5.5-3-2 2.31 1 6.69" stroke-linejoin="miter"/><path d="m2.5 15.5 2 7 4-1.5 3-5.5-2-1-1 3.5-2-4 3-5-1.37-3.23L5.5 11l-1-3" stroke-linejoin="miter" transform="translate(20 0)"/></g></svg>',
    'bb': '<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g></svg>',
    'bq': '<svg viewBox="0 0 45 45"><g fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/><path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g></svg>',
    'bk': '<svg viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9" stroke="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/></g></svg>'
  };
  
  // Initialize the game
  useEffect(() => {
    const newGame = new Chess();
    setGame(newGame);
    updateBoard(newGame);
    setMoveHistory([]);
    
    // Load sound effects
    loadSoundEffects();
    
    // Cleanup
    return () => {
      setGame(null);
    };
  }, [difficulty, isPremium]);
  
  // Load sound effects
  const loadSoundEffects = () => {
    try {
      soundsRef.current = {
        move: new Audio('/sounds/move.mp3'),
        capture: new Audio('/sounds/capture.mp3'),
        check: new Audio('/sounds/check.mp3'),
        castle: new Audio('/sounds/castle.mp3'),
        checkmate: new Audio('/sounds/checkmate.mp3'),
      };
      
      // Preload sounds
      Object.values(soundsRef.current).forEach(audio => {
        audio.load();
      });
    } catch (error) {
      console.warn('Could not load sound effects:', error);
    }
  };
  
  // Play a sound effect
  const playSound = (type) => {
    if (!soundEnabled || !soundsRef.current[type]) return;
    
    try {
      soundsRef.current[type].currentTime = 0;
      soundsRef.current[type].play().catch(err => {
        console.warn(`Failed to play ${type} sound:`, err);
      });
    } catch (error) {
      console.warn(`Error playing ${type} sound:`, error);
    }
  };
  
  // Update the board state based on the chess.js instance
  const updateBoard = (chess) => {
    if (!chess) return;
    
    try {
      const newBoard = [];
      const boardState = chess.board();
      
      if (!boardState || !Array.isArray(boardState)) {
        console.error("Invalid board state:", boardState);
        return;
      }
      
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (!boardState[i] || boardState[i] === undefined) {
            console.error(`Invalid board row at index ${i}`);
            continue;
          }
          
          const piece = boardState[i][j];
          const squareIndex = i * 8 + j;
          
          const squareName = Chess.SQUARES && Chess.SQUARES.length > squareIndex 
            ? Chess.SQUARES[squareIndex] 
            : `${String.fromCharCode(97 + j)}${8 - i}`; // Fallback to calculate square name
          
          const square = {
            position: { row: i, col: j },
            square: squareName,
            piece: piece ? { type: piece.type, color: piece.color } : null,
            isLight: (i + j) % 2 === 0
          };
          newBoard.push(square);
        }
      }
      
      setBoard(newBoard);
      
      // Check game status
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          setGameStatus(chess.turn() === 'w' ? 'loss' : 'win');
          setMessage(chess.turn() === 'w' ? 'Checkmate! You lose.' : 'Checkmate! You win!');
          if (onGameEnd) {
            onGameEnd(chess.turn() === 'w' ? 'loss' : 'win');
          }
        } else {
          setGameStatus('draw');
          setMessage('Game drawn! ' + getDrawReason(chess));
          if (onGameEnd) {
            onGameEnd('draw');
          }
        }
      } else if (chess.isCheck()) {
        setMessage('Check!');
      } else {
        setMessage(chess.turn() === 'w' ? 'Your move' : 'Computer is thinking...');
      }
    } catch (error) {
      console.error("Error updating board:", error);
      // Provide a default empty board
      setBoard([]);
    }
  };
  
  // Get the reason for a draw
  const getDrawReason = (chess) => {
    if (!chess) return "";
    if (chess.isStalemate()) return "Stalemate";
    if (chess.isThreefoldRepetition()) return "Threefold repetition";
    if (chess.isInsufficientMaterial()) return "Insufficient material";
    if (chess.isDraw()) return "50-move rule";
    return "";
  };
  
  // Make a move and update the board
  const makeMove = (from, to) => {
    if (!game || game.isGameOver()) return;
    
    try {
      const moveResult = game.move({
        from,
        to,
        promotion: 'q' // Always promote to a queen for simplicity
      });
      
      if (moveResult) {
        // Track move in history
        setMoveHistory(prev => [...prev, moveResult]);
        
        // Play appropriate sound
        if (moveResult.flags.includes('c')) {
          playSound('capture');
        } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
          playSound('castle');
          
          // Notify parent about special move (castling)
          if (onSpecialMove) {
            onSpecialMove('castle');
          }
        } else {
          playSound('move');
        }
        
        // Check for check or checkmate
        if (game.isCheckmate()) {
          playSound('checkmate');
        } else if (game.isCheck()) {
          playSound('check');
        }
        
        setLastMove({ from, to });
        updateBoard(game);
        setSelectedPiece(null);
        setValidMoves([]);
        
        // Make the computer's move after a short delay
        if (!game.isGameOver()) {
          setThinking(true);
          makeBasicAIMove();
        }
      }
    } catch (e) {
      console.error('Invalid move:', e);
    }
  };
  
  // Handle computer's move based on difficulty - minimax with alpha-beta pruning for better AI
  const makeBasicAIMove = () => {
    setTimeout(() => {
      if (!game || game.isGameOver()) {
        setThinking(false);
        return;
      }
      
      try {
        const moves = game.moves({ verbose: true });
        
        if (moves.length > 0) {
          let selectedMove;
          
          switch (difficulty) {
            case 'easy':
              // Random move
              selectedMove = moves[Math.floor(Math.random() * moves.length)];
              break;
              
            case 'medium':
              // Simple evaluation with some randomness
              selectedMove = findBestMoveWithEvaluation(game, 2, 0.3);
              break;
              
            case 'hard':
            default:
              // Stronger evaluation with less randomness and deeper search
              selectedMove = findBestMoveWithEvaluation(game, isPremium ? 4 : 3, 0.1);
              break;
          }
          
          // Make the selected move
          if (selectedMove) {
            const moveObj = game.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: 'q'
            });
            
            if (moveObj) {
              // Track move in history
              setMoveHistory(prev => [...prev, moveObj]);
              
              // Play appropriate sound
              if (moveObj.flags.includes('c')) {
                playSound('capture');
              } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
                playSound('castle');
                
                // Notify parent about special move (castling)
                if (onSpecialMove) {
                  onSpecialMove('castle');
                }
              } else {
                playSound('move');
              }
              
              // Check for check or checkmate
              if (game.isCheckmate()) {
                playSound('checkmate');
              } else if (game.isCheck()) {
                playSound('check');
              }
              
              setLastMove({ from: selectedMove.from, to: selectedMove.to });
              updateBoard(game);
            }
          }
        }
      } catch (e) {
        console.error('Error making computer move:', e);
      } finally {
        setThinking(false);
      }
    }, 800);
  };
  
  // Simple minimax algorithm with alpha-beta pruning for better AI
  const findBestMoveWithEvaluation = (chess, depth, randomFactor = 0) => {
    // Get all possible moves
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    
    // If we only have one move, just return it
    if (moves.length === 1) return moves[0];
    
    let bestValue = -Infinity;
    let bestMoves = [];
    
    // Evaluate each move
    for (const move of moves) {
      // Make the move
      chess.move(move);
      
      // Calculate value with minimax
      const value = -minimax(chess, depth - 1, -Infinity, Infinity, false);
      
      // Undo the move
      chess.undo();
      
      // If this move is better than our best so far, update bestValue and reset bestMoves
      if (value > bestValue) {
        bestValue = value;
        bestMoves = [move];
      } 
      // If this move is equal to our best, add it to the list of best moves
      else if (value === bestValue) {
        bestMoves.push(move);
      }
    }
    
    // Choose a random move from the best moves
    // Apply randomness for lower difficulties
    if (randomFactor > 0 && Math.random() < randomFactor) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  };
  
  // Minimax algorithm with alpha-beta pruning
  const minimax = (chess, depth, alpha, beta, isMaximizingPlayer) => {
    // Base case: if depth is 0 or game is over, evaluate the board
    if (depth === 0 || chess.isGameOver()) {
      return evaluateBoard(chess);
    }
    
    const moves = chess.moves({ verbose: true });
    
    if (isMaximizingPlayer) {
      let bestValue = -Infinity;
      for (const move of moves) {
        chess.move(move);
        bestValue = Math.max(bestValue, minimax(chess, depth - 1, alpha, beta, false));
        chess.undo();
        
        alpha = Math.max(alpha, bestValue);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return bestValue;
    } else {
      let bestValue = Infinity;
      for (const move of moves) {
        chess.move(move);
        bestValue = Math.min(bestValue, minimax(chess, depth - 1, alpha, beta, true));
        chess.undo();
        
        beta = Math.min(beta, bestValue);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return bestValue;
    }
  };
  
  // Board evaluation function
  const evaluateBoard = (chess) => {
    // Check for game over states first
    if (chess.isCheckmate()) {
      // If it's checkmate, the side that just moved won
      return chess.turn() === 'w' ? -1000 : 1000;
    }
    
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0; // Draw is neutral
    }
    
    // Piece values
    const pieceValues = {
      p: 1,    // pawn
      n: 3,    // knight
      b: 3.25, // bishop
      r: 5,    // rook
      q: 9,    // queen
      k: 0     // king (value is handled by checkmate evaluation)
    };
    
    // Position tables for improved piece position evaluation
    const pawnPositionTable = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 5, 5, 5, 5, 5, 5, 5],
      [1, 1, 2, 3, 3, 2, 1, 1],
      [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
      [0, 0, 0, 2, 2, 0, 0, 0],
      [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
      [0.5, 1, 1, -2, -2, 1, 1, 0.5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    const knightPositionTable = [
      [-5, -4, -3, -3, -3, -3, -4, -5],
      [-4, -2, 0, 0, 0, 0, -2, -4],
      [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
      [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3],
      [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
      [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3],
      [-4, -2, 0, 0.5, 0.5, 0, -2, -4],
      [-5, -4, -3, -3, -3, -3, -4, -5]
    ];
    
    // More compact evaluation function
    let score = 0;
    const boardState = chess.board();
    
    // Loop through the board
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = boardState[i][j];
        if (!piece) continue;
        
        // Base piece value
        let value = pieceValues[piece.type] || 0;
        
        // Add position value for pawns and knights for complexity
        if (piece.type === 'p') {
          value += pawnPositionTable[piece.color === 'w' ? i : 7 - i][j] * 0.1;
        } else if (piece.type === 'n') {
          value += knightPositionTable[piece.color === 'w' ? i : 7 - i][j] * 0.1;
        }
        
        // Add to score (positive for white, negative for black)
        score += piece.color === 'w' ? value : -value;
      }
    }
    
    // Add a small random component to avoid deterministic play
    score += (Math.random() * 0.2 - 0.1);
    
    return score;
  };
  
  // Get piece notation (e.g. 'wp' for white pawn)
  const getPieceNotation = (piece) => {
    if (!piece) return null;
    return piece.color + piece.type;
  };
  
  // Handle square click
  const handleSquareClick = (square) => {
    if (!game || thinking || game.isGameOver()) return;
    
    // If it's not the player's turn, do nothing
    if (game.turn() !== 'w') return;
    
    const squareData = board.find(s => s.square === square);
    
    // If a piece is already selected
    if (selectedPiece) {
      // If the clicked square is a valid move
      if (validMoves.includes(square)) {
        makeMove(selectedPiece, square);
      } else if (squareData?.piece?.color === 'w') {
        // If clicking on another white piece, select that piece instead
        setSelectedPiece(square);
        highlightValidMoves(square);
      } else {
        // Otherwise, deselect the current piece
        setSelectedPiece(null);
        setValidMoves([]);
      }
    } else if (squareData?.piece?.color === 'w') {
      // Select a white piece
      setSelectedPiece(square);
      highlightValidMoves(square);
    }
  };
  
  // Find and set valid moves for the selected piece
  const highlightValidMoves = (square) => {
    if (!game) return;
    
    try {
      const moves = game.moves({
        square,
        verbose: true
      });
      
      const validSquares = moves.map(move => move.to);
      setValidMoves(validSquares);
    } catch (error) {
      console.error('Error highlighting valid moves:', error);
      setValidMoves([]);
    }
  };
  
  // Reset the game
  const resetGame = () => {
    try {
      const newGame = new Chess();
      setGame(newGame);
      updateBoard(newGame);
      setSelectedPiece(null);
      setValidMoves([]);
      setGameStatus('playing');
      setMessage('Your move');
      setLastMove(null);
      setMoveHistory([]);
      setEvaluation(null);
    } catch (error) {
      console.error('Error resetting game:', error);
    }
  };

  // Handle piece dragging and dropping
  useEffect(() => {
    const handleDragOver = (e) => e.preventDefault();
    
    if (boardRef.current) {
      boardRef.current.addEventListener('dragover', handleDragOver);
    }
    
    return () => {
      if (boardRef.current) {
        boardRef.current.removeEventListener('dragover', handleDragOver);
      }
    };
  }, []);

  // Mobile-specific enhancements for improved touch experience
  useEffect(() => {
    // Detect if device is mobile
    const isMobileDevice = () => {
      return (typeof window.orientation !== "undefined") || 
             (navigator.userAgent.indexOf('IEMobile') !== -1) ||
             window.matchMedia("(max-width: 768px)").matches;
    };
    
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // Add mobile-specific event handlers
      const handleTouchStart = (e) => {
        // Prevent default touch behavior when interacting with the chessboard
        e.preventDefault();
      };
      
      if (boardRef.current) {
        // Add custom touch handlers
        boardRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
      }
      
      // Cleanup
      return () => {
        if (boardRef.current) {
          boardRef.current.removeEventListener('touchstart', handleTouchStart);
        }
      };
    }
  }, []);

  // Adjust board size for mobile devices
  useEffect(() => {
    const adjustForMobile = () => {
      const isMobileView = window.innerWidth < 768;
      if (boardRef.current) {
        // Make sure the board is square and fits on mobile screens
        if (isMobileView) {
          const width = Math.min(window.innerWidth - 40, 360); // 20px padding on each side
          boardRef.current.style.width = `${width}px`;
          boardRef.current.style.height = `${width}px`;
        } else {
          boardRef.current.style.width = '100%';
          boardRef.current.style.height = 'auto';
        }
      }
    };

    // Run initially
    adjustForMobile();
    
    // Update on resize
    window.addEventListener('resize', adjustForMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', adjustForMobile);
    };
  }, []);

  // Enhanced touch handling for mobile chess moves
  const handleTouchMove = (e) => {
    if (!selectedPiece || !game || game.isGameOver() || thinking || !e.touches) return;
    e.preventDefault(); // Prevent scrolling when dragging pieces
  };
  
  const handleTouchEnd = (e) => {
    if (!selectedPiece || !game || game.isGameOver() || thinking) return;
    
    // Get the touch position
    const touch = e.changedTouches[0];
    
    // Find the square that was touched
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetSquare = elements.find(el => el.dataset && el.dataset.square);
    
    if (targetSquare) {
      const square = targetSquare.dataset.square;
      if (validMoves.includes(square)) {
        makeMove(selectedPiece, square);
      }
    }
    
    // Clear selection if we're not in the middle of a move
    if (!selectedPiece) {
      setValidMoves([]);
    }
  };

  // Format a chess move in algebraic notation
  const formatMove = (moveObj, moveNumber) => {
    if (!moveObj) return '';
    
    // Add move number prefix for white's moves
    const prefix = moveObj.color === 'w' ? `${moveNumber}. ` : '';
    return `${prefix}${moveObj.san}`;
  };
  
  // Get CSS for square based on theme
  const getSquareStyle = (isLight, isSelected, isValidMove, isLastMove) => {
    // Base colors by theme
    let lightColor, darkColor, selectedColor, validMoveColor, lastMoveColor;
    
    if (theme === 'premium') {
      lightColor = 'bg-amber-100 hover:bg-amber-200';
      darkColor = 'bg-amber-800 hover:bg-amber-700';
      selectedColor = 'bg-green-500/70';
      validMoveColor = 'bg-blue-400/70 animate-pulse';
      lastMoveColor = 'ring-2 ring-yellow-400 ring-inset';
    } else {
      lightColor = 'bg-amber-100 hover:bg-amber-200';
      darkColor = 'bg-amber-800 hover:bg-amber-700';
      selectedColor = 'bg-green-400';
      validMoveColor = 'bg-blue-300';
      lastMoveColor = 'ring-2 ring-yellow-500 ring-inset';
    }
    
    return `
      ${isLight ? lightColor : darkColor} 
      ${isSelected ? selectedColor : ''}
      ${isValidMove ? validMoveColor : ''}
      ${isLastMove ? lastMoveColor : ''}
      hover:opacity-90 active:opacity-75 transition-colors
      touch-action-none
    `;
  };
  
  // Render chess board
  return (
    <div className="flex flex-col md:flex-row items-start w-full max-w-5xl mx-auto">
      <div className="chess-board-container w-full md:w-2/3 mb-4 md:mb-0 md:mr-4">
        <div className="chess-status bg-gray-800 text-white px-4 py-2 rounded-t-lg w-full text-center">
          {message}
          {evaluation !== null && difficulty === 'hard' && (
            <span className={`ml-2 text-sm ${evaluation > 0 ? 'text-green-400' : evaluation < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              Eval: {evaluation.toFixed(2)}
            </span>
          )}
        </div>
        
        <div 
          ref={boardRef}
          className="chess-board grid grid-cols-8 gap-0 border-2 border-gray-700 bg-gray-700 mx-auto"
          style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '600px' }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {board.map((square) => (
            <div
              key={square.square}
              data-square={square.square}
              onClick={() => handleSquareClick(square.square)}
              draggable={square.piece && square.piece.color === 'w' && game?.turn() === 'w'}
              onDragStart={(e) => {
                if (square.piece?.color === 'w' && game?.turn() === 'w') {
                  setSelectedPiece(square.square);
                  highlightValidMoves(square.square);
                  e.dataTransfer.setData('text/plain', square.square);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData('text/plain');
                if (from && game?.turn() === 'w') {
                  makeMove(from, square.square);
                }
              }}
              className={`
                flex items-center justify-center p-1
                cursor-pointer transition-colors relative
                ${getSquareStyle(
                  square.isLight, 
                  selectedPiece === square.square, 
                  validMoves.includes(square.square),
                  lastMove?.from === square.square || lastMove?.to === square.square
                )}
                touch-action-manipulation
              `}
              style={{ aspectRatio: '1 / 1' }}
            >
              {square.piece && (
                <div 
                  className={`piece w-full h-full ${isPremium ? 'transition-transform hover:scale-110' : ''}`}
                  dangerouslySetInnerHTML={{ __html: pieceSvgs[getPieceNotation(square.piece)] || '' }}
                />
              )}
              
              {/* Square coordinates (visible on the edge squares) */}
              {square.position.col === 0 && (
                <span className="absolute top-0 left-0 text-xs font-bold opacity-70">
                  {8 - square.position.row}
                </span>
              )}
              {square.position.row === 7 && (
                <span className="absolute bottom-0 right-0 text-xs font-bold opacity-70">
                  {String.fromCharCode(97 + square.position.col)}
                </span>
              )}
              
              {validMoves.includes(square.square) && !square.piece && (
                <div className={`w-1/4 h-1/4 rounded-full ${isPremium ? 'bg-blue-400/60 animate-pulse' : 'bg-gray-800 opacity-50'}`}></div>
              )}
              {validMoves.includes(square.square) && square.piece && (
                <div className="absolute inset-0 border-2 border-red-400 rounded-sm"></div>
              )}
            </div>
          ))}
        </div>
        
        <div className="px-4 py-2 bg-gray-800 rounded-b-lg flex justify-between items-center">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full ${soundEnabled ? 'text-blue-400' : 'text-gray-500'}`}
          >
            {soundEnabled ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={resetGame}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded text-white transition hidden md:block"
            >
              Reset
            </button>
            <button
              onClick={resetGame}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded text-white transition md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (onGameEnd) onGameEnd('restart');
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition hidden md:block"
            >
              Try 3D Mode
            </button>
            <button
              onClick={() => {
                if (onGameEnd) onGameEnd('restart');
              }}
              className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition md:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile-only difficulty indicator */}
        <div className="text-center text-gray-600 mt-2 md:hidden">
          <p>Difficulty: <span className="font-semibold capitalize">{difficulty}</span></p>
          <p className="text-sm mt-1">Tap a piece to select it, then tap a highlighted square to move</p>
        </div>
      </div>
      
      {/* Game History panel - responsive design for mobile */}
      <div className="w-full md:w-1/3 bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3 text-center">Game History</h3>
        <div className="h-64 overflow-y-auto bg-gray-900/50 rounded-lg p-2 mb-4">
          {moveHistory.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                const whiteMove = moveHistory[i * 2];
                const blackMove = moveHistory[i * 2 + 1];
                return (
                  <React.Fragment key={i}>
                    <div className={`p-1 rounded ${lastMove?.from === whiteMove?.from && lastMove?.to === whiteMove?.to ? 'bg-blue-600/20' : ''}`}>
                      {formatMove(whiteMove, i + 1)}
                    </div>
                    <div className={`p-1 rounded ${blackMove && lastMove?.from === blackMove?.from && lastMove?.to === blackMove?.to ? 'bg-blue-600/20' : ''}`}>
                      {formatMove(blackMove, i + 1)}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No moves yet</p>
          )}
        </div>
        
        {isPremium && (
          <>
            <h3 className="text-white font-medium mb-2 text-center">Chess Tips</h3>
            <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-300">
                {difficulty === 'hard' ? (
                  'Try to control the center of the board and develop your pieces efficiently.'
                ) : difficulty === 'medium' ? (
                  'Look for opportunities to fork multiple pieces with your knights.'
                ) : (
                  'Remember to castle early to protect your king.'
                )}
              </p>
            </div>
            
            <div className="text-center">
              <h4 className="text-purple-400 text-sm mb-1">Premium Benefits Active</h4>
              <ul className="text-xs text-gray-400">
                <li>• Enhanced AI opponents</li>
                <li>• Visual move highlights</li>
                <li>• Game analysis</li>
                <li>• Reward bonuses</li>
              </ul>
            </div>
          </>
        )}
        
        {/* Mobile-only collapsible game controls */}
        <div className="md:hidden mt-4">
          <details className="bg-gray-700 rounded-lg">
            <summary className="p-3 font-medium text-white cursor-pointer">Game Controls</summary>
            <div className="p-3 bg-gray-800">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={resetGame}
                  className="py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded text-white transition"
                >
                  Reset Game
                </button>
                <button
                  onClick={() => {
                    if (onGameEnd) onGameEnd('restart');
                  }}
                  className="py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  Try 3D Mode
                </button>
                <button
                  onClick={() => analysisMode ? evaluateBoard(game) : null}
                  className={`py-2 text-sm rounded transition ${
                    analysisMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!analysisMode}
                >
                  Analyze Position
                </button>
                <button
                  onClick={() => setAnalysisMode(!analysisMode)}
                  className={`py-2 text-sm rounded transition ${
                    analysisMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {analysisMode ? 'Exit Analysis' : 'Analysis Mode'}
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-400 text-center">
                Analysis mode available with premium access
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default ChessIsolated;
