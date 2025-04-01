export const TUTORIALS = [
  {
    id: 'trading-basics',
    title: 'Introduction to Trading',
    description: 'Learn the fundamentals of trading, including basic concepts and terminology.',
    duration: '30 mins',
    difficulty: 'beginner',
    xpReward: 100,
    chapters: [
      {
        title: 'Understanding Markets',
        content: `
          Trading is the process of buying and selling financial instruments like stocks, bonds, 
          cryptocurrencies, or commodities. Before you start trading, it's essential to understand 
          how markets work and what influences price movements.

          Key concepts:
          - Supply and Demand
          - Market Participants
          - Price Action
          - Trading Volume
        `,
        quiz: [
          {
            question: 'What primarily determines asset prices in a market?',
            options: [
              'Government regulations',
              'Supply and demand',
              'Time of day',
              'Market color scheme'
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        title: 'Types of Analysis',
        content: `
          Traders use different types of analysis to make informed decisions:

          1. Technical Analysis
          - Chart patterns
          - Technical indicators
          - Price action

          2. Fundamental Analysis
          - Economic indicators
          - Company financials
          - News and events
        `,
        quiz: [
          {
            question: 'Which type of analysis focuses on chart patterns?',
            options: [
              'Fundamental Analysis',
              'Technical Analysis',
              'Sentimental Analysis',
              'Random Analysis'
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk Management Essentials',
    description: 'Learn how to protect your capital and manage risk effectively.',
    duration: '45 mins',
    difficulty: 'intermediate',
    xpReward: 150,
    chapters: [
      {
        title: 'Position Sizing',
        content: `
          Position sizing is crucial for risk management. It helps you determine how much of your 
          capital to risk on each trade.

          Key concepts:
          - Percentage-based position sizing
          - Fixed position sizing
          - Risk per trade
          - Portfolio allocation
        `,
        quiz: [
          {
            question: 'What is the recommended maximum risk per trade?',
            options: [
              '50% of your capital',
              '25% of your capital',
              '1-2% of your capital',
              '10% of your capital'
            ],
            correctAnswer: 2
          }
        ]
      },
      {
        title: 'Stop Loss Strategies',
        content: `
          Stop losses are orders that automatically close your position when it reaches a certain price, 
          helping you limit potential losses.

          Types of stop losses:
          - Fixed stop loss
          - Trailing stop loss
          - Time-based stops
          - Volatility-based stops
        `,
        quiz: [
          {
            question: 'Which type of stop loss adjusts automatically as price moves in your favor?',
            options: [
              'Fixed stop loss',
              'Trailing stop loss',
              'Time-based stop',
              'Mental stop loss'
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  }
];

export const ACHIEVEMENTS = {
  'tutorial-completion': {
    id: 'tutorial-completion',
    title: 'Tutorial Master',
    description: 'Complete all available tutorials',
    xpReward: 250,
    icon: '🎓'
  },
  'quiz-master': {
    id: 'quiz-master',
    title: 'Quiz Master',
    description: 'Score 100% on all tutorial quizzes',
    xpReward: 150,
    icon: '📝'
  },
  'fast-learner': {
    id: 'fast-learner',
    title: 'Fast Learner',
    description: 'Complete 3 tutorials in one day',
    xpReward: 100,
    icon: '⚡'
  }
};

export const XP_LEVELS = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 1750,
  7: 2750,
  8: 4000,
  9: 5500,
  10: 7500,
  // Add more levels as needed
};

export const RANKS = [
  {
    name: 'Novice Trader',
    minLevel: 1,
    color: 'gray'
  },
  {
    name: 'Bronze Trader',
    minLevel: 5,
    color: 'bronze'
  },
  {
    name: 'Silver Trader',
    minLevel: 10,
    color: 'silver'
  },
  {
    name: 'Gold Trader',
    minLevel: 15,
    color: 'gold'
  },
  {
    name: 'Platinum Trader',
    minLevel: 20,
    color: 'platinum'
  },
  {
    name: 'Diamond Trader',
    minLevel: 25,
    color: 'diamond'
  },
  {
    name: 'Master Trader',
    minLevel: 30,
    color: 'master'
  }
];