import { connectToDatabase } from '../../../lib/mongodb';

/**
 * API Route: MongoDB Status
 * 
 * Endpoint for checking MongoDB connection status
 * This is a diagnostic endpoint that helps troubleshoot MongoDB connection issues
 */
export async function GET() {
  try {
    // Try to connect to MongoDB
    const start = performance.now();
    const conn = await connectToDatabase();
    const end = performance.now();
    const responseTime = Math.round(end - start);
    
    // Success response
    return new Response(JSON.stringify({
      connected: true,
      details: {
        responseTime: `${responseTime}ms`,
        dbName: conn.db.databaseName,
        client: {
          connected: conn.client.topology?.isConnected() || conn.client.isConnected?.() || 'unknown',
          hosts: conn.client.options?.hosts ? conn.client.options.hosts.map(h => `${h.host}:${h.port}`).join(', ') : 'unknown'
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Error response
    console.error('MongoDB connection error:', error);
    return new Response(JSON.stringify({
      connected: false,
      details: {
        error: error.message,
        code: error.code,
        name: error.name
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
