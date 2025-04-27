# TradeForm Component

The TradeForm component is a new feature in the EmbassyTrade platform that provides a simplified interface for trading with real-time data.

## Features

- Real-time market data display
- Trading recommendations with confidence scores
- User statistics tracking
- Error handling with timeout protection
- Responsive design for all devices

## Technical Implementation

The TradeForm component is implemented as a Next.js page that communicates with a Flask backend API. The component uses the following technologies:

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Flask API, Node.js Express API
- **Data**: Mock data for development, will connect to real trading APIs in production

## API Endpoints

The TradeForm component uses the following API endpoints:

- `GET /api/tradeform-data`: Retrieves market data, recommendations, and user statistics
- `POST /api/tradeform-data/execute`: Executes a trade with the specified parameters

## Setup and Running

### Prerequisites

- Node.js 16+ for the Next.js frontend
- Python 3.8+ for the Flask backend
- MongoDB for the Node.js backend

### Installation

1. Install Node.js dependencies:
   ```
   npm install
   ```

2. Install Python dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```

### Running the Application

Use the provided batch script to start both servers:

```
.\start-servers.bat
```

This will:
1. Start the Flask server on port 5000
2. Start the Next.js development server on port 3008

## Usage

1. Navigate to `http://localhost:3008/tradeform` in your browser
2. Connect your wallet using the "Connect Wallet" button
3. View real-time market data and trading recommendations
4. Execute trades directly from the interface

## Error Handling

The TradeForm component includes comprehensive error handling:

- API request timeouts (10 seconds)
- Error state UI with retry functionality
- Detailed error logging for debugging
- Graceful degradation when services are unavailable

## Future Enhancements

- Integration with real trading APIs
- Advanced trading algorithms
- Historical performance tracking
- Portfolio management features
- Mobile app integration

## Troubleshooting

If you encounter issues with the TradeForm component:

1. Check that both servers are running (Flask on port 5000, Next.js on port 3008)
2. Verify your wallet connection
3. Check the browser console for error messages
4. Check the server logs for backend errors
