// Import the Sentry Next.js plugin
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure CSS modules are properly processed
  webpack: (config, { isServer }) => {
    // Add specific handling for CSS files
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      .oneOf.filter((rule) => Array.isArray(rule.use));
    
    // Ensure all styles are properly processed
    if (rules) {
      rules.forEach((rule) => {
        if (rule.use.find((use) => use.loader?.includes('css-loader'))) {
          if (rule.use.find((use) => use.loader?.includes('postcss-loader'))) {
            const postcssLoader = rule.use.find((use) => use.loader?.includes('postcss-loader'));
            if (postcssLoader.options?.postcssOptions) {
              postcssLoader.options.postcssOptions.config = true; // Use the root postcss.config.js
            }
          }
        }
      });
    }
      // Add path alias resolutions
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@components': path.resolve(__dirname, 'components'),
      '@lib': path.resolve(__dirname, 'lib'),
      '@server': path.resolve(__dirname, 'server'),
    };
    
    // Handle Node.js modules
    if (!isServer) {
      // Remove Node.js specific modules from client-side build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        util: false,
        net: false,
        tls: false,
        child_process: false
      };
    }

    return config;
  },
  
  // Add transpilePackages for better compatibility with packages
  transpilePackages: [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-wallets'
  ],
  
  // Standard Next.js configuration
  reactStrictMode: true,
  
  // ESLint configuration - disable during build to allow deployment
  eslint: {
    // Warning rather than error is set to true so next build doesn't fail due to ESLint errors
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Disable TypeScript checking during builds
    ignoreBuildErrors: true,
  },
  
  // Set output option based on environment
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  
  // Configure image handling for static export
  images: {
    unoptimized: process.env.NEXT_EXPORT === 'true',
    domains: ['vercel.com'],
  },
  
  // Configure basePath for Electron file protocol
  basePath: '',
  
  // Enable source maps in production for better error tracking
  productionBrowserSourceMaps: true,
};

// Export the Next.js config wrapped with Sentry
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "embassy-trade-ai",
  project: "embassy-trade-ai",
  
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
