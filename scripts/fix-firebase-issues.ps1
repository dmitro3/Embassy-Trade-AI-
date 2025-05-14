#!/usr/bin/env pwsh
# Firebase cleanup and test script for TradeForce AI

$ErrorActionPreference = "Stop"

# ANSI color codes for better readability
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[36m"
$Reset = "`e[0m"

Write-Host "$Blue════════════════════════════════════════════════════════$Reset"
Write-Host "$Blue TradeForce AI Firebase Cleanup Tool $Reset"
Write-Host "$Blue════════════════════════════════════════════════════════$Reset"

# Define browsers to check
$browsers = @(
    @{
        Name = "Chrome";
        IndexedDBPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\IndexedDB";
        LocalStoragePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Local Storage\leveldb";
    },
    @{
        Name = "Edge";
        IndexedDBPath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\IndexedDB";
        LocalStoragePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Local Storage\leveldb";
    },
    @{
        Name = "Firefox";
        IndexedDBPath = "$env:APPDATA\Mozilla\Firefox\Profiles\*\storage\default\http+++localhost*\idb";
        LocalStoragePath = "$env:APPDATA\Mozilla\Firefox\Profiles\*\storage\default\http+++localhost*\ls";
    }
)

Write-Host "`nChecking for Firebase IndexedDB files that might be causing issues..."

$found = $false

foreach ($browser in $browsers) {
    Write-Host "`n$Yellow▶$Reset Checking $($browser.Name)..."
    
    # Check IndexedDB path
    if (Test-Path -Path $browser.IndexedDBPath -ErrorAction SilentlyContinue) {
        $firebaseFiles = Get-ChildItem -Path $browser.IndexedDBPath -Recurse -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -like "*firebase*" -or $_.Name -like "*installations*" }
        
        if ($firebaseFiles.Count -gt 0) {
            $found = $true
            Write-Host "  $Yellow⚠$Reset Found Firebase IndexedDB files in $($browser.Name):"
            foreach ($file in $firebaseFiles) {
                Write-Host "      $($file.FullName)"
            }
        } else {
            Write-Host "  $Green✓$Reset No Firebase IndexedDB files found in $($browser.Name)"
        }
    } else {
        Write-Host "  $Blue➤$Reset IndexedDB path not found for $($browser.Name)"
    }
    
    # Check Local Storage path
    if (Test-Path -Path $browser.LocalStoragePath -ErrorAction SilentlyContinue) {
        $lsFiles = Get-ChildItem -Path $browser.LocalStoragePath -Recurse -ErrorAction SilentlyContinue | 
            Get-Content -ErrorAction SilentlyContinue | 
            Select-String -Pattern "firebase|installations" -SimpleMatch -ErrorAction SilentlyContinue
        
        if ($null -ne $lsFiles -and $lsFiles.Count -gt 0) {
            $found = $true
            Write-Host "  $Yellow⚠$Reset Found Firebase Local Storage entries in $($browser.Name)"
        } else {
            Write-Host "  $Green✓$Reset No Firebase Local Storage entries found in $($browser.Name)"
        }
    } else {
        Write-Host "  $Blue➤$Reset Local Storage path not found for $($browser.Name)"
    }
}

if ($found) {
    Write-Host "`n$Yellow⚠$Reset Potential Firebase browser storage issues found!"
    Write-Host "  Please clear your browser data for localhost or try a different browser."
    Write-Host "  In Chrome/Edge: Settings > Privacy and security > Clear browsing data > Advanced"
    Write-Host "  Select 'Cookies and site data' + 'Site settings', then clear data"
} else {
    Write-Host "`n$Green✓$Reset No Firebase browser storage issues detected!"
}

# Create a test HTML file to verify if Firebase initialization works
$testHtmlPath = Join-Path $PWD "firebase-test.html"
$testHtmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Firebase Initialization Test</title>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
    <script>
        // This script tests Firebase initialization
        console.log('Starting Firebase initialization test...');
        
        // Mock installations API to prevent errors
        window._firebase_installations_compat_mock = {
            getId: () => Promise.resolve('mock-installation-id-' + Date.now()),
            getToken: () => Promise.resolve('mock-token-' + Date.now()),
            onIdChange: () => () => {}
        };
        
        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDP-kfq_R8QovdosM4tA4p79QWUlSy5jec",
            authDomain: "tradeforce-ai.firebaseapp.com",
            projectId: "tradeforce-ai",
            storageBucket: "tradeforce-ai.appspot.com",
            messagingSenderId: "253081292765",
            appId: "1:253081292765:web:e75ba3b8ded7e6141c2b54"
        };
        
        // Initialize Firebase
        try {
            const app = firebase.initializeApp(firebaseConfig);
            app.automaticDataCollectionEnabled = false;
            console.log('Firebase initialized successfully!');
            document.getElementById('status').textContent = 'Firebase initialized successfully!';
            document.getElementById('status').style.color = 'green';
        } catch (error) {
            console.error('Firebase initialization error:', error);
            document.getElementById('status').textContent = 'Firebase initialization error: ' + error.message;
            document.getElementById('status').style.color = 'red';
        }
    </script>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #333; }
        .status { padding: 15px; border-radius: 4px; margin: 15px 0; }
        .instructions { background: #f0f0f0; padding: 15px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>Firebase Initialization Test</h1>
    <div class="status">
        <h2>Status:</h2>
        <p id="status">Checking Firebase initialization...</p>
    </div>
    <div class="instructions">
        <h2>Instructions:</h2>
        <p>This page tests if Firebase can initialize properly without permission errors.</p>
        <p>Check the browser console (F12) for more detailed information.</p>
        <p>If you see any errors related to "installations" or "permission denied", clear your browser data and try again.</p>
    </div>
</body>
</html>
"@

try {
    Set-Content -Path $testHtmlPath -Value $testHtmlContent -Force
    Write-Host "`n$Green✓$Reset Created Firebase test HTML file at: $testHtmlPath"
    Write-Host "  Open this file in your browser to test Firebase initialization"
    Write-Host "  If you see Firebase initialization errors, clear your browser data"
} catch {
    Write-Host "`n$Red✗$Reset Failed to create test file: $_"
}

Write-Host "`n$Blue════════════════════════════════════════════════════════$Reset"
Write-Host "Next steps:"
Write-Host "1. Clear your browser data for localhost sites if issues were found"
Write-Host "2. Open the generated firebase-test.html file in your browser"
Write-Host "3. Check if Firebase initializes successfully"
Write-Host "4. Try running the TradeForce AI application again"
Write-Host "$Blue════════════════════════════════════════════════════════$Reset"
