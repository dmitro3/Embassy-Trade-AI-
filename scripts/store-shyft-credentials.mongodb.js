/* global use, db */
// MongoDB Playground for storing API keys
// This script will add your Shyft API credentials to the MongoDB Atlas cluster

// Select the database to use
use('embassy_trade');

// Check if the api_keys collection exists, create it if it doesn't
const collections = db.getCollectionNames();
if (!collections.includes('api_keys')) {
  db.createCollection('api_keys');
  console.log("Created api_keys collection");
}

// Define the Shyft API credentials
const shyftCredentials = {
  service: 'shyft',
  api_key: 'oRVaHOZ1n2McZ0BW',
  websocket_url: 'wss://devnet-rpc.shyft.to?api_key=oRVaHOZ1n2McZ0BW',
  rpc_url: 'https://devnet-rpc.shyft.to?api_key=oRVaHOZ1n2McZ0BW',
  graphql_url: 'https://programs.shyft.to/v0/graphql/?api_key=oRVaHOZ1n2McZ0BW&network=devnet',
  active: true,
  created_at: new Date()
};

// Check if a Shyft entry already exists, and update or insert as needed
const existingShyft = db.api_keys.findOne({ service: 'shyft' });

if (existingShyft) {
  // Update the existing record
  db.api_keys.updateOne(
    { service: 'shyft' },
    { $set: shyftCredentials }
  );
  console.log("Updated existing Shyft API credentials");
} else {
  // Insert a new record
  db.api_keys.insertOne(shyftCredentials);
  console.log("Inserted new Shyft API credentials");
}

// Verify the stored credentials
const storedShyft = db.api_keys.findOne({ service: 'shyft' });
console.log("Stored Shyft credentials:", storedShyft);

// List all API keys in the database (without showing the actual keys for security)
const apiKeys = db.api_keys.find().toArray();
console.log("All API keys in database:");

// Display without showing the full keys (for security)
apiKeys.forEach(key => {
  const maskedKey = { 
    ...key, 
    api_key: key.api_key ? `${key.api_key.substring(0, 3)}...${key.api_key.substring(key.api_key.length - 3)}` : undefined,
    websocket_url: key.websocket_url ? "[MASKED]" : undefined,
    rpc_url: key.rpc_url ? "[MASKED]" : undefined,
    graphql_url: key.graphql_url ? "[MASKED]" : undefined
  };
  console.log(maskedKey);
});
