/**
 * API Integration Tests
 * 
 * Tests the API endpoints of the Consensus Prediction MCP server
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');

// Reference to server
let server;

// Import the server dynamically to prevent it from starting automatically
describe('API Integration Tests', () => {
  // Set Jest timeout for this test suite
  jest.setTimeout(10000); // Increase timeout for API tests
  
  before(async function() {
    // Mock environment variables
    process.env.PORT = '3101'; // Use different port for tests
    process.env.LOG_LEVEL = 'error'; // Reduce logging noise
    
    // Mock external API calls
    mockExternalApis();
    
    // Import and initialize the server
    server = require('../index');
  });
  
  after(function() {
    // Clean up
    if (server && server.close) {
      server.close();
    }
    
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });
  
  describe('MCP Metadata Endpoint', function() {
    it('should return server metadata', function(done) {
      request(server)
        .get('/mcp')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('name', 'consensus-prediction-mcp');
          expect(res.body).to.have.property('version');
          expect(res.body).to.have.property('tools').that.is.an('array');
          
          done();
        });
    });
  });
  
  describe('Prediction Endpoints', function() {
    it('should return a prediction for a valid token address', function(done) {
      const tokenAddress = '0x1234567890abcdef1234567890abcdef12345678';
      
      request(server)
        .post('/mcp/getPrediction')
        .send({
          tokenAddress: tokenAddress
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('prediction');
          expect(res.body).to.have.property('confidence');
          expect(res.body.prediction).to.be.a('number');
          
          done();
        });
    });
    
    it('should return 400 for missing token address', function(done) {
      request(server)
        .post('/mcp/getPrediction')
        .send({})
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error');
          
          done();
        });
    });
    
    it('should handle errors from external APIs gracefully', function(done) {
      // Force an error in the external API
      nock.cleanAll();
      nock('https://public-api.birdeye.so')
        .get(/.*/)
        .reply(500, { error: 'Internal Server Error' });
      
      request(server)
        .post('/mcp/getPrediction')
        .send({
          tokenAddress: '0x1234567890abcdef1234567890abcdef12345678'
        })
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('error');
          
          // Reset mocks for other tests
          nock.cleanAll();
          mockExternalApis();
          
          done();
        });
    });
  });
});

/**
 * Mock external APIs used by the server
 */
function mockExternalApis() {
  // Mock Birdeye API
  nock('https://public-api.birdeye.so')
    .persist()
    .get(/.*/)
    .reply(200, {
      success: true,
      data: {
        value: 0.00012345,
        valueChg24h: 5.23,
        liquidity: 1000000,
        volume24h: 500000,
        priceHistory: [
          { value: 0.00012000, timestamp: Date.now() - 86400000 },
          { value: 0.00012345, timestamp: Date.now() }
        ]
      }
    });
    
  // Mock OpenAI API
  nock('https://api.openai.com')
    .persist()
    .post('/v1/chat/completions')
    .reply(200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              prediction: 0.00013579,
              confidence: 0.75,
              reasoning: "Based on technical analysis and market trends, I predict a 10% increase."
            })
          }
        }
      ]
    });
}
