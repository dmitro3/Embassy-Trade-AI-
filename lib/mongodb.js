// lib/mongodb.js
import { MongoClient } from 'mongodb';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 * 
 * NOTE: This module should only be used in server components or API routes,
 * not in client components!
 */
let cached = globalThis.mongo;

if (!cached) {
  cached = globalThis.mongo = { 
    conn: null, 
    promise: null,
    lastError: null,
    connectionAttempts: 0,
    reconnecting: false
  };
}

/**
 * MongoDB connection string
 * Uses environment variable or falls back to a local MongoDB instance
 */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/embassy_trade';

// Log MongoDB connection status for debugging
function logConnectionStatus(status, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] MongoDB Connection ${status}:`, details);
}

/**
 * Connect to MongoDB with enhanced error handling and reconnection logic
 * @returns {Promise<Object>} MongoDB connection object with client and db
 */
export async function connectToDatabase() {
  // If we already have an active connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If there's no active connection attempt, create one
  if (!cached.promise) {
    cached.connectionAttempts++;
    
    // Connection options with better defaults for reliability
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 120000,
      retryWrites: true,
      retryReads: true
    };

    logConnectionStatus('ATTEMPT', { 
      uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@'), // Mask credentials
      attempt: cached.connectionAttempts,
      options: opts
    });

    cached.promise = MongoClient.connect(MONGODB_URI, opts)
      .then((client) => {
        logConnectionStatus('SUCCESS', { 
          dbName: 'embassy_trade',
          attempt: cached.connectionAttempts
        });
        
        // Set up connection event listeners for better diagnostics
        client.on('error', (err) => {
          console.error('MongoDB connection error:', err);
          cached.lastError = err;
        });
        
        client.on('timeout', () => {
          console.warn('MongoDB connection timeout');
        });
        
        client.on('close', () => {
          console.warn('MongoDB connection closed');
          // Clear cached connection so next request tries to reconnect
          cached.conn = null;
        });
        
        return {
          client,
          db: client.db('embassy_trade'),
        };
      })
      .catch((err) => {
        logConnectionStatus('ERROR', { 
          error: err.message,
          code: err.code,
          attempt: cached.connectionAttempts
        });
        
        // Clear promise so next request will try again
        cached.promise = null;
        cached.lastError = err;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // Reset promise to allow retry on next attempt
    cached.promise = null;
    throw err;
  }
}

/**
 * Get MongoDB client with better error handling
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function clientPromise() {
  try {
    const { client } = await connectToDatabase();
    
    // Check if the client is still connected
    const isConnected = client.topology?.isConnected() || client.isConnected?.() || false;
    
    // If client is not connected, try to reconnect
    if (!isConnected && !cached.reconnecting) {
      console.warn('MongoDB client disconnected, attempting to reconnect...');
      cached.reconnecting = true;
      cached.conn = null;
      cached.promise = null;
      
      // Attempt reconnection
      try {
        const { client: newClient } = await connectToDatabase();
        cached.reconnecting = false;
        return newClient;
      } catch (reconnectError) {
        cached.reconnecting = false;
        throw new Error(`Failed to reconnect to MongoDB: ${reconnectError.message}`);
      }
    }
    
    return client;
  } catch (error) {
    console.error('Error getting MongoDB client:', error);
    throw error;
  }
}

// Additional utility function to get database by name
export async function getDatabase(dbName = 'embassy_trade') {
  const { client } = await connectToDatabase();
  return client.db(dbName);
}

/**
 * Store an API key securely in MongoDB
 * @param {string} service - The service name (kraken, birdeye, etc.)
 * @param {object} credentials - The credentials object to store
 * @param {boolean} [encryptData=true] - Whether to encrypt the data
 * @returns {Promise<boolean>} Success status
 */
export async function storeApiKey(service, credentials, encryptData = true) {
  try {
    const db = await getDatabase();
    const collection = db.collection('api_keys');
    
    // Check if we need to encrypt the data
    let dataToStore = credentials;
    
    if (encryptData && process.env.ENCRYPTION_KEY) {
      const crypto = require('crypto');
      const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      
      // Encrypt each field in the credentials
      dataToStore = {};
      
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string') {
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
          let encrypted = cipher.update(value, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          
          dataToStore[key] = {
            value: encrypted,
            iv: iv.toString('hex')
          };
        } else {
          dataToStore[key] = value;
        }
      }
    }
    
    // Update or insert the API key
    const result = await collection.updateOne(
      { service },
      {
        $set: {
          ...dataToStore,
          updatedAt: new Date()
        },
        $setOnInsert: {
          service,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return result.acknowledged;
  } catch (error) {
    console.error(`Error storing API key for ${service}:`, error);
    return false;
  }
}

/**
 * Retrieve an API key from MongoDB
 * @param {string} service - The service name
 * @param {boolean} [decryptData=true] - Whether to decrypt the data
 * @returns {Promise<object|null>} The credentials or null if not found
 */
export async function getApiKey(service, decryptData = true) {
  try {
    const db = await getDatabase();
    const collection = db.collection('api_keys');
    
    const apiKey = await collection.findOne({ service });
    
    if (!apiKey) {
      return null;
    }
    
    // Check if we need to decrypt the data
    if (decryptData && process.env.ENCRYPTION_KEY) {
      const crypto = require('crypto');
      const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
      const result = {};
      
      // Process each field in the API key
      for (const [key, value] of Object.entries(apiKey)) {
        if (value && typeof value === 'object' && value.value && value.iv) {
          try {
            const iv = Buffer.from(value.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
            let decrypted = decipher.update(value.value, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            result[key] = decrypted;
          } catch (e) {
            console.warn(`Could not decrypt field ${key} for service ${service}`);
            result[key] = null;
          }
        } else if (key !== '_id') {
          result[key] = value;
        }
      }
      
      return result;
    }
    
    // Return without decryption
    return apiKey;
  } catch (error) {
    console.error(`Error retrieving API key for ${service}:`, error);
    return null;
  }
}

// Export default client promise
export default clientPromise;
