// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
    // Capture unhandled promise rejections
  integrations: [
    // Remove BrowserTracing and Replay as they're not exported from @sentry/nextjs in this version
  ],
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,
  
  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,
  
  // Enable performance monitoring
  enableTracing: true,
  
  // Set user information for better error tracking
  beforeSend(event) {
    // Check if it's an exception and if so, show a user feedback dialog
    if (event.exception && event.exception.values && event.exception.values[0]) {
      Sentry.showReportDialog({ eventId: event.event_id });
    }
    return event;
  },
  
  // Add context to errors
  beforeBreadcrumb(breadcrumb) {
    // Don't capture breadcrumbs for 3rd party scripts
    if (breadcrumb.category === 'console' && 
        breadcrumb.message && 
        breadcrumb.message.includes('3rd party extension')) {
      return null;
    }
    return breadcrumb;
  },
});
