import { Connection, PublicKey, Keypair, clusterApiUrl, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer, getAccount, burn } from '@solana/spl-token';
import bs58 from 'bs58';
import 'dotenv/config';

// Constants
const NEW_EMBAI_ADDRESS = '3xAcrqNddNmc8piAk6HHxhKJtr7gt6hKCkXHhCkcA84G';
const MIGRATION_BONUS_RATE = 1.1; // 10% bonus for migration
const TRADING_FEE_DISCOUNT = 0.2; // 20% discount on trading fees when paid with EMBAI
const BURN_PERCENTAGE = 0.1; // 10% of fees collected in EMBAI are burned
const PREMIUM_FEATURES_THRESHOLD = 1000; // Hold at least 1000 EMBAI for premium features
const STAKING_REWARD_RATE = 0.05; // 5% annual staking rewards
const GRADUATION_TRADE_THRESHOLD = 5; // Number of successful paper trades needed to graduate

// Token configuration
const TOKEN_CONFIG = {
  name: "EMBAI Token",
  symbol: "$EMBAI",
  decimals: 9,
  initialSupply: 1000000000, // 1 billion tokens
};

// Paper trading token configuration
const EMB_TOKEN_CONFIG = {
  name: "EMB Paper Trading Token",
  symbol: "$EMB",
  decimals: 9,
  initialSupply: 10000000, // 10 million tokens for paper trading
};

// Distribution
const TOKEN_DISTRIBUTION = {
  communityAndEcosystem: 400000000, // 40%
  liquidityAndMarketMaking: 200000000, // 20%
  developmentAndTeam: 150000000, // 15% (vested over 24 months)
  strategicPartnerships: 100000000, // 10% (unlocked quarterly over 18 months)
  marketingAndPromotion: 100000000, // 10%
  reserveFund: 50000000, // 5%
};

// Governance configuration
const GOVERNANCE_CONFIG = {
  minimumTokensForProposal: 10000, // Need 10K EMBAI to create proposal
  votingPeriodDays: 7, // Voting period in days
  executionDelayDays: 2, // Delay before execution after passing
};

class EMBAITokenManager {
  constructor(connection) {
    this.connection = connection || new Connection(clusterApiUrl('devnet'), 'confirmed');
    this.isLive = false; // Will be enabled after migration
    this.mint = null;
    this.burnedTokens = 0;
    this.stakedTokens = {};
    this.governanceProposals = [];
    this.paperTradingUsers = {}; // Keep track of paper trading users and their successful trades
    this.migratedUsers = new Set(); // Keep track of users who have migrated from EMB to EMBAI
    
    // Try to initialize with the existing mint address
    this.initializeWithExistingMint();
  }

  async initializeWithExistingMint() {
    try {
      this.mint = new PublicKey(NEW_EMBAI_ADDRESS);
      // Check if the mint exists
      await this.connection.getAccountInfo(this.mint);
      this.isLive = true;
      console.log('Initialized with existing EMBAI mint:', this.mint.toString());
    } catch (error) {
      console.log('EMBAI token not yet live on the network');
      this.isLive = false;
    }
  }

  // Token creation function
  async createToken(payerSecretKey) {
    try {
      // Convert the secret key to a Keypair
      const payerKeypair = Keypair.fromSecretKey(bs58.decode(payerSecretKey));
      
      console.log('Creating new token mint...');
      // Create the token mint
      this.mint = await createMint(
        this.connection,
        payerKeypair,                 // Payer of the transaction
        payerKeypair.publicKey,       // Mint authority
        payerKeypair.publicKey,       // Freeze authority (can be null)
        TOKEN_CONFIG.decimals
      );
      
      console.log(`Token created successfully. Mint address: ${this.mint.toString()}`);
      
      // Create an associated token account for the payer
      console.log('Creating token account...');
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair,
        this.mint,
        payerKeypair.publicKey
      );
      
      console.log(`Token account created: ${tokenAccount.address.toString()}`);
      
      // Mint the initial supply to the payer's token account
      console.log(`Minting ${TOKEN_CONFIG.initialSupply} tokens to ${tokenAccount.address.toString()}...`);
      await mintTo(
        this.connection,
        payerKeypair,
        this.mint,
        tokenAccount.address,
        payerKeypair,
        TOKEN_CONFIG.initialSupply * (10 ** TOKEN_CONFIG.decimals)
      );
      
      console.log(`${TOKEN_CONFIG.initialSupply} tokens minted successfully`);
      
      this.isLive = true;
      
      return {
        success: true,
        mint: this.mint.toString(),
        tokenAccount: tokenAccount.address.toString(),
        owner: payerKeypair.publicKey.toString(),
      };
    } catch (error) {
      console.error('Error creating token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getTokenBalance(walletAddress) {
    try {
      if (!this.mint) {
        throw new Error('Token mint not initialized');
      }
      
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        null, // Will throw error, but just for checking
        this.mint,
        walletPublicKey
      );
      
      const accountInfo = await getAccount(this.connection, tokenAccount.address);
      return Number(accountInfo.amount) / (10 ** TOKEN_CONFIG.decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  // Core token operations
  async getBalance(walletAddress) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    return this.getTokenBalance(walletAddress);
  }

  async transfer(fromPrivateKey, toAddress, amount) {
    if (!this.isLive || !this.mint) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(fromPrivateKey));
      const toPublicKey = new PublicKey(toAddress);
      
      // Get or create associated token accounts
      const sourceAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        this.mint,
        fromKeypair.publicKey
      );
      
      const destinationAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        this.mint,
        toPublicKey
      );
      
      // Transfer tokens
      const txSignature = await transfer(
        this.connection,
        fromKeypair,
        sourceAccount.address,
        destinationAccount.address,
        fromKeypair,
        amount * (10 ** TOKEN_CONFIG.decimals)
      );
      
      return {
        success: true,
        signature: txSignature,
        amount: amount
      };
    } catch (error) {
      console.error('Error transferring tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Paper trading functions
  async getEmbBalance(walletAddress) {
    // This is a mock function since EMB is not on-chain
    return this.paperTradingUsers[walletAddress]?.balance || 1000; // Default starting balance
  }

  async updateEmbBalance(walletAddress, newBalance) {
    if (!this.paperTradingUsers[walletAddress]) {
      this.paperTradingUsers[walletAddress] = {
        balance: 1000,
        successfulTrades: 0,
        joinedDate: new Date(),
      };
    }
    this.paperTradingUsers[walletAddress].balance = newBalance;
    return this.paperTradingUsers[walletAddress].balance;
  }

  async recordSuccessfulPaperTrade(walletAddress, profit) {
    if (!this.paperTradingUsers[walletAddress]) {
      this.paperTradingUsers[walletAddress] = {
        balance: 1000,
        successfulTrades: 0,
        joinedDate: new Date(),
      };
    }
    
    this.paperTradingUsers[walletAddress].successfulTrades++;
    this.paperTradingUsers[walletAddress].balance += profit;
    
    return {
      newBalance: this.paperTradingUsers[walletAddress].balance,
      successfulTrades: this.paperTradingUsers[walletAddress].successfulTrades,
      readyToGraduate: this.paperTradingUsers[walletAddress].successfulTrades >= GRADUATION_TRADE_THRESHOLD,
    };
  }

  async getTraderGraduationStatus(walletAddress) {
    const paperTrader = this.paperTradingUsers[walletAddress];
    if (!paperTrader) {
      return {
        successfulTrades: 0,
        readyToGraduate: false,
        hasGraduated: this.migratedUsers.has(walletAddress),
        requiredTrades: GRADUATION_TRADE_THRESHOLD,
      };
    }
    
    return {
      successfulTrades: paperTrader.successfulTrades,
      readyToGraduate: paperTrader.successfulTrades >= GRADUATION_TRADE_THRESHOLD,
      hasGraduated: this.migratedUsers.has(walletAddress),
      requiredTrades: GRADUATION_TRADE_THRESHOLD,
    };
  }

  // Migration functionality
  async calculateMigrationAmount(embAmount) {
    return {
      baseAmount: embAmount,
      bonusAmount: embAmount * (MIGRATION_BONUS_RATE - 1),
      totalAmount: embAmount * MIGRATION_BONUS_RATE
    };
  }

  async getMigrationPreview(walletAddress) {
    if (!this.isLive) {
      return {
        isEligible: false,
        message: 'Migration is not yet available. Stay tuned for the announcement!',
        migrationBonus: MIGRATION_BONUS_RATE,
      };
    }
    
    const graduationStatus = await this.getTraderGraduationStatus(walletAddress);
    if (!graduationStatus.readyToGraduate) {
      return {
        isEligible: false,
        message: `Complete ${GRADUATION_TRADE_THRESHOLD} successful paper trades to qualify for migration.`,
        successfulTrades: graduationStatus.successfulTrades,
        requiredTrades: GRADUATION_TRADE_THRESHOLD,
        migrationBonus: MIGRATION_BONUS_RATE,
      };
    }
    
    if (graduationStatus.hasGraduated) {
      return {
        isEligible: false,
        message: 'You have already migrated from $EMB to $EMBAI.',
        hasGraduated: true,
        migrationBonus: MIGRATION_BONUS_RATE,
      };
    }
    
    const embBalance = await this.getEmbBalance(walletAddress);
    const migrationAmount = await this.calculateMigrationAmount(embBalance);
    
    return {
      isEligible: true,
      message: 'You are eligible to migrate your $EMB to $EMBAI with a bonus!',
      embBalance: embBalance,
      migrationBonus: MIGRATION_BONUS_RATE,
      baseAmount: migrationAmount.baseAmount,
      bonusAmount: migrationAmount.bonusAmount,
      totalAmount: migrationAmount.totalAmount,
    };
  }

  async migrate(walletAddress, privateKey) {
    if (!this.isLive) {
      throw new Error('Migration is not yet available');
    }
    
    const migrationPreview = await this.getMigrationPreview(walletAddress);
    
    if (!migrationPreview.isEligible) {
      throw new Error(migrationPreview.message);
    }
    
    try {
      const embBalance = await this.getEmbBalance(walletAddress);
      
      // "Burn" the EMB tokens (not really on-chain, just in our records)
      await this.updateEmbBalance(walletAddress, 0);
      
      // Calculate EMBAI amount to mint (with bonus)
      const embaiAmount = embBalance * MIGRATION_BONUS_RATE;
      
      // If we have a private key, actually mint or transfer the EMBAI tokens on-chain
      if (privateKey) {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
        const userPublicKey = new PublicKey(walletAddress);
        
        // Get or create the user's EMBAI token account
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          keypair,
          this.mint,
          userPublicKey
        );
        
        // Mint the EMBAI tokens to the user's account
        await mintTo(
          this.connection,
          keypair,
          this.mint,
          tokenAccount.address,
          keypair,
          Math.floor(embaiAmount * (10 ** TOKEN_CONFIG.decimals))
        );
      }
      
      // Mark user as migrated
      this.migratedUsers.add(walletAddress);
      
      return {
        success: true,
        migratedAmount: embBalance,
        receivedEmbai: embaiAmount,
        bonus: embBalance * (MIGRATION_BONUS_RATE - 1),
        message: `Successfully migrated ${embBalance} $EMB to ${embaiAmount} $EMBAI with a ${(MIGRATION_BONUS_RATE - 1) * 100}% bonus!`
      };
    } catch (error) {
      console.error('Error migrating tokens:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Burning functionality
  async burn(privateKey, amount) {
    if (!this.isLive || !this.mint) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      
      // Get the token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        keypair,
        this.mint,
        keypair.publicKey
      );
      
      // Burn the tokens
      await burn(
        this.connection,
        keypair,
        tokenAccount.address,
        this.mint,
        keypair,
        amount * (10 ** TOKEN_CONFIG.decimals)
      );
      
      // Track burned tokens
      this.burnedTokens += amount;
      
      return {
        success: true,
        burnedAmount: amount,
        totalBurned: this.burnedTokens
      };
    } catch (error) {
      console.error('Error burning tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fee calculation with EMBAI discount
  calculateTradingFee(tradeAmount, useEmbaiForFees = false) {
    const baseFeeRate = 0.001; // 0.1% base fee
    let feeRate = baseFeeRate;
    
    if (useEmbaiForFees && this.isLive) {
      feeRate = baseFeeRate * (1 - TRADING_FEE_DISCOUNT);
    }
    
    return {
      feeRate: feeRate,
      feeAmount: tradeAmount * feeRate,
      discount: useEmbaiForFees ? TRADING_FEE_DISCOUNT * 100 : 0,
      embaiTokensNeeded: useEmbaiForFees ? tradeAmount * feeRate * 10 : 0 // Conversion rate for EMBAI tokens needed
    };
  }

  // Auto-burn from trading fees
  async burnFromTradingFees(tradeFeeInEmbai, privateKey) {
    const burnAmount = tradeFeeInEmbai * BURN_PERCENTAGE;
    return await this.burn(privateKey, burnAmount);
  }

  // Staking functionality
  async stake(walletAddress, privateKey, amount, stakingPeriodDays = 30) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const publicKey = keypair.publicKey.toString();
      
      // Transfer tokens to staking contract (simulation)
      const stakingContractAddress = "StakingContractAddressPlaceholder"; // In production, this would be a real contract
      const transferResult = await this.transfer(privateKey, stakingContractAddress, amount);
      
      if (!transferResult.success) {
        throw new Error(`Failed to transfer tokens for staking: ${transferResult.error}`);
      }
      
      // Record the staking information
      const currentTime = Date.now();
      const unlockTime = currentTime + (stakingPeriodDays * 24 * 60 * 60 * 1000);
      
      if (!this.stakedTokens[publicKey]) {
        this.stakedTokens[publicKey] = [];
      }
      
      const stakingId = `staking_${publicKey}_${currentTime}`;
      
      this.stakedTokens[publicKey].push({
        id: stakingId,
        amount: amount,
        startTime: currentTime,
        unlockTime: unlockTime,
        stakingPeriodDays: stakingPeriodDays,
        rewardRate: STAKING_REWARD_RATE * (stakingPeriodDays / 365), // Prorated for staking period
        status: 'active'
      });
      
      return {
        success: true,
        stakingId: stakingId,
        amount: amount,
        unlockDate: new Date(unlockTime).toISOString(),
        estimatedReward: amount * STAKING_REWARD_RATE * (stakingPeriodDays / 365)
      };
    } catch (error) {
      console.error('Error staking tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get staking information
  async getStakingInfo(walletAddress) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      const stakes = this.stakedTokens[walletAddress] || [];
      
      // Calculate accrued rewards for each stake
      const stakesWithRewards = stakes.map(stake => {
        const currentTime = Date.now();
        const timeElapsedDays = (currentTime - stake.startTime) / (24 * 60 * 60 * 1000);
        const accruedReward = stake.amount * STAKING_REWARD_RATE * (timeElapsedDays / 365);
        
        return {
          ...stake,
          accruedReward: accruedReward,
          canUnstake: currentTime >= stake.unlockTime
        };
      });
      
      return {
        success: true,
        stakes: stakesWithRewards,
        totalStaked: stakesWithRewards.reduce((sum, stake) => sum + stake.amount, 0),
        totalRewards: stakesWithRewards.reduce((sum, stake) => sum + stake.accruedReward, 0)
      };
    } catch (error) {
      console.error('Error fetching staking info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Unstake tokens
  async unstake(walletAddress, privateKey, stakingId) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      const publicKey = new PublicKey(bs58.decode(privateKey)).toString();
      
      if (!this.stakedTokens[publicKey]) {
        throw new Error('No staked tokens found for this wallet');
      }
      
      const stakeIndex = this.stakedTokens[publicKey].findIndex(s => s.id === stakingId);
      
      if (stakeIndex === -1) {
        throw new Error('Staking ID not found');
      }
      
      const stake = this.stakedTokens[publicKey][stakeIndex];
      const currentTime = Date.now();
      
      if (currentTime < stake.unlockTime) {
        throw new Error(`Tokens are still locked until ${new Date(stake.unlockTime).toISOString()}`);
      }
      
      // Calculate rewards
      const timeElapsedDays = (currentTime - stake.startTime) / (24 * 60 * 60 * 1000);
      const reward = stake.amount * STAKING_REWARD_RATE * (timeElapsedDays / 365);
      
      // In a real implementation, transfer tokens back from staking contract
      // For now, we'll just simulate it
      
      // Remove the stake
      this.stakedTokens[publicKey].splice(stakeIndex, 1);
      
      return {
        success: true,
        unstakedAmount: stake.amount,
        rewards: reward,
        total: stake.amount + reward
      };
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Governance functionality
  async createProposal(walletAddress, title, description, options = ['Yes', 'No']) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      // Check if wallet has enough tokens to create a proposal
      const balance = await this.getBalance(walletAddress);
      
      if (balance < GOVERNANCE_CONFIG.minimumTokensForProposal) {
        throw new Error(`Insufficient EMBAI balance. You need at least ${GOVERNANCE_CONFIG.minimumTokensForProposal} EMBAI to create a proposal.`);
      }
      
      const currentTime = Date.now();
      const votingEndTime = currentTime + (GOVERNANCE_CONFIG.votingPeriodDays * 24 * 60 * 60 * 1000);
      const executionTime = votingEndTime + (GOVERNANCE_CONFIG.executionDelayDays * 24 * 60 * 60 * 1000);
      
      const proposalId = `proposal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const proposal = {
        id: proposalId,
        title: title,
        description: description,
        creator: walletAddress,
        options: options,
        votes: options.reduce((acc, opt) => {
          acc[opt] = { count: 0, voters: {} };
          return acc;
        }, {}),
        createdAt: currentTime,
        votingEndsAt: votingEndTime,
        executionTime: executionTime,
        status: 'active',
        result: null
      };
      
      this.governanceProposals.push(proposal);
      
      return {
        success: true,
        proposalId: proposalId,
        proposal: proposal
      };
    } catch (error) {
      console.error('Error creating governance proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Vote on a proposal
  async voteOnProposal(walletAddress, proposalId, option) {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    try {
      // Find the proposal
      const proposalIndex = this.governanceProposals.findIndex(p => p.id === proposalId);
      
      if (proposalIndex === -1) {
        throw new Error('Proposal not found');
      }
      
      const proposal = this.governanceProposals[proposalIndex];
      
      // Check if voting is still open
      const currentTime = Date.now();
      if (currentTime > proposal.votingEndsAt) {
        throw new Error('Voting period has ended');
      }
      
      // Check if option exists
      if (!proposal.votes[option]) {
        throw new Error(`Invalid option: ${option}`);
      }
      
      // Check if already voted
      for (const opt of Object.keys(proposal.votes)) {
        if (proposal.votes[opt].voters[walletAddress]) {
          throw new Error('You have already voted on this proposal');
        }
      }
      
      // Get voting power (based on token balance)
      const balance = await this.getBalance(walletAddress);
      
      // Record the vote
      proposal.votes[option].count += balance;
      proposal.votes[option].voters[walletAddress] = balance;
      
      // Update the proposal
      this.governanceProposals[proposalIndex] = proposal;
      
      return {
        success: true,
        proposalId: proposalId,
        votedOption: option,
        votingPower: balance
      };
    } catch (error) {
      console.error('Error voting on proposal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all governance proposals
  async getProposals() {
    if (!this.isLive) {
      throw new Error('$EMBAI token is not yet live');
    }
    
    // Update proposal statuses
    this.updateProposalStatuses();
    
    return {
      success: true,
      proposals: this.governanceProposals
    };
  }

  // Update proposal statuses based on current time
  updateProposalStatuses() {
    const currentTime = Date.now();
    
    this.governanceProposals = this.governanceProposals.map(proposal => {
      if (proposal.status === 'active' && currentTime > proposal.votingEndsAt) {
        // Voting period has ended, determine the result
        let maxVotes = 0;
        let winningOption = null;
        
        for (const [option, voteData] of Object.entries(proposal.votes)) {
          if (voteData.count > maxVotes) {
            maxVotes = voteData.count;
            winningOption = option;
          }
        }
        
        proposal.status = 'passed';
        proposal.result = winningOption;
      }
      
      if (proposal.status === 'passed' && currentTime > proposal.executionTime) {
        proposal.status = 'executed';
      }
      
      return proposal;
    });
  }

  // Check if user has access to premium features
  async hasPremiumAccess(walletAddress) {
    try {
      const balance = await this.getBalance(walletAddress);
      return balance >= PREMIUM_FEATURES_THRESHOLD;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return false;
    }
  }

  // Utility methods
  async getTokenInfo() {
    return {
      address: this.mint ? this.mint.toString() : NEW_EMBAI_ADDRESS,
      isLive: this.isLive,
      features: {
        burning: true,
        staking: true,
        governance: true,
        tradingFeeDiscount: TRADING_FEE_DISCOUNT,
        burnPercentage: BURN_PERCENTAGE,
        premiumFeaturesThreshold: PREMIUM_FEATURES_THRESHOLD,
        stakingRewardRate: STAKING_REWARD_RATE,
        graduationThreshold: GRADUATION_TRADE_THRESHOLD,
      },
      config: TOKEN_CONFIG,
      embConfig: EMB_TOKEN_CONFIG,
      distribution: TOKEN_DISTRIBUTION,
      governance: GOVERNANCE_CONFIG,
      statistics: {
        totalBurned: this.burnedTokens,
        totalStaked: Object.values(this.stakedTokens).reduce((sum, stakes) => 
          sum + stakes.reduce((stakeSum, stake) => stakeSum + stake.amount, 0), 0),
        activeProposals: this.governanceProposals.filter(p => p.status === 'active').length,
        paperTradersCount: Object.keys(this.paperTradingUsers).length,
        graduatedTradersCount: this.migratedUsers.size,
      },
      migrationBonus: MIGRATION_BONUS_RATE
    };
  }
}

// Export constants
export {
  NEW_EMBAI_ADDRESS,
  TRADING_FEE_DISCOUNT,
  BURN_PERCENTAGE,
  PREMIUM_FEATURES_THRESHOLD,
  STAKING_REWARD_RATE,
  GRADUATION_TRADE_THRESHOLD,
  TOKEN_CONFIG,
  EMB_TOKEN_CONFIG,
  TOKEN_DISTRIBUTION,
  GOVERNANCE_CONFIG,
  MIGRATION_BONUS_RATE
};

// Export the class as default
export default EMBAITokenManager;