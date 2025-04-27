'use client';

import React, { useState, useEffect } from 'react';

/**
 * Simple Texas Hold'em Poker game for the Arcade tab
 * Uses a custom implementation for poker hand logic
 */
const PokerGame = ({ isCompetitive = false, players = [], onGameEnd = null }) => {
  const [deck, setDeck] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [computerHands, setComputerHands] = useState([]);
  const [phase, setPhase] = useState('deal'); // deal, flop, turn, river, showdown
  const [winner, setWinner] = useState(null);
  const [playerChips, setPlayerChips] = useState(1000);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [numOpponents, setNumOpponents] = useState(isCompetitive ? players.length - 1 : 3);
  const [competitivePlayers, setCompetitivePlayers] = useState(
    isCompetitive ? players.map((player, index) => ({
      id: index,
      address: player,
      name: `Player ${index + 1}`,
      chips: 1000,
      hand: [],
      folded: false,
      allIn: false,
      currentBet: 0
    })) : []
  );
  const [competitivePlayerIndex, setCompetitivePlayerIndex] = useState(
    isCompetitive ? competitivePlayers.findIndex(p => p.address === window.solana?.publicKey?.toString()) : -1
  );
  
  // Initialize a fresh deck of cards
  const initializeDeck = () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let newDeck = [];

    for (let suit of suits) {
      for (let value of values) {
        newDeck.push({ suit, value });
      }
    }

    // Shuffle the deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  };

  // Deal cards at the start of the game
  const dealCards = () => {
    const newDeck = initializeDeck();
    let currentPlayerHand = [];
    let currentComputerHands = [];

    // Deal two cards to the player
    currentPlayerHand = [newDeck.pop(), newDeck.pop()];

    // Deal two cards to each computer opponent
    for (let i = 0; i < numOpponents; i++) {
      currentComputerHands.push([newDeck.pop(), newDeck.pop()]);
    }

    // If in competitive mode, deal to all players
    if (isCompetitive) {
      let updatedPlayers = [...competitivePlayers];
      updatedPlayers.forEach(player => {
        player.hand = [newDeck.pop(), newDeck.pop()];
        player.folded = false;
        player.allIn = false;
        player.currentBet = 0;
      });
      setCompetitivePlayers(updatedPlayers);
    }

    setDeck(newDeck);
    setPlayerHand(currentPlayerHand);
    setComputerHands(currentComputerHands);
    setCommunityCards([]);
    setPot(0);
    setCurrentBet(20); // Starting bet
    setPhase('deal');
    setWinner(null);
    setGameOver(false);
    
    // Initial blinds
    setPot(30); // Small blind (10) + big blind (20)
    
    // In competitive mode, first round of betting happens automatically
    if (isCompetitive) {
      // Simulate first round of betting
      let initialPot = 30;
      let updatedPlayers = [...competitivePlayers];
      
      // Small blind for player before dealer, big blind for dealer
      const smallBlindIdx = (competitivePlayerIndex - 2 + updatedPlayers.length) % updatedPlayers.length;
      const bigBlindIdx = (competitivePlayerIndex - 1 + updatedPlayers.length) % updatedPlayers.length;
      
      updatedPlayers[smallBlindIdx].chips -= 10;
      updatedPlayers[smallBlindIdx].currentBet = 10;
      
      updatedPlayers[bigBlindIdx].chips -= 20;
      updatedPlayers[bigBlindIdx].currentBet = 20;
      
      setCompetitivePlayers(updatedPlayers);
    }
  };

  // Deal community cards based on current phase
  const dealCommunityCards = () => {
    const newDeck = [...deck];
    let newCommunityCards = [...communityCards];

    switch (phase) {
      case 'deal':
        // Deal the flop (3 cards)
        newCommunityCards = [newDeck.pop(), newDeck.pop(), newDeck.pop()];
        setPhase('flop');
        break;
      case 'flop':
        // Deal the turn (1 card)
        newCommunityCards.push(newDeck.pop());
        setPhase('turn');
        break;
      case 'turn':
        // Deal the river (1 card)
        newCommunityCards.push(newDeck.pop());
        setPhase('river');
        break;
      case 'river':
        // Move to showdown
        determineWinner();
        setPhase('showdown');
        break;
      default:
        break;
    }

    setCommunityCards(newCommunityCards);
    setDeck(newDeck);
    setCurrentBet(0);
    
    // If in competitive mode, reset player bets for next round
    if (isCompetitive) {
      let updatedPlayers = [...competitivePlayers];
      updatedPlayers.forEach(player => {
        if (!player.folded) {
          player.currentBet = 0;
        }
      });
      setCompetitivePlayers(updatedPlayers);
    }
    
    // Computer players automatically check in their turn if we're in non-competitive mode
    if (!isCompetitive) {
      setIsPlayerTurn(true);
    }
  };

  // Handle player action: check, bet, fold
  const handlePlayerAction = (action, betAmount = 0) => {
    if (!isPlayerTurn || gameOver) return;

    const currentPot = pot;
    let newPot = currentPot;
    let newPlayerChips = playerChips;
    
    switch (action) {
      case 'check':
        // If there's no current bet, player can check
        if (currentBet === 0) {
          // Nothing changes with chips
        } else {
          // If there's a bet, player must call or fold
          return;
        }
        break;
      case 'bet':
        // Place a bet
        if (betAmount <= 0 || betAmount > playerChips) return;
        newPot += betAmount;
        newPlayerChips -= betAmount;
        setCurrentBet(betAmount);
        break;
      case 'call':
        // Call the current bet
        if (currentBet > playerChips) {
          // All-in
          newPot += playerChips;
          newPlayerChips = 0;
        } else {
          newPot += currentBet;
          newPlayerChips -= currentBet;
        }
        break;
      case 'fold':
        // Player folds, computer wins
        setWinner('Computer');
        setGameOver(true);
        return;
      default:
        return;
    }

    setPlayerChips(newPlayerChips);
    setPot(newPot);
    
    // In competitive mode, update the player's state
    if (isCompetitive) {
      let updatedPlayers = [...competitivePlayers];
      const playerIdx = competitivePlayerIndex;
      
      if (action === 'fold') {
        updatedPlayers[playerIdx].folded = true;
      } else if (action === 'call' || action === 'bet') {
        const betAmount = action === 'bet' ? betAmount : currentBet;
        if (betAmount >= updatedPlayers[playerIdx].chips) {
          // All-in
          updatedPlayers[playerIdx].allIn = true;
          newPot += updatedPlayers[playerIdx].chips;
          updatedPlayers[playerIdx].currentBet += updatedPlayers[playerIdx].chips;
          updatedPlayers[playerIdx].chips = 0;
        } else {
          updatedPlayers[playerIdx].chips -= betAmount;
          updatedPlayers[playerIdx].currentBet += betAmount;
          newPot += betAmount;
        }
      }
      
      setCompetitivePlayers(updatedPlayers);
      setPot(newPot);
      
      // Check if we can advance to next phase (all players have same bet or folded/all-in)
      const activePlayers = updatedPlayers.filter(p => !p.folded && !p.allIn);
      const allSameBet = activePlayers.every(p => p.currentBet === activePlayers[0].currentBet);
      
      if (allSameBet) {
        // Move to next phase
        if (phase === 'showdown') {
          determineWinner();
        } else {
          dealCommunityCards();
        }
      } else {
        // Next player's turn
        let nextPlayerIdx = (playerIdx + 1) % updatedPlayers.length;
        while (updatedPlayers[nextPlayerIdx].folded || updatedPlayers[nextPlayerIdx].allIn) {
          nextPlayerIdx = (nextPlayerIdx + 1) % updatedPlayers.length;
          
          // If we loop all the way back to the current player, everyone else is folded or all-in
          if (nextPlayerIdx === playerIdx) {
            // Move to next phase
            if (phase === 'showdown') {
              determineWinner();
            } else {
              dealCommunityCards();
            }
            return;
          }
        }
        
        // Simulate the other player's action
        setTimeout(() => {
          simulatePlayerAction(nextPlayerIdx);
        }, 1000);
      }
    } else {
      // In single player mode
      setIsPlayerTurn(false);
      
      // Simulate computer actions after a delay
      setTimeout(() => {
        handleComputerActions();
      }, 1000);
    }
  };

  // Handle computer player actions in single player mode
  const handleComputerActions = () => {
    // Simple AI for demonstration
    // In a real game, the AI would make decisions based on hand strength
    
    if (Math.random() > 0.3) {
      // Computer calls or checks
      const callAmount = currentBet;
      setPot(pot + callAmount);
    } else {
      // Computer raises
      const raiseAmount = currentBet + 20;
      setPot(pot + raiseAmount);
      setCurrentBet(raiseAmount - currentBet);
    }

    setIsPlayerTurn(true);
    
    // If we're at the end of a betting round, deal next community cards
    if (!isCompetitive && Math.random() > 0.2) {
      setTimeout(() => {
        dealCommunityCards();
      }, 1000);
    }
  };
  
  // Simulate competitive player action
  const simulatePlayerAction = (playerIdx) => {
    if (playerIdx === competitivePlayerIndex) {
      // It's the human player's turn, don't simulate
      return;
    }
    
    let updatedPlayers = [...competitivePlayers];
    const player = updatedPlayers[playerIdx];
    
    // Simple AI for competitive mode
    const action = Math.random();
    
    if (action < 0.1) {
      // Fold
      player.folded = true;
    } else if (action < 0.6) {
      // Call
      const callAmount = Math.max(...updatedPlayers.map(p => p.currentBet)) - player.currentBet;
      if (callAmount >= player.chips) {
        // All-in
        setPot(pot + player.chips);
        player.currentBet += player.chips;
        player.allIn = true;
        player.chips = 0;
      } else {
        setPot(pot + callAmount);
        player.chips -= callAmount;
        player.currentBet += callAmount;
      }
    } else {
      // Raise
      const currentMaxBet = Math.max(...updatedPlayers.map(p => p.currentBet));
      const callAmount = currentMaxBet - player.currentBet;
      const raiseAmount = Math.min(50, player.chips - callAmount);
      
      if (callAmount + raiseAmount >= player.chips) {
        // All-in
        setPot(pot + player.chips);
        player.currentBet += player.chips;
        player.allIn = true;
        player.chips = 0;
      } else {
        setPot(pot + callAmount + raiseAmount);
        player.chips -= (callAmount + raiseAmount);
        player.currentBet += (callAmount + raiseAmount);
        setCurrentBet(currentMaxBet + raiseAmount);
      }
    }
    
    setCompetitivePlayers(updatedPlayers);
    
    // Check if we can advance to next phase
    const activePlayers = updatedPlayers.filter(p => !p.folded && !p.allIn);
    const allSameBet = activePlayers.every(p => p.currentBet === activePlayers[0].currentBet);
    
    if (allSameBet) {
      // Move to next phase
      if (phase === 'showdown') {
        determineWinner();
      } else {
        dealCommunityCards();
      }
      return;
    }
    
    // Find the next player who isn't folded or all-in
    let nextPlayerIdx = (playerIdx + 1) % updatedPlayers.length;
    while (updatedPlayers[nextPlayerIdx].folded || updatedPlayers[nextPlayerIdx].allIn) {
      nextPlayerIdx = (nextPlayerIdx + 1) % updatedPlayers.length;
      
      // If we loop all the way back to the current player, everyone else is folded or all-in
      if (nextPlayerIdx === playerIdx) {
        // Move to next phase
        if (phase === 'showdown') {
          determineWinner();
        } else {
          dealCommunityCards();
        }
        return;
      }
    }
    
    if (nextPlayerIdx === competitivePlayerIndex) {
      // It's the human player's turn
      setIsPlayerTurn(true);
    } else {
      // Simulate the next computer player's action
      setTimeout(() => {
        simulatePlayerAction(nextPlayerIdx);
      }, 1000);
    }
  };

  // Simple winner determination based on random for now
  // In a real poker game, this would evaluate hand strength
  const determineWinner = () => {
    if (isCompetitive) {
      // Get only non-folded players
      const activePlayers = competitivePlayers.filter(player => !player.folded);
      
      // If only one active player, they win
      if (activePlayers.length === 1) {
        setWinner(activePlayers[0].name);
        if (activePlayers[0].address === window.solana?.publicKey?.toString()) {
          setPlayerChips(playerChips + pot);
        }
        
        // Notify parent component of game end
        if (onGameEnd) {
          onGameEnd({
            winner: activePlayers[0].address,
            result: `${activePlayers[0].name} wins!`
          });
        }
      } else {
        // Randomly select a winner among active players for demonstration
        // In a real game, this would evaluate hand strength
        const winnerIndex = Math.floor(Math.random() * activePlayers.length);
        setWinner(activePlayers[winnerIndex].name);
        
        // If the player won, update their chips
        if (activePlayers[winnerIndex].address === window.solana?.publicKey?.toString()) {
          setPlayerChips(playerChips + pot);
        }
        
        // Notify parent component of game end
        if (onGameEnd) {
          onGameEnd({
            winner: activePlayers[winnerIndex].address,
            result: `${activePlayers[winnerIndex].name} wins!`
          });
        }
      }
    } else {
      // For regular game, just do a simple random winner
      const winnerDecider = Math.random();
      if (winnerDecider > 0.6) {
        setWinner('Player');
        setPlayerChips(playerChips + pot);
      } else {
        setWinner('Computer');
      }
    }
    
    setGameOver(true);
    setPhase('showdown');
  };

  // Start a new game
  const newGame = () => {
    dealCards();
  };

  // Initialize the game
  useEffect(() => {
    dealCards();
  }, []);

  // Render card
  const renderCard = (card) => {
    if (!card) return <div className="card card-back"></div>;

    const { suit, value } = card;
    const suitSymbol = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    }[suit];
    
    const color = suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
    
    return (
      <div className={`card bg-white rounded-lg shadow-lg p-2 w-16 h-24 flex flex-col items-center justify-between`}>
        <div className="text-xs">{value}</div>
        <div className={`text-2xl ${color}`}>{suitSymbol}</div>
        <div className="text-xs transform rotate-180">{value}</div>
      </div>
    );
  };

  // Render community cards
  const renderCommunityCards = () => {
    return (
      <div className="flex justify-center space-x-2 my-4">
        {communityCards.map((card, index) => (
          <div key={index}>{renderCard(card)}</div>
        ))}
        {/* Placeholder for cards that haven't been dealt yet */}
        {Array(5 - communityCards.length).fill(null).map((_, index) => (
          <div key={`placeholder-${index}`} className="w-16 h-24 rounded-lg bg-gray-800 shadow-inner"></div>
        ))}
      </div>
    );
  };

  // Render player's hand
  const renderPlayerHand = () => {
    return (
      <div className="flex justify-center space-x-2 my-4">
        {playerHand.map((card, index) => (
          <div key={index}>{renderCard(card)}</div>
        ))}
      </div>
    );
  };

  // Render computer's hand
  const renderComputerHands = () => {
    return (
      <div className="flex justify-center space-x-4 my-4">
        {computerHands.map((hand, playerIndex) => (
          <div key={playerIndex} className="text-center">
            <div className="text-gray-300 mb-2">Computer {playerIndex + 1}</div>
            <div className="flex space-x-2">
              {phase === 'showdown' ? (
                // Show computer cards in showdown
                hand.map((card, index) => (
                  <div key={index}>{renderCard(card)}</div>
                ))
              ) : (
                // Show card backs otherwise
                hand.map((_, index) => (
                  <div key={index} className="card card-back w-16 h-24 rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 shadow-lg"></div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render competitive player hands
  const renderCompetitiveHands = () => {
    // Only show the current player's hand
    if (competitivePlayerIndex < 0) return null;
    
    return (
      <div className="flex flex-wrap justify-center my-4">
        {competitivePlayers.map((player, index) => (
          <div key={index} className={`m-2 p-3 rounded-lg ${index === competitivePlayerIndex ? 'bg-blue-900/30 border border-blue-600/50' : 'bg-gray-800/50'} ${player.folded ? 'opacity-50' : ''}`}>
            <div className="text-center mb-2">
              <div className="text-sm text-gray-400">{player.address.substring(0, 4)}...{player.address.substring(player.address.length - 4)}</div>
              <div className={`font-medium ${player.folded ? 'text-red-500' : player.allIn ? 'text-amber-500' : 'text-white'}`}>
                {player.folded ? 'Folded' : player.allIn ? 'All-In' : player.name}
              </div>
              <div className="text-xs text-gray-300">Chips: {player.chips}</div>
              {player.currentBet > 0 && (
                <div className="text-xs text-blue-400">Bet: {player.currentBet}</div>
              )}
            </div>
            
            <div className="flex space-x-1">
              {index === competitivePlayerIndex || phase === 'showdown' ? (
                // Show player's actual cards
                player.hand.map((card, cardIndex) => (
                  <div key={cardIndex} className="transform scale-75">{renderCard(card)}</div>
                ))
              ) : (
                // Show card backs for other players
                player.hand.map((_, cardIndex) => (
                  <div key={cardIndex} className="card card-back w-12 h-18 rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 transform scale-75 shadow-lg"></div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-xl min-h-[600px] flex flex-col">
      <h2 className="text-2xl font-bold text-center mb-4">Texas Hold'em Poker</h2>
      
      {/* Game info */}
      <div className="flex justify-between mb-4">
        <div>
          <span className="text-gray-400">Phase:</span> 
          <span className="ml-2 capitalize">{phase}</span>
        </div>
        <div>
          <span className="text-gray-400">Pot:</span> 
          <span className="ml-2 text-green-400">${pot}</span>
        </div>
        <div>
          <span className="text-gray-400">Your Chips:</span> 
          <span className="ml-2 text-blue-400">${playerChips}</span>
        </div>
      </div>
      
      {/* Computer hands or competitive players */}
      {isCompetitive ? renderCompetitiveHands() : renderComputerHands()}
      
      {/* Community cards */}
      <div className="my-6 text-center">
        <div className="text-gray-400 mb-2">Community Cards</div>
        {renderCommunityCards()}
      </div>
      
      {/* Player's hand */}
      <div className="mt-auto">
        <div className="text-center mb-2">Your Hand</div>
        {renderPlayerHand()}
        
        {/* Game controls */}
        {!gameOver ? (
          <div className="flex justify-center space-x-4 mt-4">
            <button 
              onClick={() => handlePlayerAction('check')}
              disabled={!isPlayerTurn || currentBet > 0}
              className={`px-4 py-2 rounded ${!isPlayerTurn || currentBet > 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              Check
            </button>
            <button 
              onClick={() => handlePlayerAction('call')}
              disabled={!isPlayerTurn || currentBet === 0}
              className={`px-4 py-2 rounded ${!isPlayerTurn || currentBet === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
            >
              Call ${currentBet}
            </button>
            <button 
              onClick={() => handlePlayerAction('bet', 50)}
              disabled={!isPlayerTurn}
              className={`px-4 py-2 rounded ${!isPlayerTurn ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500'}`}
            >
              Bet $50
            </button>
            <button 
              onClick={() => handlePlayerAction('fold')}
              disabled={!isPlayerTurn}
              className={`px-4 py-2 rounded ${!isPlayerTurn ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}
            >
              Fold
            </button>
          </div>
        ) : (
          <div className="text-center mt-4">
            <div className="text-xl font-bold mb-4">
              {winner === 'Player' ? (
                <span className="text-green-400">You win ${pot}!</span>
              ) : (
                <span className="text-red-400">{winner} wins!</span>
              )}
            </div>
            <button 
              onClick={newGame}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokerGame;