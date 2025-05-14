# Generate a Solana devnet wallet and populate it with transactions for testing
# This script requires PowerShell and will install the Solana CLI if needed

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SOLANA DEVNET TEST WALLET GENERATOR" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Solana is installed
$solanaInstalled = $false
try {
    $solanaVersion = solana --version
    Write-Host "Solana CLI detected: $solanaVersion" -ForegroundColor Green
    $solanaInstalled = $true
} 
catch {
    Write-Host "Solana CLI not found. Installing..." -ForegroundColor Yellow
}

# Install Solana if needed
if (-not $solanaInstalled) {
    try {
        Write-Host "Downloading Solana installer..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://release.solana.com/v1.17.0/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "solana-installer.exe"
        
        Write-Host "Running Solana installer..." -ForegroundColor Yellow
        Start-Process -FilePath "solana-installer.exe" -ArgumentList "v1.17.0" -Wait
        
        # Add Solana to PATH for this session
        $env:PATH = "$env:LOCALAPPDATA\solana\install\active_release\bin;" + $env:PATH
        
        # Verify installation
        $solanaVersion = solana --version
        Write-Host "Solana CLI installed successfully: $solanaVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to install Solana CLI. Error: $_" -ForegroundColor Red
        Write-Host "Please install Solana CLI manually: https://docs.solanalabs.com/cli/install" -ForegroundColor Red
        exit 1
    }
}

# Create a directory for wallet files
$walletDir = "$env:USERPROFILE\.config\solana\devnet-wallet"
if (-not (Test-Path $walletDir)) {
    New-Item -Path $walletDir -ItemType Directory -Force | Out-Null
}

Write-Host "Setting Solana to devnet..." -ForegroundColor Yellow
solana config set --url https://api.devnet.solana.com

# Generate new keypair
$keypairFile = "$walletDir\devnet-wallet.json"
Write-Host "Generating new Solana keypair at $keypairFile" -ForegroundColor Yellow
solana-keygen new --outfile $keypairFile --force

# Get the public key
$walletAddress = solana address -k $keypairFile
Write-Host "Wallet address: $walletAddress" -ForegroundColor Green

# Save wallet to local file for easy access
"Wallet Address: $walletAddress" | Out-File -FilePath "$walletDir\wallet-info.txt" -Force
"Keypair Path: $keypairFile" | Out-File -FilePath "$walletDir\wallet-info.txt" -Append

# Airdrop SOL
Write-Host "Requesting SOL airdrop from devnet..." -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
    try {
        solana airdrop 2 $walletAddress --url https://api.devnet.solana.com
        Write-Host "Airdrop $i successful!" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } 
    catch {
        Write-Host "Airdrop $i failed. Retrying..." -ForegroundColor Red
    }
}

# Display balance
$balance = solana balance $walletAddress
Write-Host "Wallet balance: $balance" -ForegroundColor Green

# Set this wallet as default for Solana CLI
solana config set --keypair $keypairFile
Write-Host "Set $walletAddress as default wallet for Solana CLI" -ForegroundColor Green

# Generate transaction history (this will take some time)
Write-Host "Generating transaction history (target: 1000+ transactions)" -ForegroundColor Yellow
Write-Host "This process will take several minutes, please be patient..." -ForegroundColor Yellow

# Function to check transaction count
function Get-TransactionCount {
    $signatures = solana signatures $walletAddress
    return ($signatures -split "`n").Count - 1  # Subtract header line
}

$initialCount = Get-TransactionCount
$targetCount = 1010  # Target slightly more than required
$batchSize = 20      # Process in batches to show progress
$currentCount = $initialCount

# Create a token for testing
Write-Host "Creating SPL token for transaction history generation..." -ForegroundColor Yellow
$tokenOutput = spl-token create-token --decimals 6
$tokenOutput -match "Creating token ([a-zA-Z0-9]+)"
$tokenAddress = $matches[1]

Write-Host "Created token: $tokenAddress" -ForegroundColor Green
Write-Host "Creating token account..." -ForegroundColor Yellow
$accountOutput = spl-token create-account $tokenAddress
$accountOutput -match "Creating account ([a-zA-Z0-9]+)"
$tokenAccountAddress = $matches[1]

Write-Host "Minting tokens..." -ForegroundColor Yellow
spl-token mint $tokenAddress 1000000

# Create a second address for transfers
$secondKeypairFile = "$walletDir\devnet-wallet-2.json"
solana-keygen new --outfile $secondKeypairFile --force
$secondWalletAddress = solana address -k $secondKeypairFile

Write-Host "Created second wallet for transfers: $secondWalletAddress" -ForegroundColor Green
solana airdrop 1 $secondWalletAddress --url https://api.devnet.solana.com

# Create token account for second wallet
Write-Host "Creating token account for second wallet..." -ForegroundColor Yellow
$env:SOLANA_KEYPAIR = $secondKeypairFile
$secondAccountOutput = spl-token create-account $tokenAddress
$secondAccountOutput -match "Creating account ([a-zA-Z0-9]+)"
$secondTokenAccountAddress = $matches[1]
$env:SOLANA_KEYPAIR = $keypairFile

# Batch process transactions
Write-Host "`nGenerating transactions in batches of $batchSize..." -ForegroundColor Yellow
Write-Host "Progress: $currentCount / $targetCount transactions" -ForegroundColor Yellow

$progressBar = 0
while ($currentCount -lt $targetCount) {
    # Alternate between different transaction types
    for ($i = 1; $i -le $batchSize; $i++) {
        $txType = $i % 3  # Use modulo to alternate between transaction types
        
        try {
            if ($txType -eq 0) {
                # Type 1: SOL transfer to self (different amounts)
                $amount = Get-Random -Minimum 0.0001 -Maximum 0.001
                $formattedAmount = "{0:N9}" -f $amount
                solana transfer $walletAddress $formattedAmount --allow-unfunded-recipient --no-wait
            }
            elseif ($txType -eq 1) {
                # Type 2: Token transfer to second wallet
                $amount = Get-Random -Minimum 1 -Maximum 10
                spl-token transfer --fund-recipient $tokenAddress $amount $secondTokenAccountAddress --allow-unfunded-recipient --no-wait
            }
            else {
                # Type 3: SOL transfer between wallets
                $amount = Get-Random -Minimum 0.0001 -Maximum 0.001
                $formattedAmount = "{0:N9}" -f $amount
                
                if ($i % 2 -eq 0) {
                    # Main wallet to second wallet
                    solana transfer $secondWalletAddress $formattedAmount --allow-unfunded-recipient --no-wait
                }
                else {
                    # Second wallet to main wallet
                    $env:SOLANA_KEYPAIR = $secondKeypairFile
                    solana transfer $walletAddress $formattedAmount --allow-unfunded-recipient --no-wait
                    $env:SOLANA_KEYPAIR = $keypairFile
                }
            }
        }
        catch {
            Write-Host "Transaction failed, continuing..." -ForegroundColor Red
        }
        
        # Show a simple progress indicator
        Write-Host "." -NoNewline -ForegroundColor Cyan
        $progressBar++
        if ($progressBar % 50 -eq 0) {
            Write-Host ""  # New line after 50 dots
        }
        
        # Brief pause to avoid rate limiting
        Start-Sleep -Milliseconds 300
    }
    
    # Check new count after batch
    $currentCount = Get-TransactionCount
    Write-Host "`nProgress: $currentCount / $targetCount transactions" -ForegroundColor Yellow
    
    # Longer pause between batches
    Start-Sleep -Seconds 5
}

Write-Host "`nTransaction generation complete!" -ForegroundColor Green

# Configure the wallet for TradeForce AI
Write-Host "Setting up wallet for TradeForce AI..." -ForegroundColor Yellow
$setupScript = @"
// Setup wallet for TradeForce AI
const fs = require('fs');
const path = require('path');

// Load wallet from file
const walletAddress = '$walletAddress';
const connectedWallets = [walletAddress];

// Create wallet configuration
const walletData = {
  current_wallet: walletAddress,
  connected_wallets: connectedWallets,
  wallet_validated: true,
  validated_at: Date.now(),
  wallet_signature: 'devnet_auto_validated'
};

// Write to public folder for application to use
console.log('Writing wallet configuration for TradeForce AI');

// Create files in the correct public directory
try {
  fs.writeFileSync(path.join(process.cwd(), 'public', 'wallet-config.json'), 
    JSON.stringify(walletData, null, 2));
  
  console.log('Wallet configuration saved successfully');
} catch (err) {
  console.error('Failed to write wallet configuration:', err);
}
"@

$setupScript | Out-File -FilePath "setup-devnet-wallet.js" -Encoding utf8
Write-Host "Running setup script..." -ForegroundColor Yellow
node setup-devnet-wallet.js
Remove-Item -Path "setup-devnet-wallet.js" -Force

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " SOLANA DEVNET TEST WALLET READY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Wallet Address: $walletAddress" -ForegroundColor Green
Write-Host "Keypair Path: $keypairFile" -ForegroundColor Green
Write-Host "Transaction Count: $currentCount" -ForegroundColor Green
Write-Host "`nThis wallet is now set up for TradeForce AI testing!" -ForegroundColor Cyan
Write-Host "Run start-solana-devnet-prod.bat to launch the application" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Save wallet info to project directory for reference
$walletInfoContent = @"
SOLANA DEVNET TEST WALLET

Wallet Address: $walletAddress
Keypair Path: $keypairFile
Transaction Count: $currentCount
Generation Date: $(Get-Date)

To use with Phantom or Solflare:
1. Export private key from keyfile: solana-keygen recover -o private.json $keypairFile
2. Import private key into your browser extension wallet
3. Ensure wallet is set to Devnet network
"@

$walletInfoContent | Out-File -FilePath "devnet-wallet-info.txt" -Force
Write-Host "Wallet info saved to: $(Get-Location)\devnet-wallet-info.txt" -ForegroundColor Green
