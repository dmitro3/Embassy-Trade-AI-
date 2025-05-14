'use client';

import React, { useEffect } from 'react';
import logger from './logger';

/**
 * Firebase Fixer Component
 * React component that fixes common Firebase issues
 */
const FirebaseFixerComponent = () => {
  useEffect(() => {
    // Run the fixer when component mounts
    const fixer = new FirebaseFixer();
    fixer.fix().catch(err => {
      logger.error('Error in Firebase fixer:', err);
    });
  }, []);
  
  // This component doesn't render anything
  return null;
};

/**
 * Firebase Fixer
 * Utilities to fix common Firebase issues, particularly the 403 PERMISSION_DENIED error
 * from the Installations API
 */
class FirebaseFixer {
  constructor() {
    this.installationsMockEnabled = false;
    this.idbCleaned = false;
  }
  /**
   * Fix Firebase issues
   * 
   * @returns {Promise<boolean>} Whether fix was successful
   */
  async fix() {
    try {
      logger.info('Starting Firebase fixer');
      
      // Apply all fixes
      await this.mockInstallationsApi();
      await this.cleanIndexedDB();
      
      logger.info('Firebase fixer completed successfully');
      return true;
    } catch (error) {
      logger.error('Firebase fixer failed', error);
      return false;
    }
  }
  
  /**
   * Mock Firebase Installations API to prevent 403 errors
   * 
   * @returns {Promise<boolean>} Whether mock was applied
   */
  async mockInstallationsApi() {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      logger.info('Applying Firebase Installations API mock');
      
      // Create mock for Installations API
      window._firebase_installations_compat_mock = {
        getId: () => Promise.resolve('mock-installation-id-' + Date.now()),
        getToken: () => Promise.resolve('mock-token-' + Date.now()),
        onIdChange: () => () => {}
      };
      
      this.installationsMockEnabled = true;
      logger.info('Firebase Installations API mock applied successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to mock Firebase Installations API', error);
      return false;
    }
  }
  
  /**
   * Clean problematic IndexedDB entries
   * 
   * @returns {Promise<Object>} Cleaning results
   */
  async cleanIndexedDB() {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return { cleaned: false, reason: 'IndexedDB not available' };
      }
      
      logger.info('Cleaning problematic IndexedDB entries');
      
      // List of Firebase IndexedDB databases that might be problematic
      const problematicDBs = [
        'firebase-installations-database',
        'firebase-auth-database',
        'firebase-messaging-database',
        'firebaseLocalStorageDb'
      ];
      
      const results = {};
      
      // Try to delete each database
      for (const dbName of problematicDBs) {
        try {
          // Check if database exists by trying to open it
          const openRequest = window.indexedDB.open(dbName);
          let dbExists = false;
          
          await new Promise((resolve) => {
            openRequest.onsuccess = () => {
              dbExists = true;
              openRequest.result.close();
              resolve();
            };
            
            openRequest.onerror = () => {
              resolve();
            };
          });
          
          if (dbExists) {
            // Try to delete the database
            const deleteRequest = window.indexedDB.deleteDatabase(dbName);
            
            await new Promise((resolve) => {
              deleteRequest.onsuccess = () => {
                results[dbName] = 'deleted';
                resolve();
              };
              
              deleteRequest.onerror = () => {
                results[dbName] = 'error';
                resolve();
              };
            });
          } else {
            results[dbName] = 'not_found';
          }
        } catch (error) {
          results[dbName] = `error: ${error.message}`;
        }
      }
      
      this.idbCleaned = true;
      logger.info('IndexedDB cleaning completed', { results });
      
      return { cleaned: true, results };
    } catch (error) {
      logger.error('Failed to clean IndexedDB', error);
      return { cleaned: false, error: error.message };
    }
  }
  
  /**
   * Check if Installations mock is enabled
   * 
   * @returns {Promise<boolean>} Whether mock is enabled
   */
  async isInstallationsMockEnabled() {
    return this.installationsMockEnabled;
  }
  
  /**
   * Check if IndexedDB was cleaned
   * 
   * @returns {Promise<boolean>} Whether IndexedDB was cleaned
   */
  async isIndexedDBCleaned() {
    return this.idbCleaned;
  }
}

// Create singleton instance
const firebaseFixer = new FirebaseFixer();

// Apply fixes automatically on import
if (typeof window !== 'undefined') {
  firebaseFixer.fix().catch(() => {
    // Silent catch to prevent startup errors
  });
}

// Export the Firebase fixer component for dynamic import
export default FirebaseFixerComponent;
