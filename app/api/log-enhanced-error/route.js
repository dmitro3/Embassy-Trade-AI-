// Enhanced API route for comprehensive error reporting

import { connectToDatabase } from '../../../lib/mongodb';

/**
 * API Route: Enhanced Error Reporting
 * 
 * Advanced error logging endpoint that aggregates errors,
 * identifies patterns, and provides intelligent feedback
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Extract data from request
    const { errors, url, userAgent } = body;
    
    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No errors provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Connect to database
    const db = (await connectToDatabase()).db;
    
    // Process and store each error with additional metadata
    const processedErrors = errors.map(error => {
      // Extract filename and line number if available
      const stackLines = (error.message || '').split('\n');
      let fileName = 'unknown';
      let lineNumber = 'unknown';
      
      // Try to extract file info from the stack trace
      for (const line of stackLines) {
        const fileMatch = line.match(/at\s+.*\s+\((.*):(\d+):(\d+)\)/);
        if (fileMatch) {
          fileName = fileMatch[1].split('/').pop();
          lineNumber = fileMatch[2];
          break;
        }
      }
      
      // Classify error type based on content
      let errorType = 'unknown';
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('React') || errorMessage.includes('component') || 
          errorMessage.includes('props') || errorMessage.includes('render')) {
        errorType = 'react';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('API') || 
                errorMessage.includes('http') || errorMessage.includes('response')) {
        errorType = 'api';
      } else if (errorMessage.includes('MongoDB') || errorMessage.includes('database')) {
        errorType = 'database';
      } else if (errorMessage.includes('Solana') || errorMessage.includes('wallet') || 
                errorMessage.includes('blockchain')) {
        errorType = 'blockchain';
      } else if (errorMessage.includes('socket') || errorMessage.includes('connection') || 
                errorMessage.includes('network')) {
        errorType = 'network';
      }
      
      // Determine error severity
      let severity = 'medium';
      
      if (errorMessage.includes('uncaught') || errorMessage.includes('fatal')) {
        severity = 'critical';
      } else if (errorMessage.includes('failed') || errorMessage.includes('error')) {
        severity = 'high';
      } else if (errorMessage.includes('warning') || errorMessage.includes('deprecated')) {
        severity = 'low';
      }
      
      return {
        ...error,
        timestamp: error.timestamp || new Date().toISOString(),
        url,
        userAgent,
        fileName,
        lineNumber,
        type: errorType,
        severity,
        processedAt: new Date().toISOString()
      };
    });
    
    // Store in MongoDB
    await db.collection('errors').insertMany(processedErrors);
    
    // Log to console for server-side visibility
    console.error(`[CLIENT ERROR] ${url} - ${processedErrors.length} errors`);
    processedErrors.forEach((error, i) => {
      console.error(`- [${error.type.toUpperCase()}] ${error.message?.split('\n')[0]}`);
    });
    
    // Get error statistics for response
    const stats = {
      total: await db.collection('errors').countDocuments(),
      lastHour: await db.collection('errors').countDocuments({
        timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
      }),
      byType: {}
    };
    
    // Get counts by error type
    const types = ['react', 'api', 'database', 'blockchain', 'network', 'unknown'];
    await Promise.all(types.map(async (type) => {
      stats.byType[type] = await db.collection('errors').countDocuments({ type });
    }));
    
    // Send enhanced response
    return new Response(JSON.stringify({
      success: true,
      processed: processedErrors.length,
      stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing client error logs:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
