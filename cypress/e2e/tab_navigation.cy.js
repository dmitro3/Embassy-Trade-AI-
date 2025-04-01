describe('Tab Navigation', () => {
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
    });
    
    // Intercept common API calls
    cy.intercept('GET', '/api/user/balance', {
      statusCode: 200,
      body: {
        embBalance: 50,
        solBalance: 10,
        usdcBalance: 100,
        jitoBalance: 5
      }
    }).as('getBalances');
    
    cy.intercept('GET', '/api/trade-history', {
      statusCode: 200,
      body: {
        trades: [
          { id: '1', coin: 'SOL', type: 'buy', amount: 2, price: 100, total: 200, timestamp: Date.now() - 86400000 },
          { id: '2', coin: 'EMB', type: 'sell', amount: 10, price: 2, total: 20, timestamp: Date.now() - 3600000 }
        ]
      }
    }).as('getTradeHistory');
    
    cy.intercept('GET', '/api/portfolio', {
      statusCode: 200,
      body: {
        holdings: [
          { coin: 'SOL', amount: 5, value: 500 },
          { coin: 'EMB', amount: 100, value: 200 },
          { coin: 'USDC', amount: 200, value: 200 },
          { coin: 'JITO', amount: 10, value: 150 }
        ],
        totalValue: 1050
      }
    }).as('getPortfolio');
    
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

    // Reload to apply our mocks
    cy.reload();
  });
  
  it('should navigate through all tabs correctly', () => {
    // Verify we start on the dashboard
    cy.contains('h1', 'Dashboard').should('be.visible');
    cy.url().should('include', '/');
    
    // Check dashboard content
    cy.contains('Portfolio Overview').should('be.visible');
    cy.contains('Recent Trades').should('be.visible');
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    cy.url().should('include', '/trade');
    cy.contains('Trading Simulator').should('be.visible');
    cy.get('#coin-select').should('be.visible');
    cy.get('button').contains(/Buy|Sell/).should('be.visible');
    
    // Navigate to P&L tab
    cy.contains('button', 'P&L').click();
    cy.url().should('include', '/pnl');
    cy.contains('Profit & Loss').should('be.visible');
    cy.contains('Trade History').should('be.visible');
    cy.contains('button', 'Withdraw Funds').should('be.visible');
    
    // Navigate to Portfolio tab
    cy.contains('button', 'Portfolio').click();
    cy.url().should('include', '/portfolio');
    cy.contains('Portfolio Tracker').should('be.visible');
    cy.contains('Holdings').should('be.visible');
    cy.get('.portfolio-chart').should('be.visible');
    
    // Navigate to Learn tab
    cy.contains('button', 'Learn').click();
    cy.url().should('include', '/learn');
    cy.contains('Learning Hub').should('be.visible');
    cy.contains('Interactive Tutorials').should('be.visible');
  });
  
  it('should load tab content without errors', () => {
    // Create a spy on console.error
    cy.window().then((win) => {
      cy.spy(win.console, 'error').as('consoleError');
    });
    
    // Navigate through each tab and check for errors
    const tabs = ['Dashboard', 'Trade', 'P&L', 'Portfolio', 'Learn'];
    
    tabs.forEach(tab => {
      // Click the tab
      cy.contains('button', tab).click();
      
      // Wait for tab content to load
      cy.contains(tab).should('be.visible');
      
      // Wait for any potential API requests to complete
      cy.wait(500);
      
      // Check that no console errors were logged
      cy.get('@consoleError').should('not.be.called');
    });
  });
  
  it('should persist active tab on page reload', () => {
    // Navigate to P&L tab
    cy.contains('button', 'P&L').click();
    cy.url().should('include', '/pnl');
    cy.contains('Profit & Loss').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify we're still on P&L tab after reload
    cy.contains('Profit & Loss').should('be.visible');
    cy.url().should('include', '/pnl');
    cy.get('button').contains('P&L').should('have.class', 'active');
  });
  
  it('should maintain data when switching between tabs', () => {
    // Go to Trade tab and select a coin
    cy.contains('button', 'Trade').click();
    cy.get('#coin-select').select('JITO');
    
    // Go to P&L tab
    cy.contains('button', 'P&L').click();
    cy.contains('Profit & Loss').should('be.visible');
    
    // Go back to Trade tab and verify coin selection is maintained
    cy.contains('button', 'Trade').click();
    cy.get('#coin-select').should('have.value', 'JITO');
  });
  
  it('should display correct content for mobile view', () => {
    // Set viewport to mobile size
    cy.viewport('iphone-x');
    
    // Check that hamburger menu is visible
    cy.get('.mobile-menu-button').should('be.visible');
    
    // Open mobile menu
    cy.get('.mobile-menu-button').click();
    
    // Navigate through tabs using mobile menu
    cy.contains('Trade').click();
    cy.url().should('include', '/trade');
    
    // Check that trading interface is properly sized for mobile
    cy.get('#coin-select').should('be.visible');
    cy.get('input[type="number"]').should('be.visible');
    
    // Trading controls should fit within viewport
    cy.get('button').contains(/Buy|Sell/).should('be.visible');
    
    // Restore viewport
    cy.viewport(1280, 720);
  });
});