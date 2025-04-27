# TradeForce AI Trading Agent - Installation Guide

This document provides detailed instructions for installing and setting up the TradeForce AI Trading Agent browser extension.

## System Requirements

- **Browser**: Chrome 88+, Firefox 86+, or Edge 88+
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **Internet Connection**: Stable broadband connection (5+ Mbps recommended)
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 100MB free space

## Installation Methods

### Method 1: Install from Chrome Web Store (Recommended)

1. Open Google Chrome
2. Visit the [TradeForce AI Trading Agent](https://chrome.google.com/webstore/detail/tradeforce-ai-trading-age/abcdefghijklmnopqrstuvwxyz) page in the Chrome Web Store
3. Click the "Add to Chrome" button
4. Click "Add extension" in the confirmation dialog
5. The extension will be installed and the icon will appear in your browser toolbar

### Method 2: Install from Firefox Add-ons

1. Open Mozilla Firefox
2. Visit the [TradeForce AI Trading Agent](https://addons.mozilla.org/en-US/firefox/addon/tradeforce-ai-trading-agent/) page in Firefox Add-ons
3. Click the "Add to Firefox" button
4. Click "Add" in the confirmation dialog
5. The extension will be installed and the icon will appear in your browser toolbar

### Method 3: Manual Installation (Chrome)

1. Download the latest `.crx` file from the [Releases](https://github.com/tradeforce-ai/trading-agent/releases) page
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Drag and drop the downloaded `.crx` file onto the extensions page
5. Click "Add extension" when prompted
6. The extension will be installed and the icon will appear in your browser toolbar

### Method 4: Manual Installation (Firefox)

1. Download the latest `.xpi` file from the [Releases](https://github.com/tradeforce-ai/trading-agent/releases) page
2. Open Firefox and navigate to `about:addons`
3. Click the gear icon and select "Install Add-on From File..."
4. Select the downloaded `.xpi` file and click "Open"
5. Click "Add" when prompted
6. The extension will be installed and the icon will appear in your browser toolbar

### Method 5: Load Unpacked Extension (For Developers)

#### Chrome:

1. Clone the repository or download and extract the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked"
5. Select the `extension` directory from the extracted source code
6. The extension will be installed and the icon will appear in your browser toolbar

#### Firefox:

1. Clone the repository or download and extract the source code
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file in the `extension` directory
5. The extension will be installed temporarily and the icon will appear in your browser toolbar

## Post-Installation Setup

### 1. Initial Configuration

1. Click the TradeForce AI icon in your browser toolbar to open the extension popup
2. Click "Get Started" to begin the setup wizard
3. Follow the on-screen instructions to configure your preferences:
   - Select your preferred trading platforms
   - Set your risk tolerance level
   - Configure notification preferences
   - Set up auto-trading options

### 2. Connect Trading Platforms

#### Robinhood:

1. In the extension popup, go to "Connections" tab
2. Click "Connect" next to Robinhood
3. Enter your Robinhood credentials when prompted
4. Complete the OAuth 2.0 authentication process
5. Grant the necessary permissions for trading

#### Kraken:

1. In the extension popup, go to "Connections" tab
2. Click "Connect" next to Kraken
3. Log in to your Kraken account when prompted
4. Generate an API key with the following permissions:
   - Query funds
   - Query open orders & trades
   - Create & modify orders
5. Enter the API key and secret in the extension

#### AXIOM:

1. In the extension popup, go to "Connections" tab
2. Click "Connect" next to AXIOM
3. Log in to your AXIOM account when prompted
4. Authorize the TradeForce AI application
5. Complete the OAuth 2.0 authentication process

#### Phantom Wallet:

1. In the extension popup, go to "Connections" tab
2. Click "Connect" next to Phantom
3. Ensure Phantom wallet extension is installed
4. Approve the connection request in Phantom wallet
5. Select the accounts you want to use with TradeForce AI

### 3. Configure Trading Settings

1. In the extension popup, go to "Settings" tab
2. Configure the following trading parameters:
   - Maximum position size (% of portfolio)
   - Maximum number of concurrent positions
   - Stop-loss percentage
   - Take-profit percentage
   - Trading strategies to use
   - Trading hours
   - Asset classes to trade

### 4. Enable Auto-Trading (Optional)

1. In the extension popup, go to "Auto-Trading" tab
2. Toggle the "Enable Auto-Trading" switch
3. Select the platforms for auto-trading
4. Set the confidence threshold for automated trades
5. Configure the maximum daily loss limit
6. Click "Save" to apply your settings

## Troubleshooting

### Extension Not Appearing in Toolbar

- Check if the extension is enabled in your browser's extensions page
- Pin the extension to the toolbar by right-clicking the extension icon and selecting "Pin"
- Restart your browser

### Connection Issues

- Ensure your internet connection is stable
- Check if the trading platform's API is operational
- Verify that your API keys have the correct permissions
- Try reconnecting to the platform

### Authentication Errors

- Ensure your credentials are correct
- Check if your API keys are still valid
- Regenerate API keys if necessary
- Check if you have two-factor authentication enabled

### Trading Errors

- Verify that you have sufficient funds in your account
- Check if the asset is available for trading
- Ensure that the market is open for the asset you're trying to trade
- Check if your account has any restrictions

## Updating the Extension

### Automatic Updates

The extension will automatically update when a new version is available, as long as your browser's automatic extension updates are enabled.

### Manual Updates

1. Download the latest version from the [Releases](https://github.com/tradeforce-ai/trading-agent/releases) page
2. Uninstall the current version of the extension
3. Install the new version following the installation instructions above

## Uninstallation

### Chrome:

1. Right-click the TradeForce AI icon in your browser toolbar
2. Select "Remove from Chrome..."
3. Click "Remove" in the confirmation dialog

### Firefox:

1. Open Firefox and navigate to `about:addons`
2. Find TradeForce AI in the list of extensions
3. Click the three dots next to the extension and select "Remove"
4. Click "Remove" in the confirmation dialog

## Data Privacy and Security

- All API keys and credentials are stored securely in your browser's local storage
- Trading data is encrypted and stored locally
- No sensitive information is transmitted to external servers
- All connections to trading platforms use secure HTTPS and WSS protocols

## Support

If you encounter any issues or have questions, please:

1. Check the [FAQ](https://tradeforce.ai/faq) for common questions
2. Visit our [Support Center](https://tradeforce.ai/support) for detailed guides
3. Contact our support team at support@tradeforce.ai
4. Join our [Discord community](https://discord.gg/tradeforce) for community support
