// API route for validating a Kraken order
import { NextResponse } from 'next/server';
import tradeExecutionService from '../../../lib/tradeExecutionService';
import logger from '../../../lib/logger';

export async function GET() {
  try {
    // Initialize Kraken service
    if (!tradeExecutionService.krakenInitialized) {
      await tradeExecutionService.initializeKraken();
    }
    
    // Test validation of a Kraken order
    const validationResult = await tradeExecutionService.executeKrakenTrade({
      pair: 'SOLUSD',
      type: 'buy',
      ordertype: 'limit',
      price: '25.00', // Example price
      volume: '1.0',
      validate: true
    });
    
    logger.info('Kraken order validation test:', validationResult);
    
    if (validationResult.success) {
      return NextResponse.json({
        success: true,
        data: validationResult
      });
    } else {
      return NextResponse.json({
        success: false,
        error: validationResult.error || 'Unknown validation error'
      });
    }
  } catch (error) {
    logger.error('Error validating Kraken order:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate order: ' + error.message
    }, { status: 500 });
  }
}
