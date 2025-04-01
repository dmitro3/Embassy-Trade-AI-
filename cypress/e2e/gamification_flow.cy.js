describe('Gamification Flow', () => {
  beforeEach(() => {
    // Visit the app and mock wallet connection
    cy.visit('http://localhost:3000');
    cy.window().then(win => {
      // Mock localStorage for wallet connection
      win.localStorage.setItem('walletConnected', 'true');
      
      // Mock wallet public key
      win.solanaWallet = {
        publicKey: '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7Eo6mjrPBBJN',
        isConnected: true
      };
      
      // Reset XP for consistent testing
      win.localStorage.setItem('embTrade_xp', '0');
      win.localStorage.setItem('embTrade_level', '1');
      win.localStorage.setItem('embTrade_badges', '[]');
    });
    
    // Intercept API calls
    cy.intercept('GET', '/api/user/balance', {
      statusCode: 200,
      body: {
        embBalance: 50,
        solBalance: 10,
        usdcBalance: 100,
        jitoBalance: 5
      }
    }).as('getBalances');
    
    cy.intercept('GET', '/api/trade-signals', {
      statusCode: 200,
      body: {
        signals: [{
          name: 'MACD Signal',
          description: 'Moving Average Convergence Divergence',
          trend: 'up',
          confidence: 0.85,
          price: 100,
          strategy: 'Technical Analysis'
        }]
      }
    }).as('getSignals');
    
    cy.intercept('POST', '/api/execute-trade', {
      statusCode: 200,
      body: {
        success: true,
        tradeId: 'mock-trade-id',
        amount: 5,
        price: 100,
        type: 'buy',
        timestamp: Date.now()
      }
    }).as('executeTrade');
    
    // Reload to apply our mocks
    cy.reload();
  });
  
  it('should earn +5 XP for trading with EMB', () => {
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select EMB coin
    cy.get('#coin-select').select('EMB');
    
    // Enter trade amount
    cy.get('input[type="number"]').first().type('5');
    
    // Execute trade
    cy.contains('button', 'Buy').click();
    
    // Wait for trade to process
    cy.wait('@executeTrade');
    
    // Verify XP notification appears
    cy.contains('+5 XP for Trading with $EMB').should('be.visible');
    
    // Check that XP progress is updated
    cy.get('#xp-progress').should('have.attr', 'value').and('be.greaterThan', 0);
  });
  
  it('should earn +15 XP for swapping to EMB', () => {
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select SOL coin
    cy.get('#coin-select').select('SOL');
    
    // Intercept the swap API call
    cy.intercept('POST', '/api/swap', {
      statusCode: 200,
      body: {
        success: true,
        fromCoin: 'SOL',
        toCoin: 'EMB',
        amount: 5,
        received: 5,
        timestamp: Date.now()
      }
    }).as('executeSwap');
    
    // Find and click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Enter swap amount
    cy.get('input[placeholder*="Amount"]').type('5');
    
    // Confirm swap
    cy.contains('button', 'Confirm Swap').click();
    
    // Wait for swap to process
    cy.wait('@executeSwap');
    
    // Verify XP notification appears
    cy.contains('+15 XP for Swapping to $EMB').should('be.visible');
    
    // Check that XP progress is updated with more XP than trading
    cy.get('#xp-progress').should('have.attr', 'value').and('be.greaterThan', 5);
  });
  
  it('should level up and award badge after earning enough XP', () => {
    // Set initial XP close to level threshold
    cy.window().then(win => {
      // Set XP to 95 (5 XP away from level 2)
      win.localStorage.setItem('embTrade_xp', '95');
      win.dispatchEvent(new Event('storage')); // Trigger storage event to update app state
    });
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select EMB coin
    cy.get('#coin-select').select('EMB');
    
    // Enter trade amount
    cy.get('input[type="number"]').first().type('5');
    
    // Execute trade to earn +5 XP and trigger level up
    cy.contains('button', 'Buy').click();
    
    // Wait for trade to process
    cy.wait('@executeTrade');
    
    // Verify level up notification appears
    cy.contains('Congratulations! You reached level 2').should('be.visible');
    
    // Verify badge award notification
    cy.contains('New badge unlocked').should('be.visible');
    
    // Verify badge is displayed in profile or rewards section
    cy.contains('Badges').click({ force: true });
    cy.get('.badge-item').should('be.visible');
  });
  
  it('should track XP progress across sessions', () => {
    // Execute a trade to earn XP
    cy.contains('button', 'Trade').click();
    cy.get('#coin-select').select('EMB');
    cy.get('input[type="number"]').first().type('5');
    cy.contains('button', 'Buy').click();
    cy.wait('@executeTrade');
    
    // Store the current XP value
    let initialXpValue;
    cy.get('#xp-progress').invoke('attr', 'value').then((xpValue) => {
      initialXpValue = parseInt(xpValue);
      
      // Simulate page reload / new session
      cy.reload();
      
      // Execute another trade
      cy.contains('button', 'Trade').click();
      cy.get('#coin-select').select('EMB');
      cy.get('input[type="number"]').first().type('5');
      cy.contains('button', 'Buy').click();
      cy.wait('@executeTrade');
      
      // Verify XP has increased from previous value
      cy.get('#xp-progress').invoke('attr', 'value').should('be.greaterThan', initialXpValue);
    });
  });
});