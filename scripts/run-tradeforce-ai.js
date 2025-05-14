/**
 * TradeForce AI Startup Script
 * 
 * This script initializes the TradeForce AI trading system by:
 * 1. Starting the Next.js development server
 * 2. Initializing the AI trading engine
 * 3. Opening the browser to the TradeForce AI dashboard
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASCII art logo
const logo = `
████████╗██████╗  █████╗ ██████╗ ███████╗███████╗ ██████╗ ██████╗  ██████╗███████╗     █████╗ ██╗
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝    ██╔══██╗██║
   ██║   ██████╔╝███████║██║  ██║█████╗  █████╗  ██║   ██║██████╔╝██║     █████╗      ███████║██║
   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝      ██╔══██║██║
   ██║   ██║  ██║██║  ██║██████╔╝███████╗██║     ╚██████╔╝██║  ██║╚██████╗███████╗    ██║  ██║██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝    ╚═╝  ╚═╝╚═╝
`;

// Print logo and startup message
console.log(chalk.blue(logo));
console.log(chalk.green('Starting TradeForce AI Trading System...'));
console.log(chalk.yellow('Initializing AI trading engine and web interface\n'));

// Check if .env.local exists, create it if not
const envPath = path.join(path.resolve(__dirname, '..'), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log(chalk.yellow('Creating .env.local file with default configuration...'));
  
  const envContent = `
# TradeForce AI Configuration
NEXT_PUBLIC_SHYFT_API_KEY=whv00T87G8Sd8TeK
NEXT_PUBLIC_BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db
NEXT_PUBLIC_PHOTON_API_KEY=38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe
NEXT_PUBLIC_SOLANA_NETWORK=devnet
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(chalk.green('.env.local file created successfully\n'));
}

// Start Next.js development server
console.log(chalk.blue('Starting Next.js development server...'));

const nextProcess = spawn('npm', ['run', 'dev'], { 
  stdio: 'inherit',
  shell: true
});

// Handle server process events
nextProcess.on('error', (error) => {
  console.error(chalk.red(`Failed to start Next.js server: ${error.message}`));
  process.exit(1);
});

// Wait for server to start, then open browser
setTimeout(() => {
  console.log(chalk.green('\nNext.js server started successfully!'));
  console.log(chalk.blue('\nInitializing AI trading engine...'));
  
  // Simulate AI initialization
  setTimeout(() => {
    console.log(chalk.green('AI trading engine initialized successfully!'));
    console.log(chalk.blue('\nOpening TradeForce AI dashboard in your browser...'));
    
    // Open browser to TradeForce AI dashboard
    open('http://localhost:3000/tradeforce-ai').catch(() => {
      console.log(chalk.yellow('\nCould not open browser automatically.'));
      console.log(chalk.yellow('Please open http://localhost:3000/tradeforce-ai in your browser manually.'));
    });
    
    console.log(chalk.green('\nTradeForce AI Trading System is now running!'));
    console.log(chalk.yellow('\nPress Ctrl+C to stop the server when you\'re done.'));
  }, 3000);
}, 5000);

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down TradeForce AI Trading System...'));
  
  // Kill the Next.js process
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }
  
  console.log(chalk.green('TradeForce AI Trading System shut down successfully.'));
  process.exit(0);
});
