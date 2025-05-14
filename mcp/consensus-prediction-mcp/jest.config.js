module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  collectCoverageFrom: [
    'utils/**/*.js',
    'services/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }]
  ],
  testTimeout: 10000, // 10 second timeout for tests
  // Allow for module mocking and spying
  resetMocks: false,
  restoreMocks: true,
  setupFilesAfterEnv: ['./test/setup.js']
};
