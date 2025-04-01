// Jest setup for Electron tests
const { Application } = require('spectron');
const path = require('path');
const electronPath = require('electron');

// Global setup for Spectron
global.beforeEach = function setupSpectron() {
  this.app = new Application({
    path: electronPath,
    args: [path.join(__dirname, '../../')],
    startTimeout: 10000,
    waitTimeout: 10000
  });
};

// Global teardown
global.afterEach = async function cleanSpectron() {
  if (this.app && this.app.isRunning()) {
    return await this.app.stop();
  }
};

// Utility functions for tests
global.getElementText = async function getElementText(app, selector) {
  const element = await app.client.$(selector);
  return await element.getText();
};

global.clickElement = async function clickElement(app, selector) {
  const element = await app.client.$(selector);
  return await element.click();
};