import { connectToDatabase } from '../../../../lib/mongodb';

/**
 * API Route: Token Discovery Health Check
 * 
 * Endpoint for checking the health of token discovery MongoDB collection
 */
export async function GET() {
  try {
    const start = performance.now();
    const connection = await connectToDatabase();
    const db = connection.db;
    
    // Check token collection existence and basic stats
    const collections = await db.listCollections({ name: 'tokens' }).toArray();
    const hasTokenCollection = collections.length > 0;
    
    let tokenCount = 0;
    let recentTokens = [];
    
    if (hasTokenCollection) {
      // Get count of tokens
      tokenCount = await db.collection('tokens').countDocuments();
      
      // Get 5 most recent tokens
      recentTokens = await db.collection('tokens')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ 
          symbol: 1, 
          name: 1, 
          address: 1, 
          createdAt: 1,
          network: 1 
        })
        .toArray();
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
        exists: hasTokenCollection,
        tokenCount,
        recentTokens
      },
      performance: {
        responseTimeMs: responseTime
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Token discovery health check error:', error);
    
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
