// Mock Drift API integration for development
const MOCK_MARKETS = [
  { market: 'SOL-PERP', price: 150.25, leverage: 20 },
  { market: 'BTC-PERP', price: 68750.50, leverage: 10 },
  { market: 'ETH-PERP', price: 3890.75, leverage: 15 }
];

export async function fetchDriftMarkets() {
  // TODO: Replace with actual Drift API call
  return MOCK_MARKETS;
}

export async function placeDriftOrder(walletAddress, market, side, amount, leverage) {
  // TODO: Replace with actual Drift API call
  return {
    orderId: Math.random().toString(36).substring(7),
    market,
    side,
    amount,
    leverage,
    status: 'filled',
    timestamp: Date.now()
  };
}

export async function getDriftMarketData(market) {
  // TODO: Replace with actual Drift API call
  const mockMarket = MOCK_MARKETS.find(m => m.market === market);
  return {
    ...mockMarket,
    volume24h: 1250000,
    openInterest: 750000,
    fundingRate: 0.0002
  };
}

export async function getDriftPositions(walletAddress) {
  // TODO: Replace with actual Drift API call
  return [
    {
      market: 'SOL-PERP',
      side: 'long',
      size: 10,
      leverage: 5,
      entryPrice: 145.50,
      markPrice: 150.25,
      pnl: 47.50,
      liquidationPrice: 130.25
    }
  ];
}