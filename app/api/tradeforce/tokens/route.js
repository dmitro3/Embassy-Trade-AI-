import { NextResponse } from 'next/server';
import shyftService from '../../../../lib/shyftService.js';
import birdeyeService from '../../../../lib/birdeyeService.js';
import logger from '../../../../lib/logger.js';
import ApiErrorHandler from '../../../../lib/apiErrorHandler.js';

/**
 * GET endpoint to fetch token information
 * Returns detailed token data by combining SHYFT and Birdeye sources
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const symbol = searchParams.get('symbol');
    
    if (!address && !symbol) {
      return NextResponse.json(
        { error: 'Either token address or symbol is required' },
        { status: 400 }
      );
    }
    
    let tokenData = {};
      if (address) {
      // Get token data from SHYFT with proper error handling
      try {
        // Use Promise.allSettled to avoid failing if one of the requests fails
        const [infoResult, priceResult] = await Promise.allSettled([
          shyftService.getTokenInfo(address),
          shyftService.getTokenPrice(address)
        ]);
        
        // Extract data safely regardless of promise state
        const tokenInfo = infoResult.status === 'fulfilled' ? infoResult.value : {};
        const tokenPrice = priceResult.status === 'fulfilled' ? priceResult.value : {};
        
        tokenData = {
          address,
          symbol: tokenInfo?.symbol || address.substring(0, 4).toUpperCase(),
          name: tokenInfo?.name || `Token (${address.substring(0, 8)}...)`,
          decimals: tokenInfo?.decimals || 9,
          price: parseFloat(tokenPrice?.value || 0),
          priceChange24h: parseFloat(tokenPrice?.price_change_24h || 0),
          logoURI: tokenInfo?.image || `/token-icons/default-token.png`,
          source: infoResult.status === 'fulfilled' && priceResult.status === 'fulfilled' ? 'shyft' : 'partial',
          lastUpdated: new Date().toISOString()
        };      } catch (error) {
        logger.warn(`Failed to fetch token data from SHYFT: ${error.message}`);
        
        // Fallback to Birdeye with better error handling
        try {
          // Use Promise.allSettled for resilience
          const [infoResult, priceResult] = await Promise.allSettled([
            birdeyeService.getTokenMetadata(address),
            birdeyeService.getTokenPrice(address)
          ]);
          
          // Extract data safely regardless of promise state
          const tokenInfo = infoResult.status === 'fulfilled' ? infoResult.value : {};
          const tokenPrice = priceResult.status === 'fulfilled' ? priceResult.value : {};
          
          tokenData = {
            address,
            symbol: tokenInfo?.symbol || address.substring(0, 4).toUpperCase(),
            name: tokenInfo?.name || `Token (${address.substring(0, 6)}...)`,
            decimals: tokenInfo?.decimals || 9,
            price: parseFloat(tokenPrice?.value || 0),
            priceChange24h: parseFloat(tokenPrice?.priceChange24h || 0),
            logoURI: tokenInfo?.logoURI || `/token-icons/default-token.png`,
            source: 'birdeye',
            lastUpdated: new Date().toISOString()
          };
        } catch (err) {
          logger.error(`Failed to fetch token data from Birdeye: ${err.message}`);
          
          // Never return a 500 - instead return fallback token data
          tokenData = {
            address,
            symbol: address.substring(0, 4).toUpperCase(),
            name: `Token (${address.substring(0, 10)}...)`,
            decimals: 9,
            price: 0,
            priceChange24h: 0,
            logoURI: `/token-icons/default-token.png`,
            source: 'fallback',
            fallback: true,
            lastUpdated: new Date().toISOString()
          };
        }
      }
    } else {
      // Get token by symbol
      try {
        // For devnet, use a known mapping
        const knownTokens = {
          'SOL': 'So11111111111111111111111111111111111111112',
          'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          'DUST': 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ',
          'MSOL': 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
          'KIN': 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6'
        };
          const upperSymbol = symbol.toUpperCase();
        const tokenAddress = knownTokens[upperSymbol];
        
        if (!tokenAddress) {
          // Return fallback data instead of 404 error
          return NextResponse.json({
            symbol: upperSymbol,
            name: `${upperSymbol} Token`,
            address: `unknown_${upperSymbol.toLowerCase()}_address`,
            decimals: 9,
            price: 0,
            priceChange24h: 0,
            logoURI: `/token-icons/default-token.png`,
            source: 'fallback',
            fallback: true,
            lastUpdated: new Date().toISOString()
          }, { status: 200 }); // Using 200 status to prevent UI errors
        }
        
        // Recursive call with address
        const response = await fetch(`${request.nextUrl.origin}/api/tradeforce/tokens?address=${tokenAddress}`);
        return NextResponse.json(await response.json());
      } catch (error) {
        logger.error(`Failed to fetch token by symbol: ${error.message}`);
        return NextResponse.json(
          { error: `Failed to fetch token data for symbol: ${symbol}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(tokenData);
  } catch (error) {
    logger.error(`Token API error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch multiple tokens
 * Returns a list of tokens with basic information
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { addresses = [], limit = 20 } = body;
    
    // If addresses are provided, fetch specific tokens
    if (addresses.length > 0) {
      const tokenList = [];
      const fetchPromises = [];
      
      for (const address of addresses.slice(0, limit)) {
        // Create fetch promise for each token
        const fetchPromise = fetch(`${request.nextUrl.origin}/api/tradeforce/tokens?address=${address}`)
          .then(response => response.json())
          .then(tokenData => {
            if (!tokenData.error) {
              tokenList.push(tokenData);
            }
          })
          .catch(error => {
            logger.warn(`Failed to fetch token ${address}: ${error.message}`);
            // Return a minimal token object with address to ensure we maintain the token in the list
            tokenList.push({
              address,
              symbol: address.substring(0, 4),
              name: `Unknown Token (${address.substring(0, 6)}...)`,
              price: 0,
              fallback: true
            });
          });
          
        fetchPromises.push(fetchPromise);
      }
      
      // Wait for all fetches to complete
      await Promise.allSettled(fetchPromises);
      
      return NextResponse.json({
        tokens: tokenList,
        count: tokenList.length,
        timestamp: new Date().toISOString()
      });
    } 
    // Otherwise fetch top tokens
    else {
      try {
        // First try with SHYFT service
        const tokens = await shyftService.getTopTokens(limit);
        
        if (tokens && tokens.length > 0) {
          return NextResponse.json({
            tokens,
            count: tokens.length,
            source: 'shyft',
            timestamp: new Date().toISOString()
          });
        }
        
        throw new Error('No tokens returned from SHYFT');
      } catch (error) {
        logger.warn(`Failed to get top tokens from SHYFT: ${error.message}`);
        
        try {
          // Fallback to Birdeye
          const tokens = await birdeyeService.getTokenList(limit);
          
          if (tokens && tokens.length > 0) {
            return NextResponse.json({
              tokens,
              count: tokens.length,
              source: 'birdeye',
              timestamp: new Date().toISOString()
            });
          }
          
          throw new Error('No tokens returned from Birdeye');
        } catch (err) {
          logger.error(`Failed to get top tokens from Birdeye: ${err.message}`);
          
          // Final fallback - return hardcoded popular tokens
          const fallbackTokens = [
            { 
              address: 'So11111111111111111111111111111111111111112', 
              symbol: 'SOL', 
              name: 'Solana',
              price: 0,
              fallback: true 
            },
            { 
              address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 
              symbol: 'USDC', 
              name: 'USD Coin',
              price: 1,
              fallback: true
            },
            { 
              address: 'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', 
              symbol: 'DUST', 
              name: 'DUST Protocol',
              price: 0,
              fallback: true
            },
            { 
              address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', 
              symbol: 'mSOL', 
              name: 'Marinade staked SOL',
              price: 0,
              fallback: true
            }
          ];
          
          return NextResponse.json({
            tokens: fallbackTokens,
            count: fallbackTokens.length,
            source: 'fallback',
            fallback: true,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Token list API error: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
