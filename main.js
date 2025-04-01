const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const { net } = require('electron');

// Create logs directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

// Configure Winston logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'embassy-trade-desktop' },
  transports: [
    new transports.File({ filename: path.join(__dirname, 'logs/desktop-error.log'), level: 'error' }),
    new transports.File({ filename: path.join(__dirname, 'logs/desktop.log') })
  ]
});

// Add console transport in development
if (isDev) {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

// Global references
let mainWindow;
let tray;
let expressServer;
let pythonProcess;
let autoTradeWindow;
let feedbackData = [];

// Server and Python script ports
const EXPRESS_PORT = 4002;
const NEXT_PORT = 3008;

// Online app URL
const ONLINE_APP_URL = 'https://trading.embassyai.xyz/simulation';

// Check internet connectivity
function checkOnlineStatus() {
  return new Promise((resolve) => {
    const request = net.request(ONLINE_APP_URL);
    request.on('response', () => {
      resolve(true);
    });
    request.on('error', () => {
      resolve(false);
    });
    request.end();
  });
}

function createWindow() {
  logger.info('Creating main window');
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Check online status and load appropriate URL
  checkOnlineStatus().then(isOnline => {
    // Load the app frontend
    const startUrl = isOnline 
      ? ONLINE_APP_URL  // Use online Vercel deployment when available
      : isDev
        ? `http://localhost:${NEXT_PORT}`
        : `file://${path.join(__dirname, './out/index.html')}`;
    
    logger.info(`Loading application from: ${startUrl} (online: ${isOnline})`);
    mainWindow.loadURL(startUrl);
    
    // If online, also start local services for API access
    if (isOnline) {
      startExpressServer();
      startPythonScripts();
    }
  });
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window minimized event
  mainWindow.on('minimize', (event) => {
    if (process.platform === 'darwin') return; // Skip on macOS
    
    event.preventDefault();
    mainWindow.hide();
    
    if (process.platform === 'win32') {
      // Show balloon notification on Windows
      tray.displayBalloon({
        title: 'Embassy Trade',
        content: 'Application minimized to system tray',
        icon: path.join(__dirname, 'public/favicon.ico')
      });
    }
  });
}

// Create the Auto-Trade window for deep search visualization
function createAutoTradeWindow() {
  // Create a smaller window for auto trade results
  autoTradeWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public/favicon.ico'),
    title: 'AI-Driven Trade Search'
  });

  // Load a local HTML file for the auto trade window
  const autoTradeHtml = `file://${path.join(__dirname, './out/auto-trade.html')}`;
  autoTradeWindow.loadURL(autoTradeHtml);

  // Handle window closed event
  autoTradeWindow.on('closed', () => {
    autoTradeWindow = null;
  });

  return autoTradeWindow;
}

function createTray() {
  logger.info('Creating system tray');
  
  // Create tray icon
  tray = new Tray(path.join(__dirname, 'public/favicon.ico'));
  
  // Create context menu for tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Embassy Trade',
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Auto Trading',
      submenu: [
        { 
          label: 'Start Auto Trading', 
          click: () => {
            mainWindow.webContents.send('toggle-auto-trading', true);
          }
        },
        { 
          label: 'Stop Auto Trading', 
          click: () => {
            mainWindow.webContents.send('toggle-auto-trading', false);
          }
        }
      ]
    },
    { 
      label: 'Moonshot Sniper', 
      click: () => {
        mainWindow.webContents.send('open-moonshot-sniper');
      }
    },
    { type: 'separator' },
    {
      label: 'Open Web Version',
      click: () => {
        shell.openExternal(ONLINE_APP_URL);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        logger.info('Quitting application from tray');
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Embassy Trade');
  tray.setContextMenu(contextMenu);
  
  // Show/hide window on tray click (for Windows/Linux)
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      if (mainWindow === null) {
        createWindow();
      } else {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });
  }
}

function startExpressServer() {
  logger.info('Starting Express server');
  
  // Determine the path to the server script
  const serverPath = isDev
    ? path.join(__dirname, 'server/index.js')
    : path.join(process.resourcesPath, 'server/index.js');
  
  // Spawn Express server as a child process
  expressServer = spawn('node', [serverPath], {
    env: { ...process.env, PORT: EXPRESS_PORT.toString() }
  });
  
  expressServer.stdout.on('data', (data) => {
    logger.info(`Backend: ${data}`);
  });
  
  expressServer.stderr.on('data', (data) => {
    logger.error(`Backend Error: ${data}`);
  });
  
  expressServer.on('close', (code) => {
    logger.info(`Express server exited with code ${code}`);
  });
}

function startPythonScripts() {
  logger.info('Starting Python scripts');
  
  // Determine the path to the Python script
  const pythonScriptPath = isDev
    ? path.join(__dirname, 'trading/main.py')
    : path.join(process.resourcesPath, 'trading/main.py');
  
  // Check which Python command is available
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  
  // Spawn Python process
  pythonProcess = spawn(pythonCommand, [pythonScriptPath], {
    env: { ...process.env, EXPRESS_BACKEND_URL: `http://localhost:${EXPRESS_PORT}` }
  });
  
  pythonProcess.stdout.on('data', (data) => {
    logger.info(`Python: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    logger.error(`Python Error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    logger.info(`Python process exited with code ${code}`);
  });
}

// Mock data for moonshot listings
const moonshotListings = [
  { id: 1, name: 'New Token A', ticker: 'NTA', listing: 'Major Exchange Launch', potentialGain: '+120%', risk: 'High' },
  { id: 2, name: 'DeFi Project B', ticker: 'DPB', listing: 'Cross-Chain Integration', potentialGain: '+85%', risk: 'Medium' },
  { id: 3, name: 'Gaming Token C', ticker: 'GTC', listing: 'Partnership Announcement', potentialGain: '+200%', risk: 'Very High' },
  { id: 4, name: 'Privacy Coin D', ticker: 'PCD', listing: 'Major Upgrade', potentialGain: '+45%', risk: 'Low' },
  { id: 5, name: 'Metaverse E', ticker: 'MVE', listing: 'NFT Platform Launch', potentialGain: '+150%', risk: 'High' },
];

// Mock data for auto trading
const autoTradeResults = [
  { id: 1, pair: 'BTC/USDT', strategy: 'Breakout', profitPotential: '+3.2%', risk: 'Medium', volume: '$1.2B' },
  { id: 2, pair: 'ETH/USDT', strategy: 'Reversion', profitPotential: '+2.8%', risk: 'Low', volume: '$800M' },
  { id: 3, pair: 'SOL/USDT', strategy: 'Momentum', profitPotential: '+5.5%', risk: 'High', volume: '$450M' },
  { id: 4, pair: 'DOT/USDT', strategy: 'Arbitrage', profitPotential: '+1.2%', risk: 'Very Low', volume: '$320M' },
  { id: 5, pair: 'AVAX/USDT', strategy: 'News-based', profitPotential: '+7.1%', risk: 'Very High', volume: '$280M' },
];

// Feedback system storage
const feedbackFilePath = path.join(__dirname, 'logs/feedback.json');

// Initialize feedback file if it doesn't exist
if (!fs.existsSync(feedbackFilePath)) {
  fs.writeFileSync(feedbackFilePath, JSON.stringify([], null, 2));
} else {
  try {
    feedbackData = JSON.parse(fs.readFileSync(feedbackFilePath, 'utf8'));
  } catch (err) {
    logger.error('Error reading feedback data', { error: err.message });
    feedbackData = [];
  }
}

// Setup IPC handlers for communication between renderer and main processes
function setupIPC() {
  // Example: Receive notification requests from renderer
  ipcMain.on('show-notification', (event, { title, body }) => {
    const notification = {
      title: title || 'Embassy Trade Notification',
      body: body || '',
      icon: path.join(__dirname, 'public/favicon.ico')
    };
    
    new Notification(notification).show();
  });
  
  // Example: Show dialog
  ipcMain.handle('show-dialog', async (event, { type, title, message }) => {
    return await dialog.showMessageBox(mainWindow, {
      type: type || 'info',
      title: title || 'Embassy Trade',
      message: message || '',
      buttons: ['OK']
    });
  });
  
  // Add handler for checking online status
  ipcMain.handle('check-online-status', async () => {
    return await checkOnlineStatus();
  });
  
  // Add handler for forcing offline mode
  ipcMain.on('use-offline-mode', () => {
    if (mainWindow) {
      const localUrl = isDev
        ? `http://localhost:${NEXT_PORT}`
        : `file://${path.join(__dirname, './out/index.html')}`;
      
      mainWindow.loadURL(localUrl);
      
      // Ensure local services are running
      if (!expressServer) startExpressServer();
      if (!pythonProcess) startPythonScripts();
    }
  });
  
  // Add handler for forcing online mode
  ipcMain.on('use-online-mode', () => {
    if (mainWindow) {
      mainWindow.loadURL(ONLINE_APP_URL);
    }
  });

  // Add handler for opening the web version
  ipcMain.on('open-web-version', () => {
    shell.openExternal(ONLINE_APP_URL);
  });
  
  // Moonshot Sniper handlers
  ipcMain.handle('fetch-moonshot-listings', async () => {
    logger.info('Fetching moonshot listings');
    // In a real app, we would fetch from an API or blockchain
    return moonshotListings;
  });
  
  ipcMain.handle('invest-moonshot', async (event, { coin, amount }) => {
    logger.info(`Investing in moonshot: ${coin.name} with $${amount}`);
    // In a real app, this would place an actual investment
    return {
      success: true,
      message: `Successfully invested $${amount} in ${coin.name}`,
      transactionId: `MS-${Date.now()}`
    };
  });
  
  // Auto-Trading feature handlers
  ipcMain.handle('start-auto-trade-search', async () => {
    logger.info('Starting AI-driven auto trade search');
    
    // If window doesn't exist, create it
    if (!autoTradeWindow) {
      createAutoTradeWindow();
      autoTradeWindow.show();
    } else {
      autoTradeWindow.show();
    }
    
    // Simulate search progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-trade-progress', { progress });
      }
      if (autoTradeWindow && !autoTradeWindow.isDestroyed()) {
        autoTradeWindow.webContents.send('auto-trade-progress', { progress });
      }
      
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 500);
    
    // Return the window ID for future reference
    return { windowId: autoTradeWindow.id };
  });
  
  ipcMain.handle('get-auto-trade-results', async () => {
    logger.info('Getting auto trade search results');
    // In a real app, we would fetch from an AI service or trading algorithm
    return autoTradeResults;
  });
  
  ipcMain.handle('execute-auto-trade', async (event, trade) => {
    logger.info(`Executing auto trade: ${trade.pair}`);
    // In a real app, this would place an actual trade
    return {
      success: true,
      message: `Successfully executed trade for ${trade.pair}`,
      orderId: `AT-${Date.now()}`
    };
  });
  
  // Feedback system handlers
  ipcMain.handle('submit-feedback', async (event, data) => {
    logger.info(`Received feedback: ${data.type}`);
    
    const feedbackEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...data,
      status: 'received'
    };
    
    feedbackData.push(feedbackEntry);
    
    // Save to file
    fs.writeFile(feedbackFilePath, JSON.stringify(feedbackData, null, 2), (err) => {
      if (err) {
        logger.error('Error saving feedback', { error: err.message });
      }
    });
    
    // If it's a bug report, simulate auto-patching after 5 minutes
    if (data.type === 'Bug') {
      setTimeout(() => {
        const patchedEntry = feedbackData.find(item => item.id === feedbackEntry.id);
        if (patchedEntry) {
          patchedEntry.status = 'patched';
          patchedEntry.patchedAt = new Date().toISOString();
          
          // Save updated status
          fs.writeFile(feedbackFilePath, JSON.stringify(feedbackData, null, 2), (err) => {
            if (err) {
              logger.error('Error saving patched feedback', { error: err.message });
            }
          });
          
          // Notify the renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('patch-applied', { 
              id: patchedEntry.id, 
              message: `Auto-patch applied for: ${patchedEntry.description.substring(0, 50)}...` 
            });
            
            // Show notification
            const notification = {
              title: 'Auto-Patch Applied',
              body: `Issue resolved: ${patchedEntry.description.substring(0, 50)}...`,
              icon: path.join(__dirname, 'public/favicon.ico')
            };
            
            new Notification(notification).show();
          }
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return { success: true, id: feedbackEntry.id };
  });
}

// App event handlers
app.whenReady().then(async () => {
  logger.info('Application ready, initializing components');
  
  createWindow();
  createTray();
  setupIPC();
  
  // Only start local services if offline or in dev mode
  const isOnline = await checkOnlineStatus();
  if (!isOnline || isDev) {
    startExpressServer();
    startPythonScripts();
  }
  
  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, applications typically stay active until the user quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('Application shutting down');
  
  // Clean up resources before quitting
  if (expressServer) {
    expressServer.kill();
  }
  
  if (pythonProcess) {
    pythonProcess.kill();
  }
});