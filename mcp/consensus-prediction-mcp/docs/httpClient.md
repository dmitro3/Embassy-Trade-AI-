# HTTP Client for Consensus Prediction MCP

This module provides a robust HTTP client with advanced features for making API requests in the Consensus Prediction MCP server.

## Features

- **Caching Support**: Reduces API calls by caching responses with configurable TTL
- **Retry Logic**: Automatically retries failed requests with exponential backoff and jitter
- **Circuit Breaker Pattern**: Prevents cascading failures by detecting unhealthy endpoints
- **Error Handling**: Comprehensive error handling with detailed logging
- **Monitoring**: Cache and circuit breaker statistics for diagnostics

## Usage

### Basic Requests

```javascript
const httpClient = require('./utils/httpClient');

// Simple GET request
const data = await httpClient.get('https://api.example.com/data');

// GET request with URL parameters
const userProfile = await httpClient.get('https://api.example.com/users', {
  params: { id: 123 }
});

// POST request
const response = await httpClient.post('https://api.example.com/submit', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

### With Caching

```javascript
// GET request with caching (60 seconds TTL)
const cachedData = await httpClient.get('https://api.example.com/data', {}, {
  useCache: true,
  ttl: 60000 // milliseconds
});

// Clear the cache
const clearResult = httpClient.clearCache();

// Get cache statistics
const stats = httpClient.getCacheStats();
console.log(`Cache contains ${stats.stats.validItems} valid items`);
```

### With Custom Retry Options

```javascript
// GET request with custom retry configuration
const data = await httpClient.get('https://api.example.com/data', {}, {}, {
  maxRetries: 5,
  initialDelay: 500
});

// Configure retry defaults globally
httpClient.configure({
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  }
});
```

### Circuit Breaker Management

```javascript
// Get status of all circuit breakers
const breakerStatus = httpClient.getCircuitBreakerStatus();

// Manually reset a circuit breaker
const resetResult = httpClient.resetCircuitBreaker('api.example.com');

// Configure circuit breaker defaults globally
httpClient.configure({
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxCalls: 2
  }
});
```

## Configuration

You can configure the HTTP client with different parameters:

```javascript
httpClient.configure({
  // Retry configuration
  retry: {
    maxRetries: 3,         // Maximum number of retry attempts
    initialDelay: 1000,    // Initial delay in ms (1 second)
    maxDelay: 10000,       // Maximum delay between retries (10 seconds)
    backoffFactor: 2       // Exponential backoff factor
  },
  
  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 5,   // Number of failures before opening the circuit
    resetTimeout: 30000,   // Time in ms to wait before attempting to reset (30 seconds)
    halfOpenMaxCalls: 2    // Maximum calls allowed in half-open state
  },
  
  // Axios defaults
  axios: {
    timeout: 5000,         // Default timeout in ms
    maxRedirects: 5        // Maximum number of redirects to follow
  }
});
```

## Testing

The HTTP client has both unit and integration tests:

```bash
# Run unit tests
npm test -- --grep "HTTP Client$"

# Run integration tests (makes actual API calls)
npm test -- --grep "HTTP Client Integration"
```

## Error Handling

The HTTP client provides detailed error information:

```javascript
try {
  const data = await httpClient.get('https://api.example.com/data');
} catch (error) {
  console.error(`Request failed: ${error.message}`);
  
  if (error.message.includes('circuit breaker')) {
    console.error('Service is currently unavailable (circuit breaker open)');
  }
}
```

## Implementation Details

The HTTP client uses the following patterns:

1. **Circuit Breaker**: Prevents repeated calls to failing services by tracking failures and entering an open state when a threshold is reached. After a timeout period, it enters a half-open state to test if the service has recovered.

2. **Exponential Backoff**: Increases the retry delay exponentially after each failed attempt to prevent overwhelming the server.

3. **Jitter**: Adds randomness to retry delays to prevent multiple clients from retrying at the same time (thundering herd problem).
