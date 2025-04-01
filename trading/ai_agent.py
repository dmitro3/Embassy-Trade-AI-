import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple, Optional

class AIAgent:
    def __init__(self, short_window: int = 50, long_window: int = 200):
        self.short_window = short_window
        self.long_window = long_window
        self.prices: List[float] = []
        
    def calculate_moving_average(self, window: int) -> Optional[float]:
        """Calculate moving average for the given window size"""
        if len(self.prices) < window:
            return None
        return np.mean(self.prices[-window:])
    
    def add_price(self, price: float) -> None:
        """Add a new price data point"""
        self.prices.append(price)
    
    def get_recommendation(self) -> Dict:
        """Generate trading recommendation based on MA crossover strategy"""
        if len(self.prices) < self.long_window:
            return {
                "action": "hold",
                "reasoning": "Insufficient data for prediction",
                "entry_price": None,
                "take_profit": None,
                "confidence": 0.0,
                "timestamp": datetime.now().isoformat()
            }
        
        current_price = self.prices[-1]
        prev_price = self.prices[-2]
        short_ma = self.calculate_moving_average(self.short_window)
        long_ma = self.calculate_moving_average(self.long_window)
        
        if short_ma is None or long_ma is None:
            return {
                "action": "hold",
                "reasoning": "Error calculating moving averages",
                "entry_price": None,
                "take_profit": None,
                "confidence": 0.0,
                "timestamp": datetime.now().isoformat()
            }
            
        # Calculate confidence based on MA difference
        ma_diff = abs(short_ma - long_ma) / long_ma
        confidence = min(0.95, max(0.5, 0.7 + ma_diff))
        
        if short_ma > long_ma and current_price > prev_price:
            take_profit = current_price * 1.05  # 5% profit target
            return {
                "action": "buy",
                "reasoning": f"Short-term MA ({short_ma:.2f}) above long-term MA ({long_ma:.2f}), price increasing",
                "entry_price": current_price,
                "take_profit": take_profit,
                "confidence": confidence,
                "timestamp": datetime.now().isoformat()
            }
        elif short_ma < long_ma and current_price < prev_price:
            take_profit = current_price * 0.95  # 5% profit target for shorts
            return {
                "action": "sell",
                "reasoning": f"Short-term MA ({short_ma:.2f}) below long-term MA ({long_ma:.2f}), price decreasing",
                "entry_price": current_price,
                "take_profit": take_profit,
                "confidence": confidence,
                "timestamp": datetime.now().isoformat()
            }
            
        return {
            "action": "hold",
            "reasoning": "No clear trend detected",
            "entry_price": None,
            "take_profit": None,
            "confidence": confidence,
            "timestamp": datetime.now().isoformat()
        }