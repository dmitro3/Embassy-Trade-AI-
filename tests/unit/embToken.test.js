import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { EMBTokenManager, EMB_TOKEN_ADDRESS } from '@/lib/embToken';

// Mock the Solana web3.js module
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getRecentBlockhash: jest.fn().mockResolvedValue({ blockhash: 'mock-blockhash' }),
  })),
  PublicKey: jest.fn().mockImplementation((address) => ({
    toString: () => address,
    toBytes: () => new Uint8Array([1, 2, 3, 4]),
  })),
}));

// Mock the SPL Token module
jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn().mockResolvedValue({
    toString: () => 'mock-token-account',
    toBytes: () => new Uint8Array([5, 6, 7, 8]),
  }),
  getAccount: jest.fn(),
  TOKEN_PROGRAM_ID: 'mock-token-program-id',
}));

const { getAccount } = require('@solana/spl-token');

describe('EMBTokenManager', () => {
  let embTokenManager;
  const mockWalletAddress = 'mockWalletAddress123456789';
  
  beforeEach(() => {
    jest.clearAllMocks();
    embTokenManager = new EMBTokenManager();
  });
  
  test('initializes with correct token mint address', () => {
    expect(embTokenManager.tokenMint.toString()).toBe(EMB_TOKEN_ADDRESS);
  });
  
  test('getBalance returns correct amount for existing token account', async () => {
    // Mock token account with a balance of 500 EMB (500 * 1e9 lamports)
    getAccount.mockResolvedValueOnce({
      amount: BigInt(500 * 1e9),
      mint: EMB_TOKEN_ADDRESS,
    });
    
    const balance = await embTokenManager.getBalance(mockWalletAddress);
    
    expect(getAccount).toHaveBeenCalled();
    expect(balance).toBe(500); // Should return 500 EMB after adjusting for decimals
  });
  
  test('getBalance handles non-existent token account by returning test balance', async () => {
    // Mock token account not found error
    const tokenError = new Error('TokenAccountNotFoundError');
    tokenError.name = 'TokenAccountNotFoundError';
    getAccount.mockRejectedValueOnce(tokenError);
    
    const balance = await embTokenManager.getBalance(mockWalletAddress);
    
    expect(getAccount).toHaveBeenCalled();
    expect(balance).toBe(100); // Should return the simulated balance for testing
  });
  
  test('getBalance returns 0 when no wallet is provided', async () => {
    const balance = await embTokenManager.getBalance(null);
    
    expect(balance).toBe(0);
    // Should not call Solana API if no wallet is provided
    expect(getAccount).not.toHaveBeenCalled();
  });
  
  test('getBalance handles general errors', async () => {
    // Mock general error
    getAccount.mockRejectedValueOnce(new Error('Network error'));
    
    const balance = await embTokenManager.getBalance(mockWalletAddress);
    
    expect(getAccount).toHaveBeenCalled();
    expect(balance).toBe(0); // Should return 0 on error
  });
  
  test('validateTradeFees returns correct status with sufficient balance', async () => {
    // Mock token account with sufficient balance
    getAccount.mockResolvedValueOnce({
      amount: BigInt(1 * 1e9), // 1 EMB
      mint: EMB_TOKEN_ADDRESS,
    });
    
    const result = await embTokenManager.validateTradeFees(mockWalletAddress);
    
    expect(result).toEqual({
      canTrade: true,
      tradeFee: 0.1,
      balance: 1
    });
  });
  
  test('validateTradeFees returns correct status with insufficient balance', async () => {
    // Mock token account with insufficient balance
    getAccount.mockResolvedValueOnce({
      amount: BigInt(0.05 * 1e9), // 0.05 EMB
      mint: EMB_TOKEN_ADDRESS,
    });
    
    const result = await embTokenManager.validateTradeFees(mockWalletAddress);
    
    expect(result).toEqual({
      canTrade: false,
      tradeFee: 0.1,
      balance: 0.05
    });
  });
  
  test('validateTradeFees handles missing wallet address', async () => {
    const result = await embTokenManager.validateTradeFees(null);
    
    expect(result).toEqual({
      canTrade: false,
      tradeFee: 0.1,
      balance: 0,
      error: 'No wallet address provided'
    });
  });
  
  test('deductTradeFee succeeds when balance is sufficient', async () => {
    // Mock validate trade fees to return sufficient balance
    jest.spyOn(embTokenManager, 'validateTradeFees').mockResolvedValueOnce({
      canTrade: true,
      tradeFee: 0.1,
      balance: 1
    });
    
    const result = await embTokenManager.deductTradeFee(mockWalletAddress);
    
    expect(embTokenManager.validateTradeFees).toHaveBeenCalledWith(mockWalletAddress);
    expect(result).toBe(true);
  });
  
  test('deductTradeFee throws error when balance is insufficient', async () => {
    // Mock validate trade fees to return insufficient balance
    jest.spyOn(embTokenManager, 'validateTradeFees').mockResolvedValueOnce({
      canTrade: false,
      tradeFee: 0.1,
      balance: 0.05
    });
    
    await expect(embTokenManager.deductTradeFee(mockWalletAddress))
      .rejects
      .toThrow('Insufficient EMB balance. Required: 0.1 EMB');
      
    expect(embTokenManager.validateTradeFees).toHaveBeenCalledWith(mockWalletAddress);
  });
  
  test('hasTokenAccount returns true when token account exists', async () => {
    getAccount.mockResolvedValueOnce({
      amount: BigInt(100 * 1e9),
      mint: EMB_TOKEN_ADDRESS,
    });
    
    const result = await embTokenManager.hasTokenAccount(mockWalletAddress);
    
    expect(getAccount).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  test('hasTokenAccount returns false when token account does not exist', async () => {
    const tokenError = new Error('TokenAccountNotFoundError');
    tokenError.name = 'TokenAccountNotFoundError';
    getAccount.mockRejectedValueOnce(tokenError);
    
    const result = await embTokenManager.hasTokenAccount(mockWalletAddress);
    
    expect(getAccount).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});