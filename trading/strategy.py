import aiohttp
import asyncio
import json
import os
import random
from dotenv import load_dotenv
from trading.alpaca_client import AlpacaClient
from datetime import datetime, timedelta

load_dotenv()

class TradingStrategy:
    def __init__(self):
        self.target_symbol = "EMB"
        self.mock_mode = True  # Default to mock mode for development
        self.base_price = 0.075  # Base price for EMB token
        self.volatility = 0.02   # 2% volatility
        self.last_signal_time = None
        self.last_price = None
        self.trend = random.choice(['bullish', 'bearish', 'sideways'])
        self.trend_strength = random.random()  # 0-1 scale
        
        # Available strategies
        self.strategies = [
            "Momentum Scalping",
            "RSI Divergence",
            "MA Crossover",
            "Volume Profile",
            "Support/Resistance"
        ]

    def _generate_realistic_price(self):
        """Generate a realistic price movement based on trend and volatility"""
        if not self.last_price:
            self.last_price = self.base_price
            
        # Add trend bias
        trend_factor = {
            'bullish': 0.6,
            'bearish': -0.6,
            'sideways': 0
        }[self.trend] * self.trend_strength
        
        # Generate random price movement
        price_change = random.uniform(-self.volatility, self.volatility)
        price_change += trend_factor * self.volatility
        
        new_price = self.last_price * (1 + price_change)
        self.last_price = new_price
        
        # Occasionally change trend
        if random.random() < 0.1:  # 10% chance to change trend
            self.trend = random.choice(['bullish', 'bearish', 'sideways'])
            self.trend_strength = random.random()
            
        return round(new_price, 6)

    def _calculate_signal_confidence(self, price_change):
        """Calculate signal confidence based on price movement and trend"""
        base_confidence = random.uniform(0.6, 0.9)
        trend_alignment = 0.1 if (
            (self.trend == 'bullish' and price_change > 0) or
            (self.trend == 'bearish' and price_change < 0)
        ) else -0.1
        
        return min(0.95, max(0.5, base_confidence + trend_alignment))

    def generate_mock_signals(self):
        """Generate mock trading signals for development"""
        current_time = datetime.now()
        
        # Only generate new signals every minute
        if (self.last_signal_time and 
            (current_time - self.last_signal_time) < timedelta(minutes=1)):
            return None
            
        self.last_signal_time = current_time
        current_price = self._generate_realistic_price()
        
        # Calculate price change
        price_change = ((current_price - self.base_price) / self.base_price 
                       if self.base_price else 0)
        
        # Determine action based on trend and price movement
        if abs(price_change) < 0.005:  # Less than 0.5% change
            action = "hold"
            quantity = 0
        else:
            action = "buy" if price_change < 0 else "sell"
            quantity = random.randint(50, 200)
        
        confidence = self._calculate_signal_confidence(price_change)
        strategy = random.choice(self.strategies)
        
        return [{
            "symbol": "EMB",
            "action": action,
            "price": current_price,
            "quantity": quantity,
            "confidence": confidence,
            "timestamp": current_time.isoformat(),
            "strategy": strategy,
            "timeframe": "1m",
            "indicators": {
                "trend": self.trend,
                "trend_strength": self.trend_strength,
                "volatility": self.volatility
            }
        }]

    async def get_mock_account(self):
        """Generate mock account data"""
        return {
            "balance": 10000.00,
            "currency": "USD",
            "positions": [
                {
                    "symbol": "EMB",
                    "quantity": 1000,
                    "avg_entry_price": self.base_price
                }
            ],
            "trading_enabled": True,
            "margin_ratio": 0.5,
            "buying_power": 5000.00
        }

    async def start(self):
        """Start the trading strategy and return initial signals"""
        try:
            if self.mock_mode:
                account = await self.get_mock_account()
                signals = self.generate_mock_signals()
                
                if not signals:  # No new signals
                    return {
                        'account': account,
                        'signals': [
                            {
                                "symbol": "EMB",
                                "action": "hold",
                                "price": self.last_price or self.base_price,
                                "quantity": 0,
                                "confidence": 0.5,
                                "timestamp": datetime.now().isoformat(),
                                "strategy": "Wait for Signal",
                                "timeframe": "1m"
                            }
                        ],
                        'status': 'active',
                        'mode': 'mock'
                    }
                
                return {
                    'account': account,
                    'signals': signals,
                    'status': 'active',
                    'mode': 'mock'
                }
            else:
                # Real API integration code here (currently disabled)
                raise NotImplementedError("Live trading not yet implemented")
            
        except Exception as e:
            return {
                'error': str(e),
                'status': 'error',
                'mode': 'mock'
            }