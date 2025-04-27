# Embassy Trade AI - Debugging Guide

This guide provides information on how to use the automated debugging system implemented in the Embassy Trade AI application. The system includes error tracking, logging, and reporting to help developers quickly identify and fix issues.

## Table of Contents

1. [Overview](#overview)
2. [Sentry Integration](#sentry-integration)
3. [Winston Logging](#winston-logging)
4. [Error Boundaries](#error-boundaries)
5. [Debugging Common Issues](#debugging-common-issues)
6. [Best Practices](#best-practices)

## Overview

The Embassy Trade AI debugging system consists of several components:

- **Sentry**: For real-time error tracking and monitoring
- **Winston**: For enhanced server-side logging
- **Error Boundaries**: For graceful handling of frontend errors
- **Custom API Endpoints**: For reporting and logging errors

This integrated approach ensures that errors are:
1. Captured in real-time
2. Logged with detailed context
3. Reported to developers
4. Displayed to users in a friendly way

## Sentry Integration

Sentry provides real-time error tracking and monitoring for both frontend and backend.

### Accessing Sentry Dashboard

1. Go to [Sentry Dashboard](https://sentry.io)
2. Login with your credentials
3. Select the "embassy-trade-ai" project

### Key Features

- **Real-time Error Alerts**: Receive notifications when errors occur
- **Error Grouping**: Similar errors are grouped for easier analysis
- **User Context**: See which users experienced errors
- **Environment Tracking**: Separate development, staging, and production errors
- **Performance Monitoring**: Track application performance metrics

### Configuration Files

- `sentry.client.config.js`: Frontend Sentry configuration
- `sentry.server.config.js`: Backend Sentry configuration
- `next.config.mjs`: Next.js Sentry integration

### Environment Variables

Add these to your `.env.local` file:

```
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token
```

## Winston Logging

Winston provides enhanced server-side logging with multiple transports.

### Log Files

Logs are stored in the `logs` directory:

- `error.log`: Error-level logs only
- `combined.log`: All logs
- `server.log`: Server-specific logs
- `exceptions.log`: Uncaught exceptions
- `rejections.log`: Unhandled promise rejections

### Log Levels

- **error**: Critical errors that require immediate attention
- **warn**: Warning conditions that should be addressed
- **info**: Informational messages about system operation
- **debug**: Detailed debugging information (development only)

### MongoDB Integration

Logs are also stored in MongoDB for easier querying and analysis:

- **Collection**: `logs`
- **Database**: `embassy-trade-ai`
- **Retention**: 30 days

### Accessing Logs

#### Via API

```
GET /api/bot-logs?level=error&limit=50
```

Parameters:
- `level`: Log level to filter by (error, warn, info, debug, all)
- `limit`: Maximum number of logs to return (default: 50)

#### Via File System

```bash
# View the last 100 error logs
tail -n 100 logs/error.log

# Search for specific errors
grep "Firebase" logs/error.log

# Monitor logs in real-time
tail -f logs/combined.log
```

## Error Boundaries

Error Boundaries catch JavaScript errors in the React component tree and display fallback UIs.

### Key Components

- `components/ErrorBoundary.js`: Main error boundary component
- `components/ArcadeWrapper.js`: Example of component-specific error handling

### Using Error Boundaries

Wrap components that might throw errors:

```jsx
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

For custom error UI:

```jsx
<ErrorBoundary
  fallback={(error, errorInfo, resetErrorBoundary) => (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

## Debugging Common Issues

### Firebase Initialization Issues

**Symptoms**:
- "Firebase app already exists" errors
- Authentication failures
- Database connection issues

**Debugging Steps**:
1. Check Sentry for Firebase-related errors
2. Verify Firebase configuration in `.env.local`
3. Check `lib/firebase.js` for initialization logic
4. Look for multiple initialization attempts

### TokenAccountNotFoundError

**Symptoms**:
- "TokenAccountNotFoundError" in console
- Failed transactions
- Empty wallet balances

**Debugging Steps**:
1. Check Sentry for token account errors
2. Verify the token mint address is correct
3. Check if the user has a token account for that mint
4. Look for network connectivity issues

### Unhandled Promise Rejections

**Symptoms**:
- "Unhandled promise rejection" warnings
- Async operations failing silently
- UI not updating as expected

**Debugging Steps**:
1. Check `logs/rejections.log` for details
2. Look for missing try/catch blocks in async functions
3. Verify all promises have proper error handling
4. Add additional error logging to problematic functions

## Best Practices

### Error Logging

- **Be Specific**: Include detailed error messages
- **Add Context**: Include relevant state and variables
- **Categorize Errors**: Use consistent error types
- **Avoid PII**: Don't log sensitive user information

Example:

```javascript
try {
  // Operation that might fail
} catch (error) {
  logger.error(`Failed to process transaction: ${error.message}`, {
    transactionId,
    errorCode: error.code,
    component: 'PaymentProcessor',
    stack: error.stack
  });
  
  // Also capture in Sentry for real-time monitoring
  Sentry.captureException(error, {
    tags: {
      component: 'PaymentProcessor'
    },
    extra: {
      transactionId
    }
  });
}
```

### Error Handling

- **Graceful Degradation**: Show fallback UI when components fail
- **Retry Mechanisms**: Implement retry logic for transient errors
- **User Feedback**: Inform users when errors occur
- **Recovery Options**: Provide ways for users to recover from errors

### Monitoring

- **Check Sentry Daily**: Review new errors and trends
- **Review Log Files**: Look for patterns in logs
- **Set Up Alerts**: Configure alerts for critical errors
- **Track Error Rates**: Monitor error frequency over time

## Conclusion

The automated debugging system in Embassy Trade AI helps developers quickly identify and fix issues. By leveraging Sentry, Winston, and Error Boundaries, we can provide a robust error handling experience for both developers and users.

For questions or improvements to this debugging system, contact the development team.
