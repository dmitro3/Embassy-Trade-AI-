# PowerShell script to package the TradeForce AI Trading Agent extension
# This script creates a .zip file that can be used for Chrome and a .xpi file for Firefox

# Set the output directory
$outputDir = "dist"

# Create the output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Host "Created output directory: $outputDir"
}

# Set the output filenames
$chromeZip = "$outputDir\tradeforce-ai-trading-agent-chrome.zip"
$firefoxXpi = "$outputDir\tradeforce-ai-trading-agent-firefox.xpi"

# Remove existing output files
if (Test-Path $chromeZip) {
    Remove-Item $chromeZip -Force
    Write-Host "Removed existing Chrome package: $chromeZip"
}

if (Test-Path $firefoxXpi) {
    Remove-Item $firefoxXpi -Force
    Write-Host "Removed existing Firefox package: $firefoxXpi"
}

# Create a list of files to include
$filesToInclude = @(
    "manifest.json",
    "README.md",
    "LICENSE",
    "INSTALLATION.md",
    "assets",
    "background",
    "content",
    "lib",
    "popup"
)

# Create the Chrome package
Write-Host "Creating Chrome package..."
Compress-Archive -Path $filesToInclude -DestinationPath $chromeZip
Write-Host "Chrome package created: $chromeZip"

# Create the Firefox package (same as Chrome for now)
Write-Host "Creating Firefox package..."
Copy-Item $chromeZip $firefoxXpi
Write-Host "Firefox package created: $firefoxXpi"

Write-Host "Packaging complete!"
Write-Host "Chrome extension: $chromeZip"
Write-Host "Firefox extension: $firefoxXpi"
