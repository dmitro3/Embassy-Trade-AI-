// scripts/test-mongodb.js
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log("Starting MongoDB connection test...");
  console.log(`Using MongoDB URI: ${process.env.MONGODB_URI ? "URI is defined" : "URI is missing!"}`);
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI environment variable is not defined!");
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    console.log("Attempting to connect...");
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");
    
    const dbName = process.env.MONGODB_DB || "embassy_trade";
    console.log(`Using database: ${dbName}`);
    
    // List all collections in the database
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log(`Collections in database:`);
    collections.forEach(collection => {
      console.log(` - ${collection.name}`);
    });
    
    // Insert a test document into api_keys collection
    const testKey = {
      service: "test",
      key: "test-key-123",
      active: true,
      created_at: new Date()
    };
    
    // Create collection if it doesn't exist
    if (!collections.find(c => c.name === 'api_keys')) {
      console.log("Creating api_keys collection...");
      await db.createCollection('api_keys');
    }
    
    console.log("Inserting a test key...");
    const result = await db.collection('api_keys').insertOne(testKey);
    console.log(`Test key inserted with ID: ${result.insertedId}`);
    
    // Verify by retrieving the document
    const retrievedKey = await db.collection('api_keys').findOne({ service: "test" });
    console.log(`Retrieved test key: ${JSON.stringify(retrievedKey)}`);
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

testConnection().catch(console.error);
