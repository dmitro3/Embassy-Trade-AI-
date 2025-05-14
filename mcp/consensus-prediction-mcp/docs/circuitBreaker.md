# Circuit Breaker Pattern Implementation

## Overview

The Circuit Breaker pattern prevents cascading failures in distributed systems by temporarily disabling operations that are likely to fail. This implementation provides a robust and configurable circuit breaker for HTTP requests and other external service calls.

## Features

- **Three Circuit States**: CLOSED (normal operation), OPEN (failing, blocking calls), and HALF_OPEN (testing recovery)
- **Automatic Recovery**: Automatically tests service availability after a timeout period
- **Configurable Thresholds**: Customize failure thresholds, reset timeouts, and more
- **Comprehensive Monitoring**: Get detailed status for all service endpoints
- **Manual Controls**: Force circuit state or reset breakers when needed

## Usage

### Basic Usage

```javascript
const { CircuitBreaker } = require('./utils/circuitBreaker');
const circuitBreaker = new CircuitBreaker();

// Before making an external call
const endpoint = 'api.example.com';

if (circuitBreaker.canCall(endpoint)) {
  try {
    // Make the external call
    const result = await externalService.call();
    
    // Record success
    circuitBreaker.recordSuccess(endpoint);
    return result;
  } catch (error) {
    // Record failure
    circuitBreaker.recordFailure(endpoint);
    throw error;
  }
} else {
  throw new Error(`Service ${endpoint} is currently unavailable (circuit breaker open)`);
}
```

### Configuration Options

```javascript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,    // Number of failures before opening the circuit
  resetTimeout: 30000,    // Time in ms to wait before trying recovery (30 seconds)
  halfOpenMaxCalls: 2     // Maximum calls allowed in half-open state
}, logger);
```

### Advanced Usage

```javascript
// Get the current status of all circuit breakers
const status = circuitBreaker.getStatus();
console.log(status);

// Manually reset a circuit breaker
circuitBreaker.reset('api.example.com');

// Force a circuit breaker to a specific state
circuitBreaker.forceState('api.example.com', 'HALF_OPEN');
```

## Circuit States

1. **CLOSED**: Normal operation. All requests pass through to the service.
2. **OPEN**: The circuit has tripped. All requests are short-circuited and an error is returned immediately.
3. **HALF_OPEN**: Testing recovery. A limited number of requests are allowed through to test if the service has recovered.

## Implementation Details

The circuit breaker tracks the following for each endpoint:

- **state**: Current state (CLOSED, OPEN, HALF_OPEN)
- **failures**: Count of consecutive failures
- **lastFailure**: Timestamp of the last failure
- **halfOpenCalls**: Count of calls made in HALF_OPEN state
- **successCount**: Count of consecutive successful calls in HALF_OPEN state

## Integration with HTTP Client

This circuit breaker is fully integrated with the HTTP client module to provide resilient API calls:

```javascript
// The HTTP client automatically uses the circuit breaker
const result = await httpClient.get('https://api.example.com/data');

// Check circuit breaker status
const status = httpClient.getCircuitBreakerStatus();

// Reset a circuit breaker if needed
httpClient.resetCircuitBreaker('api.example.com');
```

## Best Practices

1. Use a different circuit breaker for each external service or endpoint
2. Set appropriate timeouts for your specific services
3. Monitor circuit breaker status to detect recurring problems
4. Implement proper fallback mechanisms when a circuit is open
