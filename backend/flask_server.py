"""
Flask server for EmbassyTrade API endpoints
This server runs alongside the Node.js server to provide additional API endpoints
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import random
import logging
import json
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("flask_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("flask_server")

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Mock data for development
mock_trade_data = {
    "markets": [
        {"symbol": "SOL/USD", "price": 138.42, "change24h": 2.5, "volume": 1250000},
        {"symbol": "BTC/USD", "price": 62150.50, "change24h": -0.8, "volume": 28500000},
        {"symbol": "ETH/USD", "price": 3291.14, "change24h": 1.2, "volume": 15800000},
    ],
    "recommendations": [
        {
            "type": "buy",
            "asset": "SOL",
            "price": 138.42,
            "confidence": 0.85,
            "reason": "Strong momentum with increasing volume",
            "stopLoss": 132.50,
            "takeProfit": 150.00
        },
        {
            "type": "sell",
            "asset": "BTC",
            "price": 62150.50,
            "confidence": 0.72,
            "reason": "Overbought on daily timeframe",
            "stopLoss": 64000.00,
            "takeProfit": 58000.00
        }
    ],
    "userStats": {
        "totalTrades": 24,
        "winRate": 68.5,
        "avgProfit": 12.3,
        "balance": 1250.75
    }
}

@app.route('/api/tradeform-data', methods=['GET'])
def get_tradeform_data():
    """
    GET /api/tradeform-data
    Returns trade form data for the frontend
    """
    try:
        logger.info("TradeForm data requested")
        
        # Add a small delay to simulate network latency
        time.sleep(0.8)
        
        # Add a timestamp to the mock data
        response_data = mock_trade_data.copy()
        response_data["timestamp"] = datetime.now().isoformat()
        
        # Log the response for debugging
        logger.info(f"Returning TradeForm data: {json.dumps(response_data)}")
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error fetching TradeForm data: {str(e)}")
        return jsonify({"error": "Failed to fetch trade data"}), 500

@app.route('/api/tradeform-data/execute', methods=['POST'])
def execute_trade():
    """
    POST /api/tradeform-data/execute
    Executes a trade based on the provided parameters
    """
    try:
        data = request.json
        asset = data.get('asset')
        trade_type = data.get('type')
        amount = data.get('amount')
        price = data.get('price')
        
        if not asset or not trade_type or not amount:
            return jsonify({"error": "Missing required parameters"}), 400
        
        logger.info(f"Trade execution requested: {json.dumps(data)}")
        
        # Add a delay to simulate trade execution
        time.sleep(1.2)
        
        # Generate a mock trade result
        trade_result = {
            "success": True,
            "tradeId": f"trade_{int(time.time())}",
            "asset": asset,
            "type": trade_type,
            "amount": amount,
            "executedPrice": price or next((m["price"] for m in mock_trade_data["markets"] if asset in m["symbol"]), 100),
            "timestamp": datetime.now().isoformat(),
            "fee": round(float(amount) * 0.001, 4),  # 0.1% fee
            "status": "executed"
        }
        
        logger.info(f"Trade executed: {json.dumps(trade_result)}")
        
        return jsonify(trade_result)
    except Exception as e:
        logger.error(f"Error executing trade: {str(e)}")
        return jsonify({"error": "Failed to execute trade"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    GET /health
    Health check endpoint
    """
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "EmbassyTrade Flask API"
    })

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Starting Flask server on port {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
