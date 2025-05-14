/**
 * TradeForce AI API Key Setup Script
 * 
 * This script sets up the necessary API keys for TradeForce AI.
 * It stores the keys in MongoDB for secure access and creates
 * a .env.local file with the required environment variables.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// API Keys
const API_KEYS = {
  SHYFT_API_KEY: 'whv00T87G8Sd8TeK',
  BIRDEYE_API_KEY: '67f8ce614c594ab2b3efb742f8db69db',
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'your-firebase-api-key',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'your-firebase-auth-domain',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'your-firebase-project-id',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'your-firebase-storage-bucket',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || 'your-firebase-messaging-sender-id',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || 'your-firebase-app-id',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://tradeforce:tradeforceAI2025@cluster0.mongodb.net/tradeforce?retryWrites=true&w=majority',
  REDIS_URL: process.env.REDIS_URL || 'redis://redis-12345.redis-cloud.com:12345',
  SOLANA_NETWORK: 'devnet',
  KRAKEN_API_KEY: process.env.KRAKEN_API_KEY || '',
  KRAKEN_API_SECRET: process.env.KRAKEN_API_SECRET || '',
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
};

// MongoDB connection
const uri = API_KEYS.MONGODB_URI;
const client = new MongoClient(uri);

async function storeApiKeys() {
  try {
    // Create .env.local file first (this will work whether MongoDB is available or not)
    console.log('Creating .env.local file...');
    const envContent = Object.entries(API_KEYS)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
    console.log('.env.local file created');
    
    // Create a secure local backup of API keys
    const secureLocalBackup = path.join(process.cwd(), 'config', 'api-keys.json');
    
    // Make sure the directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'config'))) {
      fs.mkdirSync(path.join(process.cwd(), 'config'), { recursive: true });
    }
    
    // Create a simple encrypted version for local storage
    const encryptionKey = Buffer.from(API_KEYS.ENCRYPTION_KEY, 'hex');
    const encryptedLocalKeys = {};
    
    for (const [key, value] of Object.entries(API_KEYS)) {
      if (key !== 'ENCRYPTION_KEY') {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        encryptedLocalKeys[key] = {
          value: encrypted,
          iv: iv.toString('hex')
        };
      }
    }
    
    fs.writeFileSync(secureLocalBackup, JSON.stringify({
      keys: encryptedLocalKeys,
      createdAt: new Date(),
      updatedAt: new Date()
    }, null, 2));
    
    console.log('Local API key backup created');

    // Try to store in MongoDB if possible
    try {
      console.log('Connecting to MongoDB...');
      await client.connect();
      console.log('Connected to MongoDB');

      const database = client.db('tradeforce');
      const apiKeys = database.collection('api_keys');

      // Encrypt API keys
      const encryptedKeys = {};
      
      for (const [key, value] of Object.entries(API_KEYS)) {
        if (key !== 'ENCRYPTION_KEY') {
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
          let encrypted = cipher.update(value, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          encryptedKeys[key] = {
            value: encrypted,
            iv: iv.toString('hex')
          };
        }
      }

      // Store encrypted keys in MongoDB
      console.log('Storing API keys in MongoDB...');
      await apiKeys.deleteMany({});
      await apiKeys.insertOne({
        keys: encryptedKeys,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('API keys stored in MongoDB');
    } catch (mongoError) {
      console.warn('Warning: Could not store API keys in MongoDB. Using local file storage instead.', mongoError.message);
    } finally {
      try {
        await client.close();
      } catch (error) {
        // Ignore errors when closing connection that might not be open
      }
    }

    console.log('API key setup completed successfully');
  } catch (error) {
    console.error('Error setting up API keys:', error);
    process.exit(1);
  }
}
}

storeApiKeys();
