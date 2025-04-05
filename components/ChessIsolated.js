'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

/**
 * A lightweight 2D chess implementation that serves as a fallback
 * when 3D WebGL fails to load or for browsers with limited WebGL support
 */
const ChessIsolated = ({ difficulty = 'medium', onGameEnd }) => {
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
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
    
    // Cleanup
    return () => {
      setGame(null);
    };
  }, []);
  
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
          
          // Check if SQUARES is available and has enough elements
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
    if (!game) return;
    
    try {
      const moveResult = game.move({
        from,
        to,
        promotion: 'q' // Always promote to a queen for simplicity
      });
      
      if (moveResult) {
        setLastMove({ from, to });
        updateBoard(game);
        setSelectedPiece(null);
        setValidMoves([]);
        
        // Make the computer's move after a short delay
        if (!game.isGameOver()) {
          setThinking(true);
          makeComputerMove();
        }
      }
    } catch (e) {
      console.error('Invalid move:', e);
    }
  };
  
  // Handle computer's move based on difficulty
  const makeComputerMove = () => {
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
              // Prefer captures or checks, but sometimes make mistakes
              const smartMoves = moves.filter(m => m.captured || m.san.includes('+'));
              if (smartMoves.length > 0 && Math.random() > 0.3) {
                selectedMove = smartMoves[Math.floor(Math.random() * smartMoves.length)];
              } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
              }
              break;
              
            case 'hard':
            default:
              // Strongly prefer checkmate, captures of high-value pieces, and checks
              const checkmateMoves = moves.filter(m => m.san.includes('#'));
              const highValueCaptures = moves.filter(m => 
                (m.captured === 'q') || (m.captured === 'r') || 
                (m.captured === 'b') || (m.captured === 'n')
              );
              const checkMoves = moves.filter(m => m.san.includes('+'));
              const captureMoves = moves.filter(m => m.captured);
              
              if (checkmateMoves.length > 0) {
                selectedMove = checkmateMoves[0];
              } else if (highValueCaptures.length > 0 && Math.random() > 0.1) {
                selectedMove = highValueCaptures[Math.floor(Math.random() * highValueCaptures.length)];
              } else if (checkMoves.length > 0 && Math.random() > 0.2) {
                selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
              } else if (captureMoves.length > 0 && Math.random() > 0.3) {
                selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
              } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
              }
              break;
          }
          
          // Make the selected move
          if (selectedMove) {
            game.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: 'q'
            });
            
            setLastMove({ from: selectedMove.from, to: selectedMove.to });
            updateBoard(game);
          }
        }
      } catch (e) {
        console.error('Error making computer move:', e);
      } finally {
        setThinking(false);
      }
    }, 500);
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
  
  // Render chess board
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="chess-status bg-gray-800 text-white px-4 py-2 rounded-t-lg w-full text-center">
        {message}
      </div>
      
      <div 
        ref={boardRef}
        className="chess-board grid grid-cols-8 gap-0 border-2 border-gray-700 bg-gray-700"
        style={{ width: '100%', aspectRatio: '1 / 1' }}
      >
        {board.map((square) => (
          <div
            key={square.square}
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
              ${square.isLight ? 'bg-amber-100' : 'bg-amber-800'} 
              ${selectedPiece === square.square ? 'bg-green-400' : ''}
              ${validMoves.includes(square.square) ? 'bg-blue-300' : ''}
              ${lastMove?.from === square.square || lastMove?.to === square.square ? 'ring-2 ring-yellow-500 ring-inset' : ''}
              hover:opacity-90
            `}
            style={{ aspectRatio: '1 / 1' }}
          >
            {square.piece && (
              <div 
                className="piece w-full h-full"
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
              <div className="w-1/4 h-1/4 rounded-full bg-gray-800 opacity-50"></div>
            )}
            {validMoves.includes(square.square) && square.piece && (
              <div className="absolute inset-0 ring-2 ring-red-500 rounded-sm"></div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 w-full">
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            New Game
          </button>
          
          <button
            onClick={() => {
              if (onGameEnd) onGameEnd('restart');
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Try 3D Mode
          </button>
        </div>
        
        <div className="text-center text-gray-600">
          <p>Difficulty: <span className="font-semibold">{difficulty}</span></p>
          <p className="text-sm mt-1">Click on a piece to select it, then click on a highlighted square to move</p>
        </div>
      </div>
    </div>
  );
};

export default ChessIsolated;