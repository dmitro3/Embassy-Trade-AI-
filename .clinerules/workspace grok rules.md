 {
  "workspace": "TradeForce AI Trading System",
  "rules": [
    {
      "id": "tradeforce-connectivity-001",
      "description": "Ensure seamless connectivity with SHYFT, Birdeye, and Photon for real-time data and trade execution.",
      "action": "enforce",
      "details": {
        "dataSources": {
          "required": ["SHYFT", "Birdeye"],
          "realTime": {
            "enabled": true,
            "maxLatency": "500ms",
            "useWebSocket": true // For SHYFT
          }
        },
        "tradeExecution": {
          "photon": {
            "enabled": true,
            "secureKeyStorage": true
          },
          "phantom": {
            "enabled": true,
            "network": "devnet",
            "nonCustodial": true
          }
        },
        "fallback": {
          "enabled": false // No mock data, use real data only
        }
      }
    },
    {
      "id": "tradeforce-security-001",
      "description": "Implement advanced security measures for user authentication and data protection.",
      "action": "enforce",
      "details": {
        "authentication": {
          "methods": ["Google", "Apple"],
          "exclude": ["Twitter/X"],
          "tokenValidation": "Firebase Admin SDK",
          "sessionTimeout": "24h"
        },
        "apiKeys": {
          "storage": "encrypted",
          "encryptionMethod": "AES-256",
          "environmentVariables": true
        },
        "transactions": {
          "secureProtocol": "wss",
          "nonCustodial": true
        }
      }
    },
    {
      "id": "tradeforce-execution-001",
      "description": "Ensure high-frequency, AI-driven trade execution with a target win rate of 65%+.",
      "action": "enforce",
      "details": {
        "tradeExecution": {
          "modes": ["devnet"],
          "maxLatency": "500ms",
          "errorHandling": {
            "retryCount": 3,
            "backoff": "exponential"
          }
        },
        "aiSignals": {
          "indicators": ["Moving Average", "RSI"],
          "winRateTarget": "65%",
          "confidenceThreshold": "0.6"
        }
      }
    },
    {
      "id": "tradeforce-usability-001",
      "description": "Create an intuitive, responsive UI that democratizes trading for all users.",
      "action": "enforce",
      "details": {
        "interface": {
          "responsiveDesign": true,
          "darkTheme": true,
          "liveDataDisplay": true,
          "tradeExecutionButton": true,
          "signalDisplay": true,
          "tradeHistory": true
        },
        "onboarding": {
          "guidedTour": true,
          "authMethods": ["Google", "Apple"]
        },
        "accessibility": {
          "wcagCompliance": "2.1",
          "keyboardNavigation": true
        }
      }
    },
    {
      "id": "tradeforce-profitability-001",
      "description": "Optimize AI strategies to ensure profitable trades for all users.",
      "action": "enforce",
      "details": {
        "aiOptimization": {
          "backtesting": {
            "enabled": true,
            "historicalDataSources": ["SHYFT", "Birdeye"],
            "period": "30 days"
          },
          "strategyRefinement": {
            "enabled": true,
            "indicators": ["Moving Average", "RSI"],
            "targetWinRate": "65%"
          }
        },
        "riskManagement": {
          "stopLoss": true,
          "maxConcurrentTrades": 5,
          "positionSizing": "dynamic"
        }
      }
    },
    {
      "id": "tradeforce-cost-001",
      "description": "Avoid paid services outside the budget.",
      "action": "enforce",
      "details": {
        "exclude": ["SwarmNode", "Twitter/X Authentication"],
        "useFreeSystems": {
          "dataSources": ["SHYFT Devnet", "Birdeye Free Tier"],
          "authentication": ["Google", "Apple"]
        }
      }
    }
  ]
}