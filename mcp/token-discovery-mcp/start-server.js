/**
 * Token Discovery MCP Server Launcher
 * 
 * This script launches the Token Discovery MCP server and handles process
 * lifecycle events.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log startup
console.log('Starting Token Discovery MCP Server...');
console.log(`Current directory: ${__dirname}`);
console.log('Node version:', process.version);

// Start the server process
const serverProcess = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

// Handle server process events
serverProcess.on('error', (error) => {
  console.error('Failed to start server process:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server process exited with code ${code}`);
    process.exit(code);
  }
  console.log('Server process closed');
});

// Handle process signals
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down server...');
  serverProcess.kill('SIGTERM');
});

// Keep the process running
console.log('Server launcher running. Press Ctrl+C to stop.');
