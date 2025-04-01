#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trading_signals import ProfessionalTradingStrategy

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

async def test_shyft_connection():
    """Test Shyft WebSocket connection by monitoring the first 10 messages"""
    strategy = ProfessionalTradingStrategy()
    message_count = 0
    max_messages = 10

    if not await strategy.init_websocket():
        logging.error("Failed to establish WebSocket connection")
        return False

    try:
        while message_count < max_messages:
            if not strategy.ws:
                logging.error("WebSocket connection lost")
                return False

            msg = await strategy.ws.recv()
            data = json.loads(msg)
            message_count += 1
            
            logging.info(f"Message {message_count}/{max_messages}:")
            logging.info(json.dumps(data, indent=2))

            if "result" in data and "value" in data["result"]:
                value = data["result"]["value"]
                if "data" in value:
                    try:
                        price = float(value["data"]["price"])
                        volume = float(value["data"]["volume"])
                        logging.info(f"✓ Valid price update: {price} (volume: {volume})")
                    except (ValueError, KeyError) as e:
                        logging.warning(f"× Invalid price data format: {e}")
            else:
                logging.info("× Message doesn't contain price data")

        logging.info("✓ Successfully received and validated 10 messages")
        return True

    except Exception as e:
        logging.error(f"Error during WebSocket test: {e}")
        return False
    finally:
        if strategy.ws:
            await strategy.ws.close()

if __name__ == "__main__":
    result = asyncio.run(test_shyft_connection())
    sys.exit(0 if result else 1)