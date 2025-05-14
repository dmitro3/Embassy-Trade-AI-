/**
 * Birdeye Connector Tests
 * 
 * Tests for the Birdeye API connector
 */

const sinon = require('sinon');
const { expect } = require('chai');
const nock = require('nock');

// Import the module to test
const birdeyeConnector = require('../connectors/birdeye-connector');

// Mock httpClient
const httpClient = require('../utils/httpClient');
const mockGet = sinon.stub(httpClient, 'get');

describe('Birdeye Connector', () => {
  beforeEach(() => {
    // Reset stubs
    sinon.reset();
    
    // Disable real HTTP requests
    nock.disableNetConnect();
  });
  
  afterEach(() => {
    // Clean up nock
    nock.cleanAll();
  });
  
  afterAll(() => {
    // Enable real HTTP requests after tests
    nock.enableNetConnect();
    sinon.restore();
  });
  
  describe('getTokenData', () => {
    it('should fetch token data successfully', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: {
          name: 'Test Token',
          symbol: 'TEST',
          decimals: 9
        }
      };
      
      mockGet.resolves(mockResponse);
      
      const result = await birdeyeConnector.getTokenData('test-token-address', 'test-api-key');
      
      expect(result).to.deep.equal(mockResponse.data);
      expect(mockGet.calledOnce).to.be.true;
      expect(mockGet.firstCall.args[0]).to.include('tokenlist');
      expect(mockGet.firstCall.args[1].params.address).to.equal('test-token-address');
      expect(mockGet.firstCall.args[1].headers['X-API-KEY']).to.equal('test-api-key');
    });
    
    it('should handle errors gracefully', async () => {
      // Mock error
      mockGet.rejects(new Error('API Error'));
      
      try {
        await birdeyeConnector.getTokenData('test-token-address', 'test-api-key');
        expect.fail('Expected method to throw');
      } catch (error) {
        expect(error.message).to.include('Failed to fetch token data');
      }
    });
  });
  
  describe('getTokenPrice', () => {
    it('should fetch token price successfully', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: {
          value: 0.00123,
          valueChg24h: 5.43
        }
      };
      
      mockGet.resolves(mockResponse);
      
      const result = await birdeyeConnector.getTokenPrice('test-token-address', 'test-api-key');
      
      expect(result).to.deep.equal(mockResponse.data);
      expect(mockGet.calledOnce).to.be.true;
      expect(mockGet.firstCall.args[0]).to.include('price');
      expect(mockGet.firstCall.args[1].params.address).to.equal('test-token-address');
    });
  });
  
  describe('getTokenPriceHistory', () => {
    it('should fetch price history with correct parameters', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: [
          { timestamp: 1620000000, value: 0.001 },
          { timestamp: 1620086400, value: 0.0012 }
        ]
      };
      
      mockGet.resolves(mockResponse);
      
      const result = await birdeyeConnector.getTokenPriceHistory(
        'test-token-address', 
        '1d',
        30,
        'test-api-key'
      );
      
      expect(result).to.deep.equal(mockResponse);
      expect(mockGet.calledOnce).to.be.true;
      expect(mockGet.firstCall.args[0]).to.include('price/history');
      expect(mockGet.firstCall.args[1].params.address).to.equal('test-token-address');
      expect(mockGet.firstCall.args[1].params.type).to.equal('1d');
      expect(mockGet.firstCall.args[1].params.limit).to.equal(30);
    });
    
    it('should use default parameters when not specified', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: []
      };
      
      mockGet.resolves(mockResponse);
      
      await birdeyeConnector.getTokenPriceHistory('test-token-address', undefined, undefined, 'test-api-key');
      
      expect(mockGet.calledOnce).to.be.true;
      expect(mockGet.firstCall.args[1].params.type).to.equal('1h');
      expect(mockGet.firstCall.args[1].params.limit).to.equal(168); // 7d * 24h
    });
  });
  
  describe('getTokenMetadata', () => {
    it('should fetch token metadata successfully', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: {
          name: 'Test Token',
          symbol: 'TEST',
          decimals: 9,
          totalSupply: '1000000000'
        }
      };
      
      mockGet.resolves(mockResponse);
      
      const result = await birdeyeConnector.getTokenMetadata('test-token-address', 'test-api-key');
      
      expect(result).to.deep.equal(mockResponse.data);
    });
  });
  
  describe('getTokenMarketData', () => {
    it('should fetch market data successfully', async () => {
      // Mock response
      const mockResponse = {
        success: true,
        data: {
          volume24h: 1000000,
          liquidity: 5000000,
          fdv: 10000000
        }
      };
      
      mockGet.resolves(mockResponse);
      
      const result = await birdeyeConnector.getTokenMarketData('test-token-address', 'test-api-key');
      
      expect(result).to.deep.equal(mockResponse.data);
    });
  });
});
