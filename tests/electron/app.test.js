const path = require('path');
const { Application } = require('spectron');
const electronPath = require('electron');

describe('Basic Application Launch', function() {
  jest.setTimeout(30000);
  
  beforeEach(async function() {
    this.app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '../../')],
      startTimeout: 20000,
      waitTimeout: 20000
    });
    return await this.app.start();
  });
  
  afterEach(async function() {
    if (this.app && this.app.isRunning()) {
      return await this.app.stop();
    }
  });
  
  it('shows an initial window', async function() {
    const count = await this.app.client.getWindowCount();
    expect(count).toEqual(1);
  });
  
  it('has the correct window title', async function() {
    const title = await this.app.client.getTitle();
    // Adjust the expected title as needed
    expect(title).toMatch(/Embassy Trade/);
  });
  
  it('window is visible', async function() {
    const isVisible = await this.app.browserWindow.isVisible();
    expect(isVisible).toBe(true);
  });
});