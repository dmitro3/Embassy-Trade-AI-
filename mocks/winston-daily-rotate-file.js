/**
 * Mock implementation of winston-daily-rotate-file for browser environments
 */

// Mock for winston-daily-rotate-file in browser environments
function DailyRotateFile() {
  // Return a mock transport
  this.on = () => this;
  this.log = () => {};
}

// Make it compatible with both require and import syntax
module.exports = DailyRotateFile;
module.exports.default = DailyRotateFile;