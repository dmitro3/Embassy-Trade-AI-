import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import * as Sentry from '@sentry/nextjs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Error log file path
const errorLogPath = path.join(logsDir, 'frontend-errors.log');

/**
 * API route handler for reporting frontend errors
 * This endpoint receives error reports from the ErrorBoundary component
 * and logs them to a file and/or database, and reports to Sentry
 */
export async function POST(request) {
  // Create a transaction for this API call
  const transaction = Sentry.startNewTrace({
    name: 'report-error-api',
    op: 'api.request'
  });
  
  try {
    // Parse request body
    const body = await request.json();
    const { error, stack, componentStack, url, timestamp, sentryEventId } = body;
    
    if (!error) {
      transaction.setStatus('failed_precondition');
      transaction.finish();
      
      return NextResponse.json(
        { success: false, error: 'Missing required error data' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for this error
    const errorId = sentryEventId || uuidv4();
    
    // Format the error for logging
    const formattedError = {
      id: errorId,
      timestamp: timestamp || new Date().toISOString(),
      error,
      stack,
      componentStack,
      url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    };
    
    // Log to console
    console.error(`[FRONTEND ERROR] ${formattedError.error}`);
    
    // Write to log file
    const logEntry = JSON.stringify(formattedError) + '\n';
    fs.appendFileSync(errorLogPath, logEntry);
    
    // If this error wasn't already reported to Sentry, report it now
    if (!sentryEventId) {
      Sentry.captureException(new Error(error), {
        contexts: {
          errorReport: {
            stack,
            componentStack,
            url,
            timestamp: formattedError.timestamp
          }
        },
        tags: {
          source: 'error-report-api',
          errorId
        }
      });
    }
    
    // In a production environment, you would also store this in a database
    // For now, we'll just log it to a file
    
    // Finish the transaction successfully
    transaction.setStatus('ok');
    transaction.finish();
    
    // Return success with the error ID
    return NextResponse.json({ 
      success: true, 
      errorId 
    });
  } catch (error) {
    console.error('Error processing frontend error report:', error);
    
    // Capture the error in Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'report-error-api'
      }
    });
    
    // Set transaction status to error and finish it
    if (transaction) {
      transaction.setStatus('internal_error');
      transaction.finish();
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
