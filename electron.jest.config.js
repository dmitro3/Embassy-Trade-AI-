module.exports = {
  // Similar to standard Jest config but with Electron-specific settings
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/electron'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env'] }]
  },
  // Setup files for Electron testing
  setupFilesAfterEnv: ['<rootDir>/tests/electron/setup.js'],
  // Report configuration
  reporters: ['default', 'jest-junit'],
  coverageDirectory: '<rootDir>/test-reports/electron-coverage',
  collectCoverageFrom: [
    'main.js',
    'preload.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  testTimeout: 30000, // Longer timeout for Electron tests
};