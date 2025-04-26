/**
 * MCP Server Launcher Utility
 * 
 * This utility provides functions for automatically starting and managing MCP servers
 * when the TradeForce application is launched.
 */

'use client';

// Using browser-compatible approach instead of Node.js process management
import { useState, useEffect, useCallback } from 'react';

// Status tracking for MCP servers
const servers = {
  tokenDiscovery: {
    isRunning: false,
    process: null,
    url: 'http://localhost:3002',
    name: 'Token Discovery MCP'
  },
  shyftData: {
    isRunning: false,
    process: null,
    url: 'http://localhost:3001',
    name: 'SHYFT Data MCP'
  }
};

/**
 * Check if a server is running on a given port
 * 
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - Whether the port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -i:${port} -P -n -t`;
    }
    
    exec(command, (error, stdout) => {
      resolve(!!stdout);
    });
  });
}

/**
 * Start Token Discovery MCP server if not already running
 * 
 * @returns {Promise<boolean>} - Whether the server was started successfully
 */
async function startTokenDiscoveryMCP() {
  // Check if the server is already running
  if (servers.tokenDiscovery.isRunning) {
    console.log('Token Discovery MCP is already running.');
    return true;
  }
  
  // Check if port is in use by another process
  const portInUse = await isPortInUse(3002);
  if (portInUse) {
    console.log('Port 3002 is already in use. Assuming Token Discovery MCP is running.');
    servers.tokenDiscovery.isRunning = true;
    return true;
  }
  
  try {
    // Get base directory
    const baseDir = path.resolve(__dirname, '..');
    
    // Path to start script
    const scriptPath = path.join(baseDir, 'start-token-discovery-mcp.bat');
    
    console.log(`Starting Token Discovery MCP server from ${scriptPath}...`);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Token Discovery MCP start script not found at ${scriptPath}`);
      return false;
    }
    
    // Start the process
    const process = spawn('cmd.exe', ['/c', scriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    
    // Store the process
    servers.tokenDiscovery.process = process;
    
    // Handle process events
    process.on('error', (err) => {
      console.error('Failed to start Token Discovery MCP:', err);
      servers.tokenDiscovery.isRunning = false;
    });
    
    // Set as running
    servers.tokenDiscovery.isRunning = true;
    
    console.log('Token Discovery MCP server started successfully.');
    return true;
    
  } catch (error) {
    console.error('Error starting Token Discovery MCP server:', error);
    return false;
  }
}

/**
 * Start SHYFT Data MCP server if not already running
 * 
 * @returns {Promise<boolean>} - Whether the server was started successfully
 */
async function startShyftDataMCP() {
  // Check if the server is already running
  if (servers.shyftData.isRunning) {
    console.log('SHYFT Data MCP is already running.');
    return true;
  }
  
  // Check if port is in use by another process
  const portInUse = await isPortInUse(3001);
  if (portInUse) {
    console.log('Port 3001 is already in use. Assuming SHYFT Data MCP is running.');
    servers.shyftData.isRunning = true;
    return true;
  }
  
  try {
    // Get base directory
    const baseDir = path.resolve(__dirname, '..');
    
    // Assume there's a script for SHYFT Data MCP similar to token discovery
    const scriptPath = path.join(baseDir, 'start-shyft-data-mcp.bat');
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      console.log(`SHYFT Data MCP start script not found at ${scriptPath}. Skipping.`);
      return false;
    }
    
    console.log(`Starting SHYFT Data MCP server from ${scriptPath}...`);
    
    // Start the process
    const process = spawn('cmd.exe', ['/c', scriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    
    // Store the process
    servers.shyftData.process = process;
    
    // Handle process events
    process.on('error', (err) => {
      console.error('Failed to start SHYFT Data MCP:', err);
      servers.shyftData.isRunning = false;
    });
    
    // Set as running
    servers.shyftData.isRunning = true;
    
    console.log('SHYFT Data MCP server started successfully.');
    return true;
    
  } catch (error) {
    console.error('Error starting SHYFT Data MCP server:', error);
    return false;
  }
}

/**
 * Start all MCP servers
 * 
 * @returns {Promise<Object>} - Status of server startups
 */
async function startAllMCPServers() {
  console.log('Starting all MCP servers...');
  
  const results = {
    tokenDiscovery: await startTokenDiscoveryMCP(),
    shyftData: await startShyftDataMCP()
  };
  
  return {
    success: Object.values(results).some(result => result),
    results
  };
}

/**
 * Stop all running MCP servers
 */
function stopAllMCPServers() {
  console.log('Stopping all MCP servers...');
  
  // Stop Token Discovery MCP
  if (servers.tokenDiscovery.isRunning && servers.tokenDiscovery.process) {
    try {
      // Send kill signal to process and its children
      process.kill(-servers.tokenDiscovery.process.pid);
    } catch (error) {
      console.error('Error stopping Token Discovery MCP server:', error);
    }
    servers.tokenDiscovery.isRunning = false;
    servers.tokenDiscovery.process = null;
  }
  
  // Stop SHYFT Data MCP
  if (servers.shyftData.isRunning && servers.shyftData.process) {
    try {
      // Send kill signal to process and its children
      process.kill(-servers.shyftData.process.pid);
    } catch (error) {
      console.error('Error stopping SHYFT Data MCP server:', error);
    }
    servers.shyftData.isRunning = false;
    servers.shyftData.process = null;
  }
}

// Export the utility functions
module.exports = {
  startTokenDiscoveryMCP,
  startShyftDataMCP,
  startAllMCPServers,
  stopAllMCPServers,
  servers
};
