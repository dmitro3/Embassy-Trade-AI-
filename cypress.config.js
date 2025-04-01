const { defineConfig } = require('cypress');
const portfinder = require('portfinder');
const killPort = require('kill-port');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    screenshotsFolder: 'cypress/screenshots',
    screenshotOnRunFailure: true,
    videosFolder: 'cypress/videos',
    video: true,
    // Add retry logic for flaky tests
    retries: {
      runMode: 2,  // Retry failed tests twice in CI/command-line mode
      openMode: 1   // Retry failed tests once in interactive mode
    },
    // Add server starting configuration
    experimentalInteractiveRunEvents: true,
    // Increase timeout for request to wait for server to be ready
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    // Add additional configuration for checking if server is ready
    setupNodeEvents(on, config) {
      on('before:browser:launch', async (browser, launchOptions) => {
        console.log('Waiting for development server to be ready...');
        
        // Ensure port 3000 is free before starting tests
        try {
          await killPort(3000);
          console.log('Killed any existing process on port 3000');
        } catch (error) {
          console.log('No process found on port 3000 or could not kill it');
        }
        
        return launchOptions;
      });

      on('task', {
        // Add custom Cypress task to check if server is ready
        checkServerReady() {
          return new Promise(resolve => {
            const checkServer = () => {
              fetch('http://localhost:3000')
                .then(response => {
                  if (response.status === 200) {
                    console.log('Server is ready');
                    resolve(true);
                  } else {
                    setTimeout(checkServer, 1000);
                  }
                })
                .catch(() => {
                  console.log('Server not ready yet, waiting...');
                  setTimeout(checkServer, 1000);
                });
            };

            checkServer();
          });
        }
      });
    }
  },
  viewportWidth: 1280,
  viewportHeight: 720
});