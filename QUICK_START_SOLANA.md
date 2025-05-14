# TradeForce AI with Real Solana Integration

## Quick Start Guide

This document explains how to get TradeForce AI running with real Solana devnet integration.

## Before You Start

When running the application, make sure:
1. You have a Solana wallet extension installed in your browser (Phantom, Solflare, etc.)
2. You have access to devnet SOL for testing (use a faucet if needed)
3. No other applications are using port 3008 (our scripts will help resolve port conflicts)

## Starting the Application

### Option 1: Easy Reset and Start (Windows)

The simplest way to get started is:

```batch
reset-and-start.bat
```

This will:
- Kill any running Node.js processes
- Clear caches and temporary files
- Configure real Solana wallet integration
- Start the application on port 3008
- Open your browser automatically

### Option 2: Smart Start with Port Detection (PowerShell)

For a more advanced startup with automatic port conflict resolution:

```powershell
.\Start-SmartSolanaApp.ps1
```

This will:
- Find an available port if 3008 is already in use
- Configure the application to use the available port
- Start MCP servers and the main application
- Wait for the application to be ready before opening the browser
- Show detailed progress throughout the startup process

### Option 3: Fix Port Conflicts (Advanced)

If you're experiencing "Connection Refused" errors:

```powershell
.\Fix-PortConflicts.ps1
```

This script can:
- Identify and resolve port conflicts
- Kill specific processes using required ports
- Clean application state for a fresh start

## Connecting Your Wallet

1. Once the application loads, click "Connect Wallet" in the top right
2. Select your Solana wallet provider
3. When prompted, validate your wallet by signing a message
4. Navigate to the Results tab to see your real devnet transaction data

## Troubleshooting

### Connection Refused Error

If you see "This site can't be reached - localhost refused to connect":
- The application may not be running
- There could be a port conflict
- Run `.\Fix-PortConflicts.ps1` to resolve issues

### Blank Screen or Errors

If the application loads but shows errors or a blank screen:
- Check the terminal for error messages
- Make sure the MCP servers are running
- Try a complete reset with `reset-and-start.bat`

### Port Already In Use

If you receive "Port already in use" errors:
- Use `.\Start-SmartSolanaApp.ps1` which will find an available port
- Manually stop applications that might be using port 3008
- Use Task Manager to end any Node.js processes

## Important Notes

- The application is configured to use **port 3008** by default
- Real Solana integration requires wallet signature validation
- No minimum transaction requirement (any wallet can be used)
- Mock data generation is disabled in favor of real blockchain data
