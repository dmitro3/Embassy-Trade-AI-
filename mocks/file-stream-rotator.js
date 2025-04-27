/**
 * Mock implementation of file-stream-rotator for browser environments
 */

// Mock for file-stream-rotator
module.exports = {
  getStream: () => ({
    write: (message) => console.log('[Mock Log]', message),
    end: () => {},
    on: () => {},
  })
};