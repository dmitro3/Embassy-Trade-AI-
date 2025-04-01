import asyncio
import json
import sys
from trading.strategy import TradingStrategy
import logging
from typing import Dict, Optional

async def run_trading_strategy() -> Dict:
    """Run the trading strategy with error handling and cleanup"""
    try:
        strategy = TradingStrategy()
        signal_data = await strategy.start()
        
        # Ensure proper JSON output for Express
        if isinstance(signal_data, str):
            signal_data = json.loads(signal_data)
            
        return signal_data
    except Exception as e:
        logging.error(f"Trading strategy error: {e}")
        return {"error": str(e)}

async def main():
    try:
        # Set up asyncio event loop with signal handlers
        loop = asyncio.get_event_loop()
        result = await run_trading_strategy()
        
        # Format output for the Express server
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    finally:
        # Cleanup
        tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

if __name__ == "__main__":
    asyncio.run(main())