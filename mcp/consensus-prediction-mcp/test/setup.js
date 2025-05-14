/**
 * Jest Setup File
 * 
 * This file is executed before each test file runs.
 * Use this for global test setup, mocks, and configuration.
 */

// Increase test timeout for integration tests
jest.setTimeout(15000);

// Mock logger to avoid cluttering test output
jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Global beforeEach hook
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});
