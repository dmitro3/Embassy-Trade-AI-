/**
 * PhantomWalletConnector.js
 * 
 * A utility for connecting to the Phantom wallet in a non-custodial way.
 * This ensures that private keys are never stored or accessed by the extension.
 */

/**
 * Phantom wallet connector
 */
class PhantomWalletConnector {
  /**
   * Create a new Phantom wallet connector
   */
  constructor() {
    this.connected = false;
    this.publicKey = null;
    this.provider = null;
    this.network = 'mainnet-beta'; // Default to mainnet
    this.eventListeners = {
      connect: new Set(),
      disconnect: new Set(),
      accountChange: new Set()
    };
  }
  
  /**
   * Check if Phantom wallet is installed
   * 
   * @returns {boolean} - Whether Phantom is installed
   */
  isPhantomInstalled() {
    return window.phantom?.solana?.isPhantom || false;
  }
  
  /**
   * Get the Phantom provider
   * 
   * @returns {Object|null} - The Phantom provider or null if not available
   */
  getProvider() {
    if (window.phantom?.solana) {
      return window.phantom.solana;
    }
    
    return null;
  }
  
  /**
   * Connect to the Phantom wallet
   * 
   * @returns {Promise<Object>} - The connection result
   */
  async connect() {
    try {
      // Check if Phantom is installed
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet extension is not installed');
      }
      
      // Get the provider
      this.provider = this.getProvider();
      
      if (!this.provider) {
        throw new Error('Failed to get Phantom provider');
      }
      
      // Connect to the wallet
      const response = await this.provider.connect();
      
      // Store the public key
      this.publicKey = response.publicKey.toString();
      this.connected = true;
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Store connection info in local storage (only public key, never private key)
      this._storeConnectionInfo();
      
      // Notify listeners
      this._notifyListeners('connect', { publicKey: this.publicKey });
      
      console.log('Connected to Phantom wallet:', this.publicKey);
      
      return {
        success: true,
        publicKey: this.publicKey
      };
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Disconnect from the Phantom wallet
   * 
   * @returns {Promise<Object>} - The disconnection result
   */
  async disconnect() {
    try {
      if (!this.connected || !this.provider) {
        // Already disconnected
        return { success: true };
      }
      
      // Disconnect from the wallet
      await this.provider.disconnect();
      
      // Clear connection info
      this.connected = false;
      this.publicKey = null;
      
      // Remove connection info from local storage
      this._clearConnectionInfo();
      
      // Notify listeners
      this._notifyListeners('disconnect');
      
      console.log('Disconnected from Phantom wallet');
      
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting from Phantom wallet:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Sign a transaction using the Phantom wallet
   * 
   * @param {Transaction} transaction - The transaction to sign
   * @returns {Promise<Object>} - The signing result
   */
  async signTransaction(transaction) {
    try {
      if (!this.connected || !this.provider) {
        throw new Error('Not connected to Phantom wallet');
      }
      
      // Sign the transaction
      const signedTransaction = await this.provider.signTransaction(transaction);
      
      return {
        success: true,
        signedTransaction
      };
    } catch (error) {
      console.error('Error signing transaction:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Sign multiple transactions using the Phantom wallet
   * 
   * @param {Transaction[]} transactions - The transactions to sign
   * @returns {Promise<Object>} - The signing result
   */
  async signAllTransactions(transactions) {
    try {
      if (!this.connected || !this.provider) {
        throw new Error('Not connected to Phantom wallet');
      }
      
      // Sign the transactions
      const signedTransactions = await this.provider.signAllTransactions(transactions);
      
      return {
        success: true,
        signedTransactions
      };
    } catch (error) {
      console.error('Error signing transactions:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Sign a message using the Phantom wallet
   * 
   * @param {Uint8Array} message - The message to sign
   * @returns {Promise<Object>} - The signing result
   */
  async signMessage(message) {
    try {
      if (!this.connected || !this.provider) {
        throw new Error('Not connected to Phantom wallet');
      }
      
      // Sign the message
      const { signature } = await this.provider.signMessage(message);
      
      return {
        success: true,
        signature
      };
    } catch (error) {
      console.error('Error signing message:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check if the wallet is connected
   * 
   * @returns {boolean} - Whether the wallet is connected
   */
  isConnected() {
    return this.connected && !!this.publicKey;
  }
  
  /**
   * Get the public key of the connected wallet
   * 
   * @returns {string|null} - The public key or null if not connected
   */
  getPublicKey() {
    return this.publicKey;
  }
  
  /**
   * Set the network to use
   * 
   * @param {string} network - The network to use ('mainnet-beta', 'testnet', 'devnet')
   */
  setNetwork(network) {
    this.network = network;
  }
  
  /**
   * Get the current network
   * 
   * @returns {string} - The current network
   */
  getNetwork() {
    return this.network;
  }
  
  /**
   * Add an event listener
   * 
   * @param {string} event - The event to listen for ('connect', 'disconnect', 'accountChange')
   * @param {Function} callback - The callback function
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].add(callback);
    }
  }
  
  /**
   * Remove an event listener
   * 
   * @param {string} event - The event to stop listening for
   * @param {Function} callback - The callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].delete(callback);
    }
  }
  
  /**
   * Try to restore a previous connection
   * 
   * @returns {Promise<boolean>} - Whether the connection was restored
   */
  async tryRestoreConnection() {
    try {
      // Check if we have connection info in local storage
      const connectionInfo = this._getConnectionInfo();
      
      if (!connectionInfo || !connectionInfo.publicKey) {
        return false;
      }
      
      // Check if Phantom is installed
      if (!this.isPhantomInstalled()) {
        return false;
      }
      
      // Get the provider
      this.provider = this.getProvider();
      
      if (!this.provider) {
        return false;
      }
      
      // Check if the wallet is already connected
      try {
        // This will throw an error if not connected
        const response = await this.provider.connect({ onlyIfTrusted: true });
        
        // Store the public key
        this.publicKey = response.publicKey.toString();
        this.connected = true;
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Notify listeners
        this._notifyListeners('connect', { publicKey: this.publicKey });
        
        console.log('Restored connection to Phantom wallet:', this.publicKey);
        
        return true;
      } catch (error) {
        // Not connected or not trusted
        return false;
      }
    } catch (error) {
      console.error('Error restoring Phantom wallet connection:', error);
      return false;
    }
  }
  
  /**
   * Set up event listeners for the Phantom provider
   * 
   * @private
   */
  _setupEventListeners() {
    if (!this.provider) return;
    
    // Remove any existing listeners
    this.provider.removeAllListeners?.();
    
    // Listen for disconnect events
    this.provider.on('disconnect', () => {
      this.connected = false;
      this.publicKey = null;
      
      // Clear connection info
      this._clearConnectionInfo();
      
      // Notify listeners
      this._notifyListeners('disconnect');
      
      console.log('Disconnected from Phantom wallet');
    });
    
    // Listen for account change events
    this.provider.on('accountChanged', (publicKey) => {
      if (publicKey) {
        // Update the public key
        this.publicKey = publicKey.toString();
        
        // Update connection info
        this._storeConnectionInfo();
        
        // Notify listeners
        this._notifyListeners('accountChange', { publicKey: this.publicKey });
        
        console.log('Phantom wallet account changed:', this.publicKey);
      } else {
        // Wallet was disconnected
        this.connected = false;
        this.publicKey = null;
        
        // Clear connection info
        this._clearConnectionInfo();
        
        // Notify listeners
        this._notifyListeners('disconnect');
        
        console.log('Disconnected from Phantom wallet due to account change');
      }
    });
  }
  
  /**
   * Notify event listeners
   * 
   * @param {string} event - The event that occurred
   * @param {Object} data - The event data
   * @private
   */
  _notifyListeners(event, data = {}) {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      }
    }
  }
  
  /**
   * Store connection info in local storage
   * 
   * @private
   */
  _storeConnectionInfo() {
    if (!this.publicKey) return;
    
    const connectionInfo = {
      publicKey: this.publicKey,
      network: this.network,
      timestamp: Date.now()
    };
    
    localStorage.setItem('phantom_connection_info', JSON.stringify(connectionInfo));
  }
  
  /**
   * Get connection info from local storage
   * 
   * @returns {Object|null} - The connection info or null if not found
   * @private
   */
  _getConnectionInfo() {
    const connectionInfoString = localStorage.getItem('phantom_connection_info');
    
    if (!connectionInfoString) {
      return null;
    }
    
    try {
      return JSON.parse(connectionInfoString);
    } catch (error) {
      console.error('Error parsing Phantom connection info:', error);
      return null;
    }
  }
  
  /**
   * Clear connection info from local storage
   * 
   * @private
   */
  _clearConnectionInfo() {
    localStorage.removeItem('phantom_connection_info');
  }
}

/**
 * Singleton instance of the Phantom wallet connector
 */
let phantomWalletConnectorInstance = null;

/**
 * Get the Phantom wallet connector instance
 * 
 * @returns {PhantomWalletConnector} - The Phantom wallet connector instance
 */
function getPhantomWalletConnector() {
  if (!phantomWalletConnectorInstance) {
    phantomWalletConnectorInstance = new PhantomWalletConnector();
  }
  
  return phantomWalletConnectorInstance;
}

export { PhantomWalletConnector, getPhantomWalletConnector };
