// pages/api/get-api-key.js
import { getApiKey as fetchApiKey } from '../../lib/mongodb';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for authentication (you should implement proper auth)
  // This is a simple placeholder - replace with your actual auth logic
  const apiSecret = req.headers['x-api-secret'];
  if (!apiSecret || apiSecret !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get the service name and endpoint type from the request query
  const { service, endpoint } = req.query;
  if (!service) {
    return res.status(400).json({ error: 'Service name required' });
  }
  
  try {
    // Use the MongoDB utility function to get the API key with decryption
    const keyDoc = await fetchApiKey(service, true);
    
    // Handle case when API key isn't found
    if (!keyDoc) {
      return res.status(404).json({ error: `API key for service '${service}' not found` });
    }
    
    // If a specific endpoint is requested, return that endpoint
    if (endpoint) {
      // Map endpoint name to the field name in the document
      const endpointMap = {
        'websocket': 'websocket_url',
        'rpc': 'rpc_url',
        'graphql': 'graphql_url',
        'api_key': 'api_key'
      };
      
      const fieldName = endpointMap[endpoint];
      if (!fieldName) {
        return res.status(400).json({ error: `Invalid endpoint type: ${endpoint}` });
      }
      
      const endpointValue = keyDoc[fieldName];
      if (!endpointValue) {
        return res.status(404).json({ error: `Endpoint '${endpoint}' not found for service '${service}'` });
      }
      
      return res.status(200).json({ [endpoint]: endpointValue });
    }
    
    // If no specific endpoint is requested, return all available data
    return res.status(200).json({
      api_key: keyDoc.api_key || null,
      websocket_url: keyDoc.websocket_url || null,
      rpc_url: keyDoc.rpc_url || null,
      graphql_url: keyDoc.graphql_url || null
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return res.status(500).json({ error: 'Server error fetching API key' });
  }
}
