/**
 * Script to run Cypress tests when the development server is already running
 * This script:
 * 1. Checks if the development server is running
 * 2. If not, it starts the server
 * 3. Runs the Cypress tests
 */

const { execSync, spawn, exec } = require('child_process');
const http = require('http');
const chalk = require('chalk') || { green: text => text, yellow: text => text, red: text => text };

function isServerRunning(url, callback) {
  http.get(url, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      callback(false);
    }
  }).on('error', () => {
    callback(false);
  });
}

// Helper function to run commands with better logging
function runCommand(command, description) {
  console.log(`\n${chalk.yellow('🔄')} ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${chalk.green('✓')} ${description} completed successfully.`);
    return true;
  } catch (error) {
    console.error(`${chalk.red('✗')} ${description} failed:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(chalk.yellow('=================================='));
  console.log(chalk.yellow('    Running Cypress E2E Tests     '));
  console.log(chalk.yellow('=================================='));

  // Step 1: Check if the development server is running
  console.log(`\n${chalk.yellow('🔄')} Checking if development server is running...`);
  
  let serverRunning = false;
  let serverProcess = null;
  
  // Check if frontend is running
  await new Promise((resolve) => {
    isServerRunning('http://localhost:3000', (running) => {
      serverRunning = running;
      resolve();
    });
  });

  // Check if backend server is running
  let backendRunning = false;
  if (serverRunning) {
    await new Promise((resolve) => {
      isServerRunning('http://localhost:4001/api/health', (running) => {
        backendRunning = running;
        if (!running) {
          // Try alternate port 
          isServerRunning('http://localhost:4000/api/health', (altRunning) => {
            backendRunning = altRunning;
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Step 2: Start the server if not running
  if (!serverRunning || !backendRunning) {
    console.log(`${chalk.yellow('!')} Development server is not running. Starting it...`);
    
    // Start the development server in the background
    serverProcess = spawn('npm', ['run', 'dev'], { 
      stdio: 'inherit',
      shell: true,
      detached: true
    });
    
    // Give the server some time to start
    console.log(`${chalk.yellow('⏳')} Waiting for server to start (15 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 15000));
  } else {
    console.log(`${chalk.green('✓')} Development server is running.`);
  }

  // Step 3: Run Cypress tests
  console.log(`\n${chalk.yellow('🔄')} Opening Cypress test runner...`);

  // First try running in interactive mode which is more user-friendly
  try {
    execSync('npx cypress open', { stdio: 'inherit' });
  } catch (error) {
    console.log(`${chalk.yellow('!')} Failed to open Cypress UI. Falling back to headless mode...`);
    runCommand('npm run test:e2e', 'Running Cypress tests in headless mode');
  }

  // If we started the server, kill it when done
  if (serverProcess) {
    console.log(`\n${chalk.yellow('⏹️')} Shutting down development server...`);
    // On Windows we need to kill the process group
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${serverProcess.pid} /T /F`);
    } else {
      // For non-Windows platforms
      process.kill(-serverProcess.pid);
    }
  }
}

// Run the main function
main().catch(error => {
  console.error(`${chalk.red('✗')} Script failed with error:`, error);
  process.exit(1);
});