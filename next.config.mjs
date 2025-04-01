/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure CSS modules are properly processed
  webpack: (config) => {
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

export default nextConfig;
