/**
 * Update MCP Settings Script
 * 
 * This script updates the MCP settings file to include the Token Discovery MCP server.
 * It reads the current settings file, adds the new server configuration, and writes it back.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the MCP settings file
const MCP_SETTINGS_PATH = path.join(process.env.APPDATA || process.env.HOME, 
  'Code - Insiders/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json');

// Path to the Token Discovery MCP config file
const TOKEN_DISCOVERY_CONFIG_PATH = path.join(__dirname, '../mcp/token-discovery-mcp/mcp-config.json');

// Main function
async function updateMcpSettings() {
  try {
    console.log('Updating MCP settings...');
    
    // Check if the MCP settings file exists
    if (!fs.existsSync(MCP_SETTINGS_PATH)) {
      console.error(`MCP settings file not found at: ${MCP_SETTINGS_PATH}`);
      console.log('Creating new MCP settings file...');
      
      // Create directory if it doesn't exist
      const settingsDir = path.dirname(MCP_SETTINGS_PATH);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      // Create empty settings file
      fs.writeFileSync(MCP_SETTINGS_PATH, JSON.stringify({ mcpServers: {} }, null, 2));
    }
    
    // Read the current MCP settings
    const mcpSettings = JSON.parse(fs.readFileSync(MCP_SETTINGS_PATH, 'utf8'));
    
    // Read the Token Discovery MCP config
    const tokenDiscoveryConfig = JSON.parse(fs.readFileSync(TOKEN_DISCOVERY_CONFIG_PATH, 'utf8'));
    
    // Merge the Token Discovery MCP config into the MCP settings
    const updatedSettings = {
      ...mcpSettings,
      mcpServers: {
        ...mcpSettings.mcpServers,
        ...tokenDiscoveryConfig.mcpServers
      }
    };
    
    // Write the updated settings back to the file
    fs.writeFileSync(MCP_SETTINGS_PATH, JSON.stringify(updatedSettings, null, 2));
    
    console.log('MCP settings updated successfully!');
    console.log(`Added Token Discovery MCP server to: ${MCP_SETTINGS_PATH}`);
    
    // Log the server configuration
    const serverName = Object.keys(tokenDiscoveryConfig.mcpServers)[0];
    console.log(`Server name: ${serverName}`);
    console.log(`Server config: ${JSON.stringify(tokenDiscoveryConfig.mcpServers[serverName], null, 2)}`);
    
    return true;
  } catch (error) {
    console.error(`Error updating MCP settings: ${error.message}`);
    return false;
  }
}

// Run the update function
updateMcpSettings().then((success) => {
  if (success) {
    console.log('Done!');
    process.exit(0);
  } else {
    console.error('Failed to update MCP settings.');
    process.exit(1);
  }
});
