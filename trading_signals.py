import os
import requests
import datetime
import logging
import time
import numpy as np
import websockets
import asyncio
import json
import uuid
from typing import List, Dict, Optional
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
from gql.transport.websockets import WebsocketsTransport
from trading.ai_agent import AIAgent

# Configure logging with file output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/trading.log'),
        logging.StreamHandler()
    ]
)

# API configuration
API_KEY = os.getenv('ALPACA_API_KEY', 'PKFRFG4PWMD69IUUCS6U')
BASE_URL = 'https://paper-api.alpaca.markets/v2'
BIRDEYE_API_KEY = os.getenv('BIRDEYE_API_KEY', 'mock_key')
SHYFT_API_KEY = "oRVaHOZ1n2McZ0BW"
SHYFT_WS_URL = f"wss://devnet-rpc.shyft.to?api_key={SHYFT_API_KEY}"
SHYFT_GRAPHQL_URL = f"https://programs.shyft.to/v0/graphql/?api_key={SHYFT_API_KEY}&network=devnet"
EMB_TOKEN_ADDRESS = 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump'
EMBAI_TOKEN_ADDRESS = "NEW_EMBAI_ADDRESS"  # Placeholder for future live trading

# Mock trading configuration
MOCK_TRADE_FEE = 0.1  # 0.1 EMB per trade
MOCK_BOT_FEE = 1.0   # 1.0 EMB per day
MAX_RECONNECT_ATTEMPTS = 5
RECONNECT_DELAY = 5  # seconds

class ProfessionalTradingStrategy:
    def __init__(self, network: str = "devnet"):
        self.network = network
        self.prices: List[float] = []
        self.pending_trades: Dict = {}
        self.ai_agent = AIAgent()
        self.websocket = None

    async def fetch_historical_data(self) -> bool:
        """Fetch historical price data from Shyft"""
        try:
            # TODO: Implement actual historical data fetching
            # For now, use mock data
            self.prices = [1.0 + np.random.normal(0, 0.02) for _ in range(250)]
            for price in self.prices:
                self.ai_agent.add_price(price)
            return True
        except Exception as e:
            logging.error(f"Error fetching historical data: {e}")
            return False

    async def process_websocket_message(self):
        """Process real-time price updates from Shyft WebSocket"""
        reconnect_attempts = 0
        
        while reconnect_attempts < MAX_RECONNECT_ATTEMPTS:
            try:
                async with websockets.connect(SHYFT_WS_URL) as websocket:
                    self.websocket = websocket
                    subscribe_msg = {
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "subscribeProgram",
                        "params": [EMB_TOKEN_ADDRESS]
                    }
                    await websocket.send(json.dumps(subscribe_msg))
                    
                    while True:
                        msg = await websocket.recv()
                        data = json.loads(msg)
                        if "result" in data and isinstance(data["result"], dict):
                            price = float(data["result"].get("price", 0))
                            if price > 0:
                                self.prices.append(price)
                                self.ai_agent.add_price(price)
                                
            except Exception as e:
                logging.error(f"WebSocket error: {e}")
                reconnect_attempts += 1
                await asyncio.sleep(RECONNECT_DELAY)
                
        logging.error("Max reconnection attempts reached")
        return False

    def get_ai_recommendation(self) -> Dict:
        """Get trading recommendation from AI agent"""
        return self.ai_agent.get_recommendation()

async def generate_signals(wallet_address: Optional[str] = None, network: str = "devnet") -> Dict:
    """Generate trading signals using real-time Shyft data and AI recommendations"""
    strategy = ProfessionalTradingStrategy(network=network)
    
    if not await strategy.fetch_historical_data():
        return {
            "type": "error",
            "message": "Failed to fetch historical data",
            "timestamp": datetime.datetime.now().isoformat()
        }

    websocket_task = asyncio.create_task(strategy.process_websocket_message())
    await asyncio.sleep(1)  # Wait for initial data

    # Get AI recommendation
    recommendation = strategy.get_ai_recommendation()
    
    if recommendation["action"] in ["buy", "sell"]:
        trade_id = str(uuid.uuid4())
        trade = {
            "id": trade_id,
            "type": recommendation["action"].upper(),
            "asset": "EMB/USD",
            "entry_price": recommendation["entry_price"],
            "take_profit": recommendation["take_profit"],
            "quantity": 100,  # Mock quantity
            "timestamp": recommendation["timestamp"],
            "confidence": recommendation["confidence"],
            "reasoning": recommendation["reasoning"]
        }
        strategy.pending_trades[trade_id] = trade
        return {
            "type": "trade_prompt",
            "trade": trade,
            "confidence": recommendation["confidence"],
            "powered_by": "AIXBT"
        }

    await websocket_task

    return {
        "type": "no_trade",
        "message": recommendation["reasoning"],
        "timestamp": datetime.datetime.now().isoformat(),
        "powered_by": "AIXBT"
    }

def save_results(signal_data: Dict):
    """Save trading signals and results"""
    try:
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        directory = f"trades/{today}/"
        os.makedirs(directory, exist_ok=True)
        timestamp = datetime.datetime.now().strftime('%H-%M-%S')
        file_path = os.path.join(directory, f"trade_{timestamp}.txt")
        
        with open(file_path, 'w') as file:
            for key, value in signal_data.items():
                file.write(f"{key}: {value}\n")
        logging.info(f"Results saved to {file_path}")
    except Exception as e:
        logging.error(f"Error saving results: {e}")

def main():
    """Main function for continuous signal generation and trade execution"""
    strategy = ProfessionalTradingStrategy()
    
    while True:
        try:
            signals = asyncio.run(generate_signals())
            print(json.dumps(signals), flush=True)
            
            if signals["type"] == "trade_prompt":
                try:
                    response = json.loads(input())
                    if response.get("decision") == "accept":
                        result = strategy.execute_trade(response.get("id"))
                        print(json.dumps({
                            "type": "trade_result",
                            "result": result,
                            "powered_by": "AIXBT"
                        }), flush=True)
                    else:
                        print(json.dumps({
                            "type": "trade_skipped",
                            "trade_id": response.get("id"),
                            "powered_by": "AIXBT"
                        }), flush=True)
                except Exception as e:
                    logging.error(f"Error processing trade response: {e}")
            
            time.sleep(10)  # Check for new signals every 10 seconds
            
        except Exception as e:
            logging.error(f"Error in main loop: {e}")
            time.sleep(60)  # Wait before retrying

if __name__ == "__main__":
    main()