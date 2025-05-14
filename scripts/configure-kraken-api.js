/**
 * Kraken API Key Configuration Tool
 * 
 * This script helps set up Kraken API keys for TradeForce AI.
 * It updates both the MongoDB database and the .env.local file.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');
const dotenv = require('dotenv');

// Load existing environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function configureKrakenAPI() {
  console.log('=== Kraken API Key Configuration Tool ===');
  console.log('This tool will help you set up your Kraken API keys for TradeForce AI.');
  console.log('You will need to create API keys from your Kraken account.');
  console.log('\nPlease visit https://www.kraken.com/u/security/api to create API keys with these permissions:');
  console.log('- Query Funds');
  console.log('- Query Open Orders & Trades');
  console.log('- Query Closed Orders & Trades');
  console.log('- Create & Modify Orders');
  
  try {
    // Prompt for API keys
    const apiKey = await askQuestion('\nEnter your Kraken API Key: ');
    const apiSecret = await askQuestion('Enter your Kraken API Secret: ');
    
    if (!apiKey || !apiSecret) {
      console.error('Error: Both API Key and API Secret are required.');
      process.exit(1);
    }
    
    console.log('\nSaving API keys...');
    
    // Update .env.local file
    await updateEnvFile(apiKey, apiSecret);
    
    // Try to update MongoDB if available
    await updateMongoDB(apiKey, apiSecret);
    
    console.log('\n✅ Kraken API keys have been configured successfully!');
    console.log('\nTo verify the configuration, please restart your application and check the connection status.');
    
  } catch (error) {
    console.error('Error configuring Kraken API:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function updateEnvFile(apiKey, apiSecret) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Parse existing content
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    });
    
    // Update Kraken keys
    envVars['KRAKEN_API_KEY'] = apiKey;
    envVars['KRAKEN_API_SECRET'] = apiSecret;
    
    // Write back to file
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    fs.writeFileSync(envPath, newEnvContent);
    console.log('Updated .env.local file with Kraken API keys');
    
  } catch (error) {
    console.error('Error updating .env.local file:', error);
    throw error;
  }
}

async function updateMongoDB(apiKey, apiSecret) {
  // Try to get MongoDB URI from environment
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('MongoDB URI not found in environment variables. Skipping database update.');
    return;
  }
  
  try {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('embassy_trade');
    const collection = db.collection('api_keys');
    
    // Check if we need to encrypt the keys
    const encryptionKey = process.env.ENCRYPTION_KEY;
    let encryptedApiKey = apiKey;
    let encryptedApiSecret = apiSecret;
    
    if (encryptionKey) {
      // Encrypt API key
      const keyIv = crypto.randomBytes(16);
      const keyCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), keyIv);
      encryptedApiKey = keyCipher.update(apiKey, 'utf8', 'hex');
      encryptedApiKey += keyCipher.final('hex');
      
      // Encrypt API secret
      const secretIv = crypto.randomBytes(16);
      const secretCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), secretIv);
      encryptedApiSecret = secretCipher.update(apiSecret, 'utf8', 'hex');
      encryptedApiSecret += secretCipher.final('hex');
      
      // Update or insert Kraken keys
      await collection.updateOne(
        { service: 'kraken' },
        {
          $set: {
            api_key: {
              value: encryptedApiKey,
              iv: keyIv.toString('hex')
            },
            api_secret: {
              value: encryptedApiSecret,
              iv: secretIv.toString('hex')
            },
            active: true,
            updatedAt: new Date()
          },
          $setOnInsert: {
            service: 'kraken',
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    } else {
      // No encryption key available, store without encryption (not recommended for production)
      console.warn('Warning: ENCRYPTION_KEY not found. Storing API keys without encryption.');
      
      await collection.updateOne(
        { service: 'kraken' },
        {
          $set: {
            api_key: apiKey,
            api_secret: apiSecret,
            active: true,
            updatedAt: new Date()
          },
          $setOnInsert: {
            service: 'kraken',
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    
    console.log('Updated Kraken API keys in MongoDB');
    await client.close();
    
  } catch (error) {
    console.warn('Warning: Could not update MongoDB. Using only .env.local file.', error.message);
  }
}

// Run the script
configureKrakenAPI();
