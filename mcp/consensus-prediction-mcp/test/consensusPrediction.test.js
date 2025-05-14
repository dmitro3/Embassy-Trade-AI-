/**
 * Consensus Prediction Tests
 * 
 * Tests for the consensusPrediction module
 */

const sinon = require('sinon');
const { expect } = require('chai');
const nock = require('nock');

// Mock the OpenAI module
jest.mock('openai', () => {
  // Create a mock instance
  const openaiMock = {
    createChatCompletion: jest.fn()
  };
  
  // Return the mocked module
  return {
    Configuration: jest.fn().mockImplementation(() => ({})),
    OpenAIApi: jest.fn().mockImplementation(() => openaiMock)
  };
});

// Mock Birdeye connector
jest.mock('../connectors/birdeye-connector', () => ({
  getTokenData: sinon.stub(),
  getTokenMetadata: sinon.stub(),
  getTokenPrice: sinon.stub(),
  getTokenPriceHistory: sinon.stub()
}));

// Now import the module under test
const consensusPrediction = require('../skills/consensusPrediction');
const birdeyeConnector = require('../connectors/birdeye-connector');
const { OpenAIApi } = require('openai');

describe('Consensus Prediction', () => {
  beforeEach(() => {
    // Reset mocks
    sinon.reset();
    
    // Setup default mocks
    birdeyeConnector.getTokenData.resolves({
      name: 'Test Token',
      symbol: 'TEST',
      price: 0.001,
      priceChange24h: 5.0
    });
    
    birdeyeConnector.getTokenMetadata.resolves({
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18
    });
    
    birdeyeConnector.getTokenPrice.resolves({
      value: 0.001,
      valueChg24h: 5.0
    });
    
    birdeyeConnector.getTokenPriceHistory.resolves({
      data: [
        { value: 0.0009, timestamp: Date.now() - 86400000 * 7 },  // 7 days ago
        { value: 0.00095, timestamp: Date.now() - 86400000 * 3 }, // 3 days ago
        { value: 0.001, timestamp: Date.now() }                   // Now
      ]
    });
    
    // Setup OpenAI mock for primary model
    openaiMock.createChatCompletion.resolves({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              prediction: 0.00125,
              confidence: 0.8,
              reasoning: "Based on technical analysis and recent momentum, I predict a 25% increase."
            })
          }
        }]
      }
    });
  });
  
  describe('generatePrediction', () => {
    it('should generate a prediction for a valid token address', async () => {
      const result = await consensusPrediction.generatePrediction(
        '0x1234567890abcdef1234567890abcdef12345678', 
        'test-openai-key',
        'test-birdeye-key'
      );
      
      expect(result).to.be.an('object');
      expect(result).to.have.property('prediction');
      expect(result).to.have.property('confidence');
      expect(result).to.have.property('reasoning');
      expect(result.prediction).to.be.a('number');
    });
    
    it('should handle errors from token data fetching', async () => {
      birdeyeConnector.getTokenData.rejects(new Error('API Error'));
      
      try {
        await consensusPrediction.generatePrediction(
          '0x1234567890abcdef1234567890abcdef12345678', 
          'test-openai-key',
          'test-birdeye-key'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to fetch token data');
      }
    });
    
    it('should handle errors from OpenAI API', async () => {
      openaiMock.createChatCompletion.rejects(new Error('OpenAI API Error'));
      
      try {
        await consensusPrediction.generatePrediction(
          '0x1234567890abcdef1234567890abcdef12345678', 
          'test-openai-key',
          'test-birdeye-key'
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Failed to generate prediction');
      }
    });
  });
  
  describe('generateConsensus', () => {
    it('should generate consensus from multiple models', async () => {
      // Setup different responses for different models
      openaiMock.createChatCompletion.onCall(0).resolves({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                prediction: 0.00125,
                confidence: 0.8,
                reasoning: "Model 1 reasoning"
              })
            }
          }]
        }
      });
      
      openaiMock.createChatCompletion.onCall(1).resolves({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                prediction: 0.00115,
                confidence: 0.7,
                reasoning: "Model 2 reasoning"
              })
            }
          }]
        }
      });
      
      openaiMock.createChatCompletion.onCall(2).resolves({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                prediction: 0.00105,
                confidence: 0.6,
                reasoning: "Model 3 reasoning"
              })
            }
          }]
        }
      });
      
      const tokenData = {
        name: 'Test Token',
        symbol: 'TEST',
        price: 0.001,
        priceChange24h: 5.0,
        priceHistory: [
          { value: 0.0009, timestamp: Date.now() - 86400000 * 7 },
          { value: 0.00095, timestamp: Date.now() - 86400000 * 3 },
          { value: 0.001, timestamp: Date.now() }
        ]
      };
      
      const result = await consensusPrediction.generateConsensus(
        tokenData,
        openaiMock // Pass the mock directly
      );
      
      expect(result).to.be.an('object');
      expect(result).to.have.property('prediction');
      expect(result).to.have.property('confidence');
      expect(result).to.have.property('reasoning');
      expect(result).to.have.property('models');
      expect(result.models).to.be.an('array');
      expect(result.models.length).to.be.at.least(2); // At least 2 models used
    });
  });
});
