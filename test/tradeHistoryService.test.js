import tradeHistoryService from '../lib/tradeHistoryService';
import { Connection, PublicKey } from '@solana/web3.js';
import solanaLogger from '../lib/solanaLogger';

// Mock dependencies
jest.mock('@solana/web3.js', () => {
  const originalModule = jest.requireActual('@solana/web3.js');
  
  return {
    __esModule: true,
    ...originalModule,
    Connection: jest.fn().mockImplementation(() => ({
      getSignaturesForAddress: jest.fn().mockResolvedValue([
        {
          signature: 'mock-signature-1',
          blockTime: Date.now() / 1000 - 3600 // 1 hour ago
        },
        {
          signature: 'mock-signature-2',
          blockTime: Date.now() / 1000 - 7200 // 2 hours ago
        }
      ]),
      getParsedTransaction: jest.fn().mockImplementation((signature) => {
        // Return different mock data based on signature
        if (signature === 'mock-signature-1') {
          return {
            meta: {
              err: null,
              preTokenBalances: [
                {
                  owner: 'test-wallet',
                  mint: 'So11111111111111111111111111111111111111112',
                  uiTokenAmount: { uiAmount: 10 }
                },
                {
                  owner: 'test-wallet',
                  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  uiTokenAmount: { uiAmount: 100 }
                }
              ],
              postTokenBalances: [
                {
                  owner: 'test-wallet',
                  mint: 'So11111111111111111111111111111111111111112',
                  uiTokenAmount: { uiAmount: 9 }
                },
                {
                  owner: 'test-wallet',
                  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  uiTokenAmount: { uiAmount: 120 }
                }
              ]
            },
            transaction: {
              message: {
                instructions: [
                  {
                    programId: {
                      toString: () => 'JUP3c2Uh3WA4Ng34jGAkJVCEDc2NNiPLj3xKpVLr8Rtc'
                    }
                  }
                ]
              }
            }
          };
        } else {
          return {
            meta: {
              err: null,
              preTokenBalances: [
                {
                  owner: 'test-wallet',
                  mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                  uiTokenAmount: { uiAmount: 50 }
                },
                {
                  owner: 'test-wallet',
                  mint: 'So11111111111111111111111111111111111111112',
                  uiTokenAmount: { uiAmount: 2 }
                }
              ],
              postTokenBalances: [
                {
                  owner: 'test-wallet',
                  mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                  uiTokenAmount: { uiAmount: 40 }
                },
                {
                  owner: 'test-wallet',
                  mint: 'So11111111111111111111111111111111111111112',
                  uiTokenAmount: { uiAmount: 2.2 }
                }
              ]
            },
            transaction: {
              message: {
                instructions: [
                  {
                    programId: {
                      toString: () => 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'
                    }
                  }
                ]
              }
            }
          };
        }
      })
    })),
    PublicKey: jest.fn().mockImplementation((address) => ({
      toString: () => address
    }))
  };
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn().mockImplementation((key) => {
      if (key === 'connected_wallets') {
        return JSON.stringify(['test-wallet']);
      }
      if (key === 'tradeforce_trades') {
        return JSON.stringify([
          {
            id: 'existing-trade',
            signature: 'existing-signature',
            timestamp: new Date().toISOString(),
            symbol: 'SOL',
            amount: 1,
            price: 100,
            profit: 5
          }
        ]);
      }
      return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  writable: true
});

describe('TradeHistoryService with Solana Integration', () => {
  let originalConsole;
  
  beforeAll(() => {
    // Suppress console output during tests
    originalConsole = { ...console };
    console.info = jest.fn();
    console.debug = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    // Mock the performance API if not available in test environment
    if (typeof performance === 'undefined') {
      global.performance = {
        now: jest.fn().mockReturnValue(Date.now())
      };
    }
  });
  
  afterAll(() => {
    // Restore console
    console = originalConsole;
  });
  
  beforeEach(() => {
    // Reset service state between tests
    tradeHistoryService.trades = [];
    tradeHistoryService.isInitialized = false;
    tradeHistoryService.connection = null;
  });
  
  test('should initialize with Solana connection', async () => {
    await tradeHistoryService.initialize();
    
    expect(tradeHistoryService.isInitialized).toBe(true);
    expect(Connection).toHaveBeenCalledWith('https://api.devnet.solana.com', 'confirmed');
    expect(tradeHistoryService.connection).toBeDefined();
  });
  
  test('should load trades from localStorage on initialization', async () => {
    await tradeHistoryService.initialize();
    
    expect(window.localStorage.getItem).toHaveBeenCalledWith('tradeforce_trades');
    expect(tradeHistoryService.trades.length).toBe(1);
    expect(tradeHistoryService.trades[0].id).toBe('existing-trade');
  });
  
  test('should fetch new trades from Solana devnet', async () => {
    await tradeHistoryService.initialize();
    await tradeHistoryService.getAllTrades(true);
    
    // Should fetch connected wallet from localStorage
    expect(window.localStorage.getItem).toHaveBeenCalledWith('connected_wallets');
    
    // Should make Solana API calls
    expect(tradeHistoryService.connection.getSignaturesForAddress).toHaveBeenCalled();
    expect(tradeHistoryService.connection.getParsedTransaction).toHaveBeenCalledTimes(2);
    
    // Should add the new trades (1 existing + 2 new)
    expect(tradeHistoryService.trades.length).toBeGreaterThanOrEqual(3);
  });
  
  test('should identify swap transactions correctly', async () => {
    await tradeHistoryService.initialize();
    
    const jupiterTx = {
      transaction: {
        message: {
          instructions: [
            {
              programId: { toString: () => 'JUP3c2Uh3WA4Ng34jGAkJVCEDc2NNiPLj3xKpVLr8Rtc' }
            }
          ]
        }
      }
    };
    
    const normalTx = {
      transaction: {
        message: {
          instructions: [
            {
              programId: { toString: () => 'SomeOtherProgramId' }
            }
          ]
        }
      }
    };
    
    expect(tradeHistoryService.isSwapTransaction(jupiterTx)).toBe(true);
    expect(tradeHistoryService.isSwapTransaction(normalTx)).toBe(false);
  });
  
  test('should extract trade details from transaction', async () => {
    await tradeHistoryService.initialize();
    
    const mockTx = {
      meta: {
        preTokenBalances: [
          {
            owner: 'test-wallet',
            mint: 'So11111111111111111111111111111111111111112',
            uiTokenAmount: { uiAmount: 10 }
          },
          {
            owner: 'test-wallet',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            uiTokenAmount: { uiAmount: 100 }
          }
        ],
        postTokenBalances: [
          {
            owner: 'test-wallet',
            mint: 'So11111111111111111111111111111111111111112',
            uiTokenAmount: { uiAmount: 9 }
          },
          {
            owner: 'test-wallet',
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            uiTokenAmount: { uiAmount: 120 }
          }
        ]
      }
    };
    
    const mockSigInfo = { signature: 'test-sig', blockTime: Date.now() / 1000 };
    const tradeDetails = tradeHistoryService.extractTradeDetails(mockTx, 'test-wallet', mockSigInfo);
    
    expect(tradeDetails).toBeDefined();
    expect(tradeDetails.token).toBe('SOL');
    expect(tradeDetails.inputToken).toBe('SOL');
    expect(tradeDetails.outputToken).toBe('USDC');
    expect(tradeDetails.amount).toBe(20); // 120 - 100 USDC received
    expect(tradeDetails.action).toBe('buy');
    expect(tradeDetails.status).toBe('completed');
  });
  
  test('should get performance metrics', async () => {
    await tradeHistoryService.initialize();
    
    // Add some test trades
    tradeHistoryService.trades = [
      { id: 'trade1', profit: 10, status: 'completed', token: 'SOL' },
      { id: 'trade2', profit: -5, status: 'completed', token: 'JUP' },
      { id: 'trade3', profit: 15, status: 'completed', token: 'SOL' }
    ];
    
    const metrics = tradeHistoryService.getPerformanceMetrics();
    
    expect(metrics.totalTrades).toBe(3);
    expect(metrics.winRate).toBe(2/3 * 100);
    expect(metrics.averagePnl).toBe((10 - 5 + 15) / 3);
    expect(metrics.solPnL).toBe(25); // 10 + 15
  });
  
  test('should use solanaLogger for performance tracking', async () => {
    // Spy on solanaLogger methods
    const recordMetricSpy = jest.spyOn(solanaLogger, 'recordMetric');
    const txStartSpy = jest.spyOn(solanaLogger, 'txStart');
    const txEndSpy = jest.spyOn(solanaLogger, 'txEnd');
    
    await tradeHistoryService.initialize();
    await tradeHistoryService.fetchSolanaTrades();
    
    expect(recordMetricSpy).toHaveBeenCalled();
    expect(txStartSpy).toHaveBeenCalled();
    expect(txEndSpy).toHaveBeenCalled();
  });
});
