import { NextResponse } from 'next/server';
import tradeforceAI from '../../../../lib/tradeforceAI.js';
import logger from '../../../../lib/logger.js';
import ApiErrorHandler from '../../../../lib/apiErrorHandler.js';

/**
 * GET endpoint for bot status
 * Returns current status of the TradeForce AI bot
 */
export async function GET(request) {
  try {
    // Ensure TradeForce AI is initialized
    try {
      if (!tradeforceAI.isInitialized()) {
        await tradeforceAI.init();
      }
    } catch (initError) {
      logger.error(`Failed to initialize TradeForce AI: ${initError.message}`);
      // Continue with default status
    }
    
    const status = tradeforceAI.getBotStatus() || 'idle';
    const metrics = tradeforceAI.getMetrics() || {
      scansCompleted: 0,
      tradesExecuted: 0,
      winRate: 0,
      lastScanTime: null,
      uptime: 0
    };
    
    return NextResponse.json({
      status,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Bot status API error: ${error.message}`);
    ApiErrorHandler.trackError('bot-status-api', error);
    
    // Return a valid response even when errors occur to prevent UI failures
    return NextResponse.json({
      status: 'error',
      message: 'Failed to retrieve bot status',
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Using 200 status to avoid UI errors
  }
}

/**
 * POST endpoint for bot control
 * Controls the TradeForce AI bot (start/stop)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, settings = {} } = body;
    
    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action, must be "start" or "stop"' },
        { status: 400 }
      );
    }
    
    // Ensure TradeForce AI is initialized
    try {
      if (!tradeforceAI.isInitialized()) {
        await tradeforceAI.init();
      }
    } catch (initError) {
      logger.error(`Failed to initialize TradeForce AI: ${initError.message}`);
      // Continue with best effort approach
    }
    
    // Handle the action with a timeout to prevent hanging
    const actionPromise = action === 'start' 
      ? tradeforceAI.startBot(settings)
      : tradeforceAI.stopBot();
    
    // Add timeout to prevent hanging operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Bot ${action} operation timed out after 10 seconds`)), 10000);
    });
    
    try {
      // Race the action against the timeout
      await Promise.race([actionPromise, timeoutPromise]);
    } catch (timeoutError) {
      logger.error(`Bot ${action} operation timed out: ${timeoutError.message}`);
      throw timeoutError; // Re-throw to be handled by outer catch
    }
    
    const status = tradeforceAI.getBotStatus();
    const metrics = tradeforceAI.getMetrics() || {
      scansCompleted: 0,
      tradesExecuted: 0,
      winRate: 0,
      lastScanTime: null
    };
    
    return NextResponse.json({
      status,
      message: `Bot ${action} operation completed successfully`,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Bot control API error: ${error.message}`);
    ApiErrorHandler.trackError('bot-control-api', error);
    
    // Return meaningful information even when errors occur
    return NextResponse.json({
      status: 'error',
      message: `Failed to ${body?.action || 'control'} bot`,
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Using 200 status to prevent UI errors
  }
}
