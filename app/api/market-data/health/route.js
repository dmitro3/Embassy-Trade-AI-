import { connectToDatabase } from '../../../../lib/mongodb';

/**
 * API Route: Market Data Health Check
 * 
 * Endpoint for checking the health of market data MongoDB collection
 */
export async function GET() {
  try {
    const start = performance.now();
    const connection = await connectToDatabase();
    const db = connection.db;
    
    // Check market data collection existence and basic stats
    const collections = await db.listCollections({ name: 'market_data' }).toArray();
    const hasMarketDataCollection = collections.length > 0;
    
    let dataPoints = 0;
    let latestEntries = [];
    let oldestEntry = null;
    let newestEntry = null;
    
    if (hasMarketDataCollection) {
      // Get count of data points
      dataPoints = await db.collection('market_data').countDocuments();
      
      // Get 5 most recent market data points
      latestEntries = await db.collection('market_data')
        .find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .project({ 
          symbol: 1, 
          price: 1, 
          volume: 1, 
          timestamp: 1,
          source: 1 
        })
        .toArray();
      
      // Get oldest and newest entries to determine data range
      const oldestDoc = await db.collection('market_data')
        .find({})
        .sort({ timestamp: 1 })
        .limit(1)
        .project({ timestamp: 1 })
        .toArray();
      
      const newestDoc = await db.collection('market_data')
        .find({})
        .sort({ timestamp: -1 })
        .limit(1)
        .project({ timestamp: 1 })
        .toArray();
      
      if (oldestDoc.length > 0) {
        oldestEntry = oldestDoc[0].timestamp;
      }
      
      if (newestDoc.length > 0) {
        newestEntry = newestDoc[0].timestamp;
      }
    }
    
    const end = performance.now();
    const responseTime = Math.round(end - start);
    
    return new Response(JSON.stringify({
      status: 'healthy',
      database: {
        connected: true,
        name: db.databaseName
      },
      collection: {
        exists: hasMarketDataCollection,
        dataPoints,
        latestEntries,
        oldestEntry,
        newestEntry,
        dataSpanDays: oldestEntry && newestEntry ? 
          Math.round((new Date(newestEntry) - new Date(oldestEntry)) / (1000 * 60 * 60 * 24)) : 
          null
      },
      performance: {
        responseTimeMs: responseTime
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Market data health check error:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message,
      errorCode: error.code || 'UNKNOWN',
      errorName: error.name
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
