describe('Swap Flow', () => {
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
    
    // Intercept swap API
    cy.intercept('POST', '/api/swap', (req) => {
      // Extract parameters from request
      const { fromCoin, toCoin, amount } = req.body;
      
      // Mock successful swap response
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          fromCoin,
          toCoin,
          amount: parseFloat(amount),
          received: parseFloat(amount), // 1:1 swap rate for simplicity
          timestamp: Date.now()
        }
      });
      
      // Update balances after swap
      cy.intercept('GET', '/api/user/balance', {
        statusCode: 200,
        body: {
          embBalance: (fromCoin === 'EMB') ? 50 - parseFloat(amount) : 50 + parseFloat(amount),
          solBalance: (fromCoin === 'SOL') ? 10 - parseFloat(amount) : 10,
          usdcBalance: (fromCoin === 'USDC') ? 100 - parseFloat(amount) : 100,
          jitoBalance: (fromCoin === 'JITO') ? 5 - parseFloat(amount) : 5
        }
      }).as('updatedBalances');
    }).as('executeSwap');
    
    // Reload to apply our mocks
    cy.reload();
  });
  
  it('should swap SOL to EMB successfully', () => {
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select SOL coin
    cy.get('#coin-select').select('SOL');
    
    // Check initial balance
    cy.contains('SOL Balance').should('contain', '10');
    cy.contains('EMB Balance').should('contain', '50');
    
    // Click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Modal should open
    cy.contains('Swap SOL to EMB').should('be.visible');
    
    // Enter amount to swap
    cy.get('input[placeholder*="Amount"]').type('5');
    
    // Check swap preview
    cy.contains("You'll receive: 5 EMB").should('be.visible');
    
    // Execute swap
    cy.contains('button', 'Confirm Swap').click();
    
    // Wait for swap to process
    cy.wait('@executeSwap');
    cy.wait('@updatedBalances');
    
    // Verify success message
    cy.contains('Swap successful!').should('be.visible');
    
    // Check that balances are updated
    cy.contains('SOL Balance').should('contain', '5'); // 10 - 5
    cy.contains('EMB Balance').should('contain', '55'); // 50 + 5
    
    // Verify XP notification appears
    cy.contains('+15 XP for Swapping to $EMB').should('be.visible');
  });
  
  it('should swap USDC to EMB successfully', () => {
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select USDC coin
    cy.get('#coin-select').select('USDC');
    
    // Check initial balance
    cy.contains('USDC Balance').should('contain', '100');
    
    // Click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Modal should open
    cy.contains('Swap USDC to EMB').should('be.visible');
    
    // Enter amount to swap
    cy.get('input[placeholder*="Amount"]').type('20');
    
    // Execute swap
    cy.contains('button', 'Confirm Swap').click();
    
    // Wait for swap to process
    cy.wait('@executeSwap');
    cy.wait('@updatedBalances');
    
    // Check that balances are updated
    cy.contains('USDC Balance').should('contain', '80'); // 100 - 20
    cy.contains('EMB Balance').should('contain', '70'); // 50 + 20
  });
  
  it('should validate insufficient balance for swap', () => {
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select SOL coin
    cy.get('#coin-select').select('SOL');
    
    // Click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Enter amount larger than balance
    cy.get('input[placeholder*="Amount"]').type('15');
    
    // Try to execute swap
    cy.contains('button', 'Confirm Swap').click();
    
    // Verify error message
    cy.contains('Insufficient SOL balance').should('be.visible');
    
    // Swap should not be executed
    cy.get('@executeSwap.all').should('have.length', 0);
  });
  
  it('should show swap rate and estimated received amount', () => {
    // Mock a custom swap rate API
    cy.intercept('GET', '/api/swap-rate', {
      statusCode: 200,
      body: {
        rates: {
          'SOL/EMB': 2, // 1 SOL = 2 EMB
          'USDC/EMB': 1.5, // 1 USDC = 1.5 EMB
          'JITO/EMB': 3 // 1 JITO = 3 EMB
        }
      }
    }).as('getSwapRates');
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select SOL coin
    cy.get('#coin-select').select('SOL');
    
    // Click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Wait for swap rates to load
    cy.wait('@getSwapRates');
    
    // Verify swap rate is displayed
    cy.contains('1 SOL = 2 EMB').should('be.visible');
    
    // Enter swap amount
    cy.get('input[placeholder*="Amount"]').type('3');
    
    // Check estimated receive amount (3 SOL * 2 = 6 EMB)
    cy.contains("You'll receive: 6 EMB").should('be.visible');
    
    // Change to different coin
    cy.get('.close-button').click(); // Close modal
    cy.get('#coin-select').select('JITO');
    cy.contains('button', 'Swap to $EMB').click();
    
    // Wait for swap rates to load
    cy.wait('@getSwapRates');
    
    // Verify new swap rate is displayed
    cy.contains('1 JITO = 3 EMB').should('be.visible');
    
    // Enter swap amount
    cy.get('input[placeholder*="Amount"]').type('2');
    
    // Check estimated receive amount (2 JITO * 3 = 6 EMB)
    cy.contains("You'll receive: 6 EMB").should('be.visible');
  });
  
  it('should handle network errors gracefully', () => {
    // Intercept swap API with error
    cy.intercept('POST', '/api/swap', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Network error'
      }
    }).as('swapError');
    
    // Navigate to Trade tab
    cy.contains('button', 'Trade').click();
    
    // Select SOL coin
    cy.get('#coin-select').select('SOL');
    
    // Click the Swap to EMB button
    cy.contains('button', 'Swap to $EMB').click();
    
    // Enter amount
    cy.get('input[placeholder*="Amount"]').type('5');
    
    // Try to execute swap
    cy.contains('button', 'Confirm Swap').click();
    
    // Wait for error response
    cy.wait('@swapError');
    
    // Verify error message
    cy.contains('Swap failed: Network error').should('be.visible');
    
    // Balances should remain unchanged
    cy.contains('SOL Balance').should('contain', '10');
    cy.contains('EMB Balance').should('contain', '50');
    
    // No XP should be awarded
    cy.contains('+15 XP').should('not.exist');
  });
});