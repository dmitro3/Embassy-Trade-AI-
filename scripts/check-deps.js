/**
 * TradeForce AI Dependency Checker
 * 
 * This script checks if all the required dependencies for the MCP servers are installed.
 * If not, it will install them automatically.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredPackages = [
  'fastify',
  'express',
  'cors',
  'axios',
  'mongodb',
  'redis',
  'dotenv',
  'winston',
  '@solana/web3.js',
  '@solana/spl-token',
  'node-cache',
  'ws'
];

console.log('Checking for required dependencies...');

// Check if package.json exists
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const installedDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

// Check if required packages are installed
const missingPackages = [];
for (const pkg of requiredPackages) {
  if (!installedDependencies[pkg]) {
    missingPackages.push(pkg);
  }
}

// Install missing packages
if (missingPackages.length > 0) {
  console.log(`Installing missing packages: ${missingPackages.join(', ')}`);
  try {
    execSync(`npm install --save ${missingPackages.join(' ')}`, { stdio: 'inherit' });
    console.log('All required packages have been installed.');
  } catch (error) {
    console.error('Error installing packages:', error.message);
    process.exit(1);
  }
} else {
  console.log('All required packages are already installed.');
}

// Create minimal config files if they don't exist
const configDir = path.join(process.cwd(), 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Create a minimal config for MCP services to use
const mcpConfig = {
  apiKeys: {
    shyft: process.env.SHYFT_API_KEY || 'whv00T87G8Sd8TeK',
    birdeye: process.env.BIRDEYE_API_KEY || '67f8ce614c594ab2b3efb742f8db69db'
  },
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  },
  services: {
    tokenDiscovery: {
      port: 3001,
      enabled: true
    },
    dexScreener: {
      port: 3002,
      enabled: true
    },
    pumpFun: {
      port: 3003,
      enabled: true
    },
    shyftData: {
      port: 3004,
      enabled: true
    }
  }
};

const mcpConfigPath = path.join(configDir, 'mcp-config.json');
if (!fs.existsSync(mcpConfigPath)) {
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log('Created default MCP configuration file.');
}

console.log('Dependency check completed successfully.');
