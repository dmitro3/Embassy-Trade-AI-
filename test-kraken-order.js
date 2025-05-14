'use client';

/**
 * Test script for Kraken order functionality
 * This script tests the Kraken order form and order execution
 */

import React from 'react';
import { toast } from 'react-toastify';
import tradeExecutionService from './lib/tradeExecutionService';
import logger from './lib/logger';

/**
 * Test Kraken order validation
 * This function tests if the order validation works properly
 */
export async function testKrakenOrderValidation() {
  try {
    logger.info('Testing Kraken order validation...');
    
    // Make sure the service is initialized
    if (!tradeExecutionService.krakenInitialized) {
      await tradeExecutionService.initializeKraken();
    }
    
    const validationResult = await tradeExecutionService.executeKrakenTrade({
      pair: 'SOLUSD',
      type: 'buy',
      ordertype: 'limit',
      price: '25.00', // Example price
      volume: '1.0',
      validate: true
    });
    
    logger.info('Validation result:', validationResult);
    
    if (validationResult.success) {
      toast.success('Kraken order validation successful!');
      logger.info('Kraken order validation successful!');
      return true;
    } else {
      toast.error(`Validation failed: ${validationResult.error}`);
      logger.error(`Validation failed: ${validationResult.error}`);
      return false;
    }
  } catch (error) {
    toast.error(`Test error: ${error.message}`);
    logger.error(`Test error: ${error.message}`);
    return false;
  }
}

/**
 * Test the complete Kraken order flow
 * Call from a component as needed
 */
export async function testKrakenOrder() {
  try {
    const validation = await testKrakenOrderValidation();
    
    if (!validation) {
      return false;
    }
    
    // In a real implementation, we would test placing a real order here.
    // For safety, we'll only do validation in the test.
    toast.info('Full test completed successfully (order placement skipped for safety)');
    logger.info('Full Kraken order test completed successfully');
    return true;
  } catch (error) {
    toast.error(`Test error: ${error.message}`);
    logger.error(`Test error: ${error.message}`);
    return false;
  }
}

export default {
  testKrakenOrderValidation,
  testKrakenOrder
};
