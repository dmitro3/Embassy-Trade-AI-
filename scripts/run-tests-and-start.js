/**
 * Automation script for EmbassyTrade
 * 
 * This script:
 * 1. Kills any process using port 4001
 * 2. Reinstalls dependencies if needed
 * 3. Runs Jest tests
 * 4. Runs Cypress tests
 * 5. Starts the development server
 */

const { execSync, spawn } = require('child_process');
const killPort = require('kill-port');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk') || { green: text => text, yellow: text => text, red: text => text };

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

// Helper function to check if a module exists in node_modules
function checkModuleExists(moduleName) {
    try {
        const modulePath = path.join(process.cwd(), 'node_modules', moduleName);
        return fs.existsSync(modulePath);
    } catch (error) {
        return false;
    }
}

// Main execution function
async function main() {
    console.log(chalk.yellow('=================================='));
    console.log(chalk.yellow('  EmbassyTrade Automation Script  '));
    console.log(chalk.yellow('=================================='));

    // Step 1: Kill any process on port 4001
    try {
        console.log(`\n${chalk.yellow('🔄')} Killing any process on port 4001...`);
        await killPort(4001, 'tcp');
        console.log(`${chalk.green('✓')} Port 4001 cleared.`);
    } catch (error) {
        // If no process is using port 4001, killPort will throw an error
        console.log(`${chalk.yellow('!')} No process found on port 4001 or error killing process:`, error.message);
    }

    // Step 2: Check dependencies and install if needed
    const missingDeps = ['jest', 'cypress', 'portfinder', 'kill-port'].filter(dep => !checkModuleExists(dep));
    
    if (missingDeps.length > 0) {
        console.log(`\n${chalk.yellow('🔄')} Some dependencies are missing: ${missingDeps.join(', ')}`);
        const installSuccess = runCommand(`npm install --legacy-peer-deps`, 'Installing dependencies with legacy peer deps');
        
        if (!installSuccess) {
            console.error(`${chalk.red('✗')} Failed to install dependencies. Exiting.`);
            process.exit(1);
        }
    } else {
        console.log(`\n${chalk.green('✓')} All required dependencies are installed.`);
    }

    // Step 3: Run Jest tests
    const jestSuccess = runCommand('npm test', 'Running Jest tests');
    
    if (!jestSuccess) {
        const continuePrompt = await askQuestion('Jest tests failed. Continue anyway? (y/n): ');
        if (continuePrompt.toLowerCase() !== 'y') {
            console.log('Exiting as requested.');
            process.exit(1);
        }
    }

    // Step 4: Run Cypress tests
    const cypressSuccess = runCommand('npm run test:e2e', 'Running Cypress tests');
    
    if (!cypressSuccess) {
        const continuePrompt = await askQuestion('Cypress tests failed. Continue anyway? (y/n): ');
        if (continuePrompt.toLowerCase() !== 'y') {
            console.log('Exiting as requested.');
            process.exit(1);
        }
    }

    // Step 5: Start the development server
    console.log(`\n${chalk.green('🚀')} Starting development server...`);
    
    // Use spawn to keep the dev server running
    const devServer = spawn('npm', ['run', 'dev'], { 
        stdio: 'inherit',
        shell: true
    });

    // Handle process exit
    process.on('SIGINT', () => {
        console.log(`\n${chalk.yellow('⏹️')} Shutting down...`);
        devServer.kill();
        process.exit(0);
    });
}

// Helper function to ask questions via readline
function askQuestion(question) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        readline.question(question, (answer) => {
            readline.close();
            resolve(answer);
        });
    });
}

// Run the main function
main().catch(error => {
    console.error(`${chalk.red('✗')} Script failed with error:`, error);
    process.exit(1);
});