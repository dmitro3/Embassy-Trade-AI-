'use server';

import { NextResponse } from 'next/server';
// Using console for logging instead of logger module

// In-memory storage for bot logs (in production, use Redis or another database)
let botLogs = [];
const MAX_LOGS = 100;

/**
 * GET: Retrieve bot logs
 */
export async function GET() {
  try {
    return NextResponse.json(botLogs, { status: 200 });
  } catch (error) {
    logger.error(`Error retrieving bot logs: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Add a new bot log entry
 */
export async function POST(request) {
  try {
    const logEntry = await request.json();
    
    // Add timestamp if missing
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }
    
    // Add to beginning of array (most recent first)
    botLogs.unshift(logEntry);
    
    // Limit size of logs array
    if (botLogs.length > MAX_LOGS) {
      botLogs = botLogs.slice(0, MAX_LOGS);
    }
    
    // Log to server logs as well
    logger.info(`Bot log: ${JSON.stringify(logEntry)}`);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error(`Error adding bot log: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
