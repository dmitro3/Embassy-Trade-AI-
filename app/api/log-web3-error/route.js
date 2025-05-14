// API route to log Web3 and blockchain-related errors

import { connectToDatabase } from '../../../lib/mongodb';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Extract data from request
    const { error, matchedError, url, userAgent } = body;
    
    // Log to server console
    console.error(`[WEB3 ERROR] ${timestamp} - ${url}`);
    console.error(`- Message: ${error.message}`);
    console.error(`- Code: ${error.code || 'N/A'}`);
    if (matchedError) {
      console.error(`- Friendly: ${matchedError.friendly}`);
      console.error(`- Severity: ${matchedError.severity}`);
    }
    
    try {
      // Store in MongoDB for analytics and debugging
      const db = (await connectToDatabase()).db;
      
      await db.collection('web3_errors').insertOne({
        timestamp: new Date(),
        error: {
          message: error.message,
          code: error.code,
          data: error.data,
          stack: error.stack
        },
        matchedError,
        url,
        userAgent
      });
    } catch (dbError) {
      // Just log the DB error but don't fail the whole request
      console.error('Failed to save Web3 error to database:', dbError);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing Web3 error log:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
