import { EMB_TOKEN_CONFIG } from './embToken';

/**
 * Chess Rewards Service - Handles token rewards for chess gameplay achievements
 * This service integrates with the tokenService to provide EMB token rewards
 * based on chess game performance and achievements.
 */
class ChessRewardsService {
  constructor(tokenService, gamificationService) {
    this.tokenService = tokenService;
    this.gamificationService = gamificationService;
    this.rewardRates = {
      win: {
        easy: 5,     // 5 EMB tokens for winning on easy difficulty
        medium: 10,  // 10 EMB tokens for winning on medium difficulty
        hard: 25     // 25 EMB tokens for winning on hard difficulty
      },
      draw: {
        easy: 1,     // 1 EMB token for drawing on easy difficulty
        medium: 3,   // 3 EMB tokens for drawing on medium difficulty
        hard: 5      // 5 EMB tokens for drawing on hard difficulty
      },
      specialMove: 2, // 2 EMB tokens for executing a special move (castle, en passant, etc.)
      chessmateCombination: 15 // 15 EMB tokens for executing a checkmate combination
    };
    this.achievementXP = {
      win: {
        easy: 50,    // XP for winning on easy difficulty
        medium: 100,  // XP for winning on medium difficulty
        hard: 250    // XP for winning on hard difficulty
      },
      draw: {
        easy: 10,    // XP for drawing on easy difficulty
        medium: 30,  // XP for drawing on medium difficulty
        hard: 50    // XP for drawing on hard difficulty
      }
    };
    
    // Initialize WebSocket for real-time rewards
    this.initializeWebSocket();
  }
  
  /**
   * Initialize WebSocket connection to listen for chess game events
   */
  initializeWebSocket() {
    if (typeof window === 'undefined') return;
    
    try {
      const wsEndpoint = EMB_TOKEN_CONFIG.wsEndpoints.devnet;
      this.ws = new WebSocket(wsEndpoint);
      
      this.ws.onopen = () => {
        console.log('Chess Rewards: Connected to Shyft WebSocket');
        this.ws.send(JSON.stringify({
          type: 'chess_rewards_connect',
          clientId: `rewards-${Date.now()}`
        }));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chess_game_end') {
            this.processGameEnd(data);
          } else if (data.type === 'chess_special_move') {
            this.processSpecialMove(data);
          }
        } catch (error) {
          console.error('Chess Rewards: Error processing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Chess Rewards: WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        console.log('Chess Rewards: Disconnected from Shyft WebSocket');
        // Attempt to reconnect after a delay
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Chess Rewards: Error initializing WebSocket:', error);
    }
  }
  
  /**
   * Process a game end event from WebSocket
   * @param {Object} data - The game end data from WebSocket
   */
  async processGameEnd(data) {
    const { result, difficulty } = data;
    
    if (result === 'win') {
      await this.rewardForWin(difficulty);
    } else if (result === 'draw') {
      await this.rewardForDraw(difficulty);
    }
  }
  
  /**
   * Process a special move event from WebSocket
   * @param {Object} data - The special move data from WebSocket
   */
  async processSpecialMove(data) {
    const { moveType } = data;
    
    if (moveType === 'castle' || moveType === 'en_passant' || moveType === 'promotion') {
      await this.rewardForSpecialMove(moveType);
    } else if (moveType === 'checkmate_combination') {
      await this.rewardForCheckmateCombination();
    }
  }
  
  /**
   * Reward a player for winning a chess game
   * @param {string} difficulty - The game difficulty (easy, medium, hard)
   */
  async rewardForWin(difficulty) {
    try {
      const rewardAmount = this.rewardRates.win[difficulty] || this.rewardRates.win.medium;
      const xpAmount = this.achievementXP.win[difficulty] || this.achievementXP.win.medium;
      
      // Award XP through gamification service
      if (this.gamificationService) {
        this.gamificationService.awardXP(xpAmount, 'Chess victory');
      }
      
      // Award EMB tokens through token service
      if (this.tokenService) {
        await this.tokenService.awardTokens(rewardAmount, `Chess win on ${difficulty} difficulty`);
      }
      
      console.log(`Rewarded ${rewardAmount} EMB tokens and ${xpAmount} XP for chess win on ${difficulty}`);
      
      return {
        success: true,
        rewardAmount,
        xpAmount,
        event: 'win',
        difficulty
      };
    } catch (error) {
      console.error('Error rewarding for chess win:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reward a player for drawing a chess game
   * @param {string} difficulty - The game difficulty (easy, medium, hard)
   */
  async rewardForDraw(difficulty) {
    try {
      const rewardAmount = this.rewardRates.draw[difficulty] || this.rewardRates.draw.medium;
      const xpAmount = this.achievementXP.draw[difficulty] || this.achievementXP.draw.medium;
      
      // Award XP through gamification service
      if (this.gamificationService) {
        this.gamificationService.awardXP(xpAmount, 'Chess draw');
      }
      
      // Award EMB tokens through token service
      if (this.tokenService) {
        await this.tokenService.awardTokens(rewardAmount, `Chess draw on ${difficulty} difficulty`);
      }
      
      console.log(`Rewarded ${rewardAmount} EMB tokens and ${xpAmount} XP for chess draw on ${difficulty}`);
      
      return {
        success: true,
        rewardAmount,
        xpAmount,
        event: 'draw',
        difficulty
      };
    } catch (error) {
      console.error('Error rewarding for chess draw:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reward a player for executing a special move
   * @param {string} moveType - The type of special move
   */
  async rewardForSpecialMove(moveType) {
    try {
      const rewardAmount = this.rewardRates.specialMove;
      
      // Award EMB tokens through token service
      if (this.tokenService) {
        await this.tokenService.awardTokens(rewardAmount, `Chess special move: ${moveType}`);
      }
      
      console.log(`Rewarded ${rewardAmount} EMB tokens for chess special move: ${moveType}`);
      
      return {
        success: true,
        rewardAmount,
        event: 'special_move',
        moveType
      };
    } catch (error) {
      console.error('Error rewarding for special move:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reward a player for executing a checkmate combination
   */
  async rewardForCheckmateCombination() {
    try {
      const rewardAmount = this.rewardRates.chessmateCombination;
      
      // Award EMB tokens through token service
      if (this.tokenService) {
        await this.tokenService.awardTokens(rewardAmount, 'Chess checkmate combination');
      }
      
      console.log(`Rewarded ${rewardAmount} EMB tokens for chess checkmate combination`);
      
      return {
        success: true,
        rewardAmount,
        event: 'checkmate_combination'
      };
    } catch (error) {
      console.error('Error rewarding for checkmate combination:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Create a hook for using the chess rewards service in React components
   * @returns {Object} - An object containing the chess rewards service methods
   */
  static createHook(tokenService, gamificationService) {
    const rewardsService = new ChessRewardsService(tokenService, gamificationService);
    
    return {
      rewardForWin: rewardsService.rewardForWin.bind(rewardsService),
      rewardForDraw: rewardsService.rewardForDraw.bind(rewardsService),
      rewardForSpecialMove: rewardsService.rewardForSpecialMove.bind(rewardsService),
      rewardForCheckmateCombination: rewardsService.rewardForCheckmateCombination.bind(rewardsService)
    };
  }
}

export default ChessRewardsService;