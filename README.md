# Embassy Trade - Hybrid Web & Desktop Trading Platform

Embassy Trade is a cutting-edge trading simulation platform available as both a web application and a desktop application with enhanced features.

## Features

### Web Version
- Full trading simulation capabilities
- Portfolio tracking and management
- Risk management tools
- Trading bots and strategies

### Desktop Version (Beta)
All web features plus:
- **Offline Mode**: Trade even without internet connection
- **Moonshot Sniper**: Identify and invest in high-potential new coin listings
- **AI-Driven Auto-Trading**: Let our AI find and execute profitable trades
- **Integrated Feedback System**: Submit bug reports with auto-patching capability
- **System Tray Integration**: Quick access to features without opening the main window

## Getting Started

### Web Version

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3008](http://localhost:3008) with your browser.

### Desktop Version

#### Development

To run the desktop app in development mode:

```bash
# Run in development mode
npm run electron

# Build for your platform
npm run electron:build

# Build for specific platforms
npm run electron:win    # Windows
npm run electron:mac    # macOS
npm run electron:linux  # Linux
```

#### Installation

Download the latest desktop app installer for your platform:

- **Windows**: Download the .exe installer and follow the installation wizard
- **macOS**: Download the .dmg file, open it, and drag the app to your Applications folder
- **Linux**: 
  - AppImage: Download, make executable (`chmod +x embassy-trade-desktop-*.AppImage`), and run
  - Debian: Download the .deb file and install with `sudo dpkg -i embassy-trade-desktop-*.deb`

## Desktop App-Specific Features

### Moonshot Sniper

The Moonshot Sniper feature helps you identify high-potential coins with upcoming listings or major announcements:

1. Click the Moonshot Sniper button in the floating action menu
2. Browse the list of upcoming coin listings
3. Choose your investment amount ($5 or $10)
4. Click "Invest" to snipe the coin before its major listing event

### AI-Driven Auto-Trading

Let our AI algorithm find and execute profitable trades:

1. Click the Auto-Trade button in the floating action menu
2. Wait for the AI to analyze market conditions
3. Review the trading opportunities identified by our AI
4. Choose trades to execute automatically

### Feedback System

The desktop app includes an integrated feedback system:

1. Click the Feedback button in the floating action menu
2. Select the type of feedback (Bug Report, Feature Request, etc.)
3. Enter your feedback details
4. Submit the form

*Bug reports in the desktop app are automatically analyzed and may be patched without requiring an app update.*

### System Tray Features

When minimized, the desktop app continues running in the system tray:

- Right-click the tray icon to access quick actions
- Toggle auto-trading on/off
- Open Moonshot Sniper
- Access the web version directly
- Quit the application

## Online/Offline Mode

The desktop app is designed to work both online and offline:

- **Online Mode**: Connects to our servers and uses the same interface as the web version
- **Offline Mode**: Uses local resources to provide trading simulation capabilities even without internet

## Building for Production

To build the desktop app for production:

1. Update version in package.json
2. Build for all platforms:
   ```bash
   npm run electron:build
   ```
3. Find installers in the `dist` folder

## Deployment

### Web Version

The web version is automatically deployed on Vercel.

### Desktop Version

Desktop app releases are managed through GitHub Actions. To create a new release:

1. Push to the `desktop-release` branch or create a tag (e.g., `v0.2.0`)
2. GitHub Actions will build installers for all platforms
3. A draft release will be created in GitHub

## Technologies Used

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Express, Node.js
- **Desktop**: Electron, Electron Builder
- **Trading Algorithms**: Python
- **Testing**: Jest, Cypress

## License

This project is proprietary software. All rights reserved.
