// app/api/logs/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');

// Helper to write logs to file
function writeToLogFile(logEntry) {
  const timestamp = new Date().toISOString();
  const formattedLog = `${timestamp} ${logEntry.level}: ${logEntry.message}\n`;
  
  // Write to combined log file
  fs.appendFileSync(combinedLogPath, formattedLog);
  
  // Also write errors to error log file
  if (logEntry.level.toLowerCase() === 'error') {
    fs.appendFileSync(errorLogPath, formattedLog);
  }
}

// API route handler for logs
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { level, message, meta } = body;
    
    if (!level || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required log data' },
        { status: 400 }
      );
    }
    
    // Log to console
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    // Write to log files
    writeToLogFile({ level, message, meta });
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}