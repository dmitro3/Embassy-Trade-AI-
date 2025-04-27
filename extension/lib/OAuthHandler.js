/**
 * OAuthHandler.js
 * 
 * A utility for handling OAuth 2.0 authentication flows with trading platforms.
 * Manages authorization, token refresh, and secure token storage.
 */

import { SecureStorage, ApiKeyStorage } from './SecureStorage.js';

/**
 * OAuth handler for trading platforms
 */
class OAuthHandler {
  /**
   * Create a new OAuth handler for a specific platform
   * 
   * @param {string} platform - The platform to handle OAuth for (e.g., 'robinhood', 'kraken', 'axiom')
   * @param {ApiKeyStorage} apiKeyStorage - The API key storage instance
   */
  constructor(platform, apiKeyStorage) {
    this.platform = platform;
    this.apiKeyStorage = apiKeyStorage;
    
    // Platform-specific configurations
    this.tokenEndpoints = {
      robinhood: 'https://api.robinhood.com/oauth2/token',
      kraken: 'https://api.kraken.com/0/private/GetToken',
      axiom: 'https://api.axiom.trade/oauth/token'
    };
    
    this.authUrls = {
      robinhood: 'https://robinhood.com/oauth2/authorize',
      kraken: 'https://auth.kraken.com/oauth2/authorize',
      axiom: 'https://axiom.trade/oauth/authorize'
    };
    
    this.clientIds = {
      robinhood: process.env.ROBINHOOD_CLIENT_ID || 'YOUR_ROBINHOOD_CLIENT_ID',
      kraken: process.env.KRAKEN_CLIENT_ID || 'YOUR_KRAKEN_CLIENT_ID',
      axiom: process.env.AXIOM_CLIENT_ID || 'YOUR_AXIOM_CLIENT_ID'
    };
    
    this.clientSecrets = {
      robinhood: process.env.ROBINHOOD_CLIENT_SECRET || 'YOUR_ROBINHOOD_CLIENT_SECRET',
      kraken: process.env.KRAKEN_CLIENT_SECRET || 'YOUR_KRAKEN_CLIENT_SECRET',
      axiom: process.env.AXIOM_CLIENT_SECRET || 'YOUR_AXIOM_CLIENT_SECRET'
    };
    
    // Get the redirect URL from the extension
    this.redirectUri = chrome.identity.getRedirectURL();
    
    // Set up alarm name for token refresh
    this.tokenRefreshAlarmName = `${platform}_token_refresh`;
    
    // Set up alarm listener for token refresh
    chrome.alarms.onAlarm.addListener(this._handleAlarm.bind(this));
  }
  
  /**
   * Start the OAuth authorization flow
   * 
   * @returns {Promise<Object>} - The authorization result
   */
  async authorize() {
    try {
      // Build the authorization URL
      const authUrl = this._buildAuthUrl();
      
      // Launch the web auth flow
      const responseUrl = await this._launchWebAuthFlow(authUrl);
      
      // Parse the response URL
      const tokens = this._parseAuthResponse(responseUrl);
      
      if (!tokens.accessToken) {
        throw new Error('Failed to get access token');
      }
      
      // Store the tokens securely
      await this._storeTokens(tokens);
      
      // Set up token refresh
      this._scheduleTokenRefresh(tokens.expiresIn);
      
      // Log the successful authorization (without sensitive data)
      console.log(`Successfully authorized with ${this.platform}`);
      
      return {
        success: true,
        platform: this.platform,
        expiresIn: tokens.expiresIn
      };
    } catch (error) {
      console.error(`OAuth authorization failed for ${this.platform}:`, error);
      return {
        success: false,
        platform: this.platform,
        error: error.message
      };
    }
  }
  
  /**
   * Refresh the access token
   * 
   * @returns {Promise<Object>} - The refresh result
   */
  async refreshToken() {
    try {
      // Get the refresh token
      const tokens = await this._getTokens();
      
      if (!tokens || !tokens.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Prepare the request
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: this.clientIds[this.platform],
        client_secret: this.clientSecrets[this.platform],
        redirect_uri: this.redirectUri
      });
      
      // Send the request
      const response = await fetch(this.tokenEndpoints[this.platform], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Create the tokens object
      const newTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken, // Use the old refresh token if a new one isn't provided
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope || tokens.scope
      };
      
      // Store the new tokens
      await this._storeTokens(newTokens);
      
      // Schedule the next token refresh
      this._scheduleTokenRefresh(newTokens.expiresIn);
      
      // Log the successful refresh (without sensitive data)
      console.log(`Successfully refreshed token for ${this.platform}`);
      
      return {
        success: true,
        platform: this.platform,
        expiresIn: newTokens.expiresIn
      };
    } catch (error) {
      console.error(`Token refresh failed for ${this.platform}:`, error);
      
      // If the refresh token is invalid, we need to re-authorize
      if (error.message.includes('invalid_grant') || error.message.includes('401')) {
        // Clear the tokens
        await this._clearTokens();
        
        return {
          success: false,
          platform: this.platform,
          error: 'Refresh token expired, re-authorization required',
          requiresReauth: true
        };
      }
      
      return {
        success: false,
        platform: this.platform,
        error: error.message
      };
    }
  }
  
  /**
   * Check if the user is authorized with the platform
   * 
   * @returns {Promise<boolean>} - Whether the user is authorized
   */
  async isAuthorized() {
    try {
      const tokens = await this._getTokens();
      return !!(tokens && tokens.accessToken);
    } catch (error) {
      console.error(`Error checking authorization for ${this.platform}:`, error);
      return false;
    }
  }
  
  /**
   * Get the access token for API requests
   * 
   * @returns {Promise<string|null>} - The access token or null if not authorized
   */
  async getAccessToken() {
    try {
      const tokens = await this._getTokens();
      
      if (!tokens || !tokens.accessToken) {
        return null;
      }
      
      return tokens.accessToken;
    } catch (error) {
      console.error(`Error getting access token for ${this.platform}:`, error);
      return null;
    }
  }
  
  /**
   * Revoke the authorization and clear tokens
   * 
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async revokeAuthorization() {
    try {
      // Get the tokens
      const tokens = await this._getTokens();
      
      if (!tokens || !tokens.accessToken) {
        // Already unauthorized
        return true;
      }
      
      // Some platforms have a revoke endpoint
      if (this.platform === 'robinhood' || this.platform === 'axiom') {
        const revokeEndpoint = this.platform === 'robinhood' 
          ? 'https://api.robinhood.com/oauth2/revoke_token/' 
          : 'https://api.axiom.trade/oauth/revoke';
        
        // Send the revoke request
        await fetch(revokeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${tokens.accessToken}`
          },
          body: new URLSearchParams({
            token: tokens.accessToken,
            client_id: this.clientIds[this.platform],
            client_secret: this.clientSecrets[this.platform]
          }).toString()
        });
      }
      
      // Clear the tokens
      await this._clearTokens();
      
      // Cancel the token refresh alarm
      chrome.alarms.clear(this.tokenRefreshAlarmName);
      
      // Log the successful revocation
      console.log(`Successfully revoked authorization for ${this.platform}`);
      
      return true;
    } catch (error) {
      console.error(`Error revoking authorization for ${this.platform}:`, error);
      
      // Still try to clear the tokens locally
      try {
        await this._clearTokens();
        chrome.alarms.clear(this.tokenRefreshAlarmName);
      } catch (e) {
        console.error(`Error clearing tokens for ${this.platform}:`, e);
      }
      
      return false;
    }
  }
  
  /**
   * Build the authorization URL
   * 
   * @returns {string} - The authorization URL
   * @private
   */
  _buildAuthUrl() {
    const url = new URL(this.authUrls[this.platform]);
    
    // Add the required parameters
    url.searchParams.append('client_id', this.clientIds[this.platform]);
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', this._generateState());
    url.searchParams.append('scope', this._getScope());
    
    return url.toString();
  }
  
  /**
   * Launch the web auth flow
   * 
   * @param {string} authUrl - The authorization URL
   * @returns {Promise<string>} - The response URL
   * @private
   */
  async _launchWebAuthFlow(authUrl) {
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!responseUrl) {
            reject(new Error('No response URL'));
          } else {
            resolve(responseUrl);
          }
        }
      );
    });
  }
  
  /**
   * Parse the authorization response
   * 
   * @param {string} responseUrl - The response URL
   * @returns {Object} - The parsed tokens
   * @private
   */
  _parseAuthResponse(responseUrl) {
    const url = new URL(responseUrl);
    
    // Check if the response contains an authorization code or tokens directly
    if (url.searchParams.has('code')) {
      // Authorization code flow
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      // Verify state parameter to prevent CSRF
      if (state !== localStorage.getItem(`${this.platform}_oauth_state`)) {
        throw new Error('Invalid state parameter');
      }
      
      // Clear the state
      localStorage.removeItem(`${this.platform}_oauth_state`);
      
      // We need to exchange the code for tokens
      return this._exchangeCodeForTokens(code);
    } else if (url.hash) {
      // Implicit flow - tokens are in the URL fragment
      const params = new URLSearchParams(url.hash.substring(1));
      
      return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token'),
        expiresIn: parseInt(params.get('expires_in'), 10),
        tokenType: params.get('token_type') || 'Bearer',
        scope: params.get('scope')
      };
    } else {
      throw new Error('Invalid response URL');
    }
  }
  
  /**
   * Exchange an authorization code for tokens
   * 
   * @param {string} code - The authorization code
   * @returns {Promise<Object>} - The tokens
   * @private
   */
  async _exchangeCodeForTokens(code) {
    // Prepare the request
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientIds[this.platform],
      client_secret: this.clientSecrets[this.platform],
      redirect_uri: this.redirectUri
    });
    
    // Send the request
    const response = await fetch(this.tokenEndpoints[this.platform], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    };
  }
  
  /**
   * Store the tokens securely
   * 
   * @param {Object} tokens - The tokens to store
   * @returns {Promise<void>}
   * @private
   */
  async _storeTokens(tokens) {
    await this.apiKeyStorage.storeApiKey(`${this.platform}_oauth`, tokens);
  }
  
  /**
   * Get the stored tokens
   * 
   * @returns {Promise<Object|null>} - The tokens or null if not found
   * @private
   */
  async _getTokens() {
    return await this.apiKeyStorage.getApiKey(`${this.platform}_oauth`);
  }
  
  /**
   * Clear the stored tokens
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _clearTokens() {
    await this.apiKeyStorage.deleteApiKey(`${this.platform}_oauth`);
  }
  
  /**
   * Schedule a token refresh
   * 
   * @param {number} expiresIn - The number of seconds until the token expires
   * @private
   */
  _scheduleTokenRefresh(expiresIn) {
    // Calculate when to refresh the token (5 minutes before expiration)
    const refreshInMinutes = Math.max(1, (expiresIn / 60) - 5);
    
    // Create an alarm to refresh the token
    chrome.alarms.create(this.tokenRefreshAlarmName, {
      delayInMinutes: refreshInMinutes
    });
    
    console.log(`Scheduled token refresh for ${this.platform} in ${refreshInMinutes} minutes`);
  }
  
  /**
   * Handle an alarm event
   * 
   * @param {Object} alarm - The alarm that fired
   * @private
   */
  async _handleAlarm(alarm) {
    if (alarm.name === this.tokenRefreshAlarmName) {
      console.log(`Token refresh alarm fired for ${this.platform}`);
      await this.refreshToken();
    }
  }
  
  /**
   * Generate a random state parameter for CSRF protection
   * 
   * @returns {string} - A random state parameter
   * @private
   */
  _generateState() {
    const state = SecureStorage.generatePassword(16);
    localStorage.setItem(`${this.platform}_oauth_state`, state);
    return state;
  }
  
  /**
   * Get the OAuth scope for the platform
   * 
   * @returns {string} - The OAuth scope
   * @private
   */
  _getScope() {
    switch (this.platform) {
      case 'robinhood':
        return 'read write';
      case 'kraken':
        return 'trade:read trade:write account:read account:write';
      case 'axiom':
        return 'trading account:read account:write';
      default:
        return '';
    }
  }
}

/**
 * OAuth manager for handling multiple platforms
 */
class OAuthManager {
  /**
   * Create a new OAuth manager
   * 
   * @param {ApiKeyStorage} apiKeyStorage - The API key storage instance
   */
  constructor(apiKeyStorage) {
    this.apiKeyStorage = apiKeyStorage;
    this.handlers = {};
  }
  
  /**
   * Get an OAuth handler for a platform
   * 
   * @param {string} platform - The platform to get a handler for
   * @returns {OAuthHandler} - The OAuth handler
   */
  getHandler(platform) {
    if (!this.handlers[platform]) {
      this.handlers[platform] = new OAuthHandler(platform, this.apiKeyStorage);
    }
    
    return this.handlers[platform];
  }
  
  /**
   * Authorize with a platform
   * 
   * @param {string} platform - The platform to authorize with
   * @returns {Promise<Object>} - The authorization result
   */
  async authorize(platform) {
    const handler = this.getHandler(platform);
    return await handler.authorize();
  }
  
  /**
   * Check if the user is authorized with a platform
   * 
   * @param {string} platform - The platform to check
   * @returns {Promise<boolean>} - Whether the user is authorized
   */
  async isAuthorized(platform) {
    const handler = this.getHandler(platform);
    return await handler.isAuthorized();
  }
  
  /**
   * Get the access token for a platform
   * 
   * @param {string} platform - The platform to get the token for
   * @returns {Promise<string|null>} - The access token or null if not authorized
   */
  async getAccessToken(platform) {
    const handler = this.getHandler(platform);
    return await handler.getAccessToken();
  }
  
  /**
   * Revoke authorization for a platform
   * 
   * @param {string} platform - The platform to revoke authorization for
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async revokeAuthorization(platform) {
    const handler = this.getHandler(platform);
    return await handler.revokeAuthorization();
  }
  
  /**
   * Revoke authorization for all platforms
   * 
   * @returns {Promise<Object>} - The results for each platform
   */
  async revokeAllAuthorizations() {
    const platforms = ['robinhood', 'kraken', 'axiom'];
    const results = {};
    
    for (const platform of platforms) {
      results[platform] = await this.revokeAuthorization(platform);
    }
    
    return results;
  }
}

export { OAuthHandler, OAuthManager };
