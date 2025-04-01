describe('EmbassyTrade Trading Flow', () => {
  beforeEach(() => {
    // Visit the home page before each test
    cy.visit('/');
    
    // Mock wallet connection since we can't interact with real wallets in tests
    cy.window().then(win => {
      // Mock local storage to simulate connected wallet
      win.localStorage.setItem('walletConnected', 'true');
      
      // Mock wallet public key in window object
      win.solanaWallet = {
        publicKey: '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7Eo6mjrPBBJN',
        isConnected: true
      };
    });
    
    // Intercept API requests and provide mock responses
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
    
    cy.intercept('GET', '/api/user/balance', {
      statusCode: 200,
      body: {
        embBalance: 50
      }
    }).as('getBalance');
    
    // Intercept Shyft API calls for Solana fee data
    cy.intercept('POST', 'https://programs.shyft.to/v0/graphql/*', {
      statusCode: 200,
      body: {
        data: {
          feeEstimate: {
            averageFee: 5000 // 5000 lamports = 0.000005 SOL
          }
        }
      }
    }).as('getSolanaFee');
    
    // Reload the page to apply our mocks
    cy.reload();
  });

  it('should allow selecting a coin and executing a trade', () => {
    // Verify the page has loaded with our components
    cy.contains('h2', 'Trading Simulator').should('be.visible');
    cy.contains('EMB Balance').should('be.visible');
    
    // Select coin from dropdown
    cy.get('#coin-select').should('be.visible').select('EMB');
    cy.get('#coin-select').should('have.value', 'EMB');
    
    // Enter trade amount 
    cy.get('input[type="number"]').type('5');
    
    // Execute a buy trade
    cy.contains('button', 'Buy').click();
    
    // Wait for trade to process
    cy.wait('@getSignals');
    
    // Verify trade success
    cy.contains('Win Rate').should('be.visible');
    
    // The TradingSimulator updates its stats after a successful trade
    // so we should see a non-zero win rate
    cy.get('.text-2xl').contains('%').should('not.contain', '0.0%');
  });

  it('should show reward info for non-EMB coins', () => {
    // Select a non-EMB coin
    cy.get('#coin-select').select('SOL');
    
    // Check for reward info text
    cy.contains('Trading with $EMB earns you additional rewards!').should('be.visible');
    
    // Change to EMB
    cy.get('#coin-select').select('EMB');
    
    // Verify reward info is gone
    cy.contains('Trading with $EMB earns you additional rewards!').should('not.exist');
  });

  it('should disable trading with insufficient balance', () => {
    // Change the balance intercept to return low balance
    cy.intercept('GET', '/api/user/balance', {
      statusCode: 200,
      body: {
        embBalance: 0.01
      }
    }).as('getLowBalance');
    
    // Reload to apply the new mock
    cy.reload();
    
    // Verify warning appears
    cy.contains('Insufficient EMB balance').should('be.visible');
    
    // Verify buy button is disabled
    cy.contains('button', 'Buy').should('be.disabled');
  });

  it('should display and apply Solana fees during trading', () => {
    // Navigate to dashboard tab to check Paper Trading Balances section
    cy.contains('button', 'Dashboard').click();
    
    // Check if Paper Trading Balances section exists with Solana fee info
    cy.contains('h2', 'Paper Trading Balances').should('be.visible');
    cy.contains('Current Solana Transaction Fee:').should('be.visible');
    cy.contains('0.000005 SOL').should('be.visible');
    
    // Record initial SOL balance
    let initialSolBalance;
    cy.contains('$SOL')
      .parent()
      .find('p.text-2xl')
      .invoke('text')
      .then(text => {
        initialSolBalance = parseFloat(text);
      });
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Verify fee information is shown in Trading Simulator
    cy.contains('Network Fee').should('be.visible');
    cy.contains('SOL Fee: 0.000005').should('be.visible');
    
    // Select SOL coin for trading
    cy.get('#coin-select').select('SOL');
    
    // Enter trade amount
    cy.get('input[type="number"]').clear().type('10');
    
    // Execute trade
    cy.contains('button', 'Buy').click();
    
    // Verify trade notification includes Solana fee
    cy.contains('Trade Executed').should('be.visible');
    cy.contains('Solana Fee: 0.000005 SOL').should('be.visible');
    
    // Go back to Dashboard to verify balance update
    cy.contains('button', 'Dashboard').click();
    
    // Check that SOL balance has been reduced by the trade amount plus Solana fee
    cy.contains('$SOL')
      .parent()
      .find('p.text-2xl')
      .invoke('text')
      .then(text => {
        const newBalance = parseFloat(text);
        // Check that new balance reflects fee deduction
        // The exact calculation depends on your app's trade simulation logic
        // but should be less than the initial balance by at least the fee amount
        expect(newBalance).to.be.lessThan(initialSolBalance);
      });
  });

  it('should handle Solana fee API failures gracefully', () => {
    // Mock a failed Solana fee API call
    cy.intercept('POST', 'https://programs.shyft.to/v0/graphql/*', {
      statusCode: 500,
      body: 'Server Error'
    }).as('failedSolanaFeeRequest');
    
    // Reload page to trigger the failed request
    cy.reload();
    
    // Verify the app still loads and shows default fee
    cy.contains('h2', 'Trading Simulator').should('be.visible');
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Check that a default fee is still displayed
    cy.contains('SOL Fee:').should('be.visible');
    
    // Verify trading still works despite API failure
    cy.get('input[type="number"]').clear().type('5');
    cy.contains('button', 'Buy').click();
    cy.contains('Trade Executed').should('be.visible');
  });
});