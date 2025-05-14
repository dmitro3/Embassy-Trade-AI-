import { connectToDatabase } from '../../../../lib/mongodb';

/**
 * API Route: User Profile Health Check
 * 
 * Endpoint for checking the health of user profile MongoDB collection
 */
export async function GET() {
  try {
    const start = performance.now();
    const connection = await connectToDatabase();
    const db = connection.db;
    
    // Check user profiles collection existence and basic stats
    const collections = await db.listCollections({ name: 'user_profiles' }).toArray();
    const hasUserProfilesCollection = collections.length > 0;
    
    let userCount = 0;
    let activeUsers = 0;
    let recentlyActiveUsers = [];
    
    if (hasUserProfilesCollection) {
      // Get count of users
      userCount = await db.collection('user_profiles').countDocuments();
      
      // Get count of active users (logged in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      activeUsers = await db.collection('user_profiles').countDocuments({
        lastLoginAt: { $gte: thirtyDaysAgo }
      });
      
      // Get 5 most recently active users
      recentlyActiveUsers = await db.collection('user_profiles')
        .find({})
        .sort({ lastLoginAt: -1 })
        .limit(5)
        .project({ 
          username: 1, 
          email: 1, 
          lastLoginAt: 1,
          profileCreatedAt: 1,
          walletConnected: 1 
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
        exists: hasUserProfilesCollection,
        userCount,
        activeUsers,
        recentlyActiveUsers: recentlyActiveUsers.map(user => ({
          ...user,
          // Mask email for privacy
          email: user.email ? user.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)) : null
        }))
      },
      performance: {
        responseTimeMs: responseTime
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('User profile health check error:', error);
    
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
