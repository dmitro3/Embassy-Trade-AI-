import os
from alpaca_trade_api.rest import REST
from alpaca_trade_api.stream import Stream
import asyncio
from dotenv import load_dotenv

load_dotenv()

class AlpacaClient:
    def __init__(self):
        self.api_key = os.getenv('ALPACA_API_KEY')
        self.api_secret = os.getenv('ALPACA_API_SECRET')
        self.base_url = "https://paper-api.alpaca.markets/v2"
        
        if not self.api_key or not self.api_secret:
            raise ValueError("Alpaca API credentials not found in environment variables")
        
        self.api = REST(
            key_id=self.api_key,
            secret_key=self.api_secret,
            base_url=self.base_url
        )
        
        self.stream = Stream(
            key_id=self.api_key,
            secret_key=self.api_secret,
            base_url=self.base_url,
            data_feed='iex'
        )

    async def get_account(self):
        """Get account information."""
        return self.api.get_account()

    async def place_order(self, symbol, qty, side, type='market', time_in_force='gtc'):
        """Place a trade order."""
        try:
            order = self.api.submit_order(
                symbol=symbol,
                qty=qty,
                side=side,
                type=type,
                time_in_force=time_in_force
            )
            return order
        except Exception as e:
            print(f"Error placing order: {e}")
            return None

    async def get_position(self, symbol):
        """Get position for a specific symbol."""
        try:
            position = self.api.get_position(symbol)
            return position
        except Exception as e:
            print(f"Error getting position: {e}")
            return None

    async def subscribe_to_trades(self, symbols, callback):
        """Subscribe to real-time trade updates."""
        async def trade_callback(t):
            await callback(t)

        self.stream.subscribe_trades(trade_callback, symbols)
        await self.stream.run()