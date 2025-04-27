'use client';

/**
 * SPL Token Patch Module
 * 
 * This module provides a proper fix for the "Cannot set property unpackAccount" error
 * that occurs with the @solana/spl-token library in Next.js applications.
 *
 * The issue occurs because the library defines some properties with getters only,
 * but some code attempts to set these properties.
 */

// Flag to ensure we only apply the patch once
let isPatchApplied = false;

/**
 * Safely patch the SPL token library to prevent "Cannot set property unpackAccount" errors
 * @returns {boolean} Whether the patch was successfully applied
 */
export function applySplTokenPatch() {
  // Skip if already applied or if running on server
  if (isPatchApplied || typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Find webpack modules that match the SPL token library
    const splTokenModuleKeys = Object.keys(window).filter(key => 
      key.startsWith('__webpack_module__') && 
      window[key]?.toString?.().includes('unpackAccount')
    );
    
    if (splTokenModuleKeys.length === 0) {
      console.debug('SPL token module not found in webpack modules');
      return false;
    }
    
    // Process all matching modules to ensure comprehensive fix
    let patchSuccess = false;
    
    for (const moduleKey of splTokenModuleKeys) {
      const module = window[moduleKey];
      
      if (module && !module._patched) {
        const descriptors = Object.getOwnPropertyDescriptors(module);
        
        // Properties that might be getter-only and need patching
        const propsToCheck = ['unpackAccount', 'Account', 'AccountLayout'];
        
        for (const prop of propsToCheck) {
          if (descriptors[prop] && descriptors[prop].get && !descriptors[prop].set) {
            const originalGetter = descriptors[prop].get;
            
            Object.defineProperty(module, prop, {
              configurable: true,
              get: originalGetter,
              set: function() {} // Add empty setter to prevent error
            });
            
            console.debug(`Applied SPL token patch for property: ${prop}`);
            patchSuccess = true;
          }
        }
        
        // Mark module as patched
        if (patchSuccess) {
          module._patched = true;
        }
      }
    }
    
    isPatchApplied = patchSuccess;
    
    if (patchSuccess) {
      console.log('Successfully applied SPL token library patches');
    }
    
    return patchSuccess;
  } catch (err) {
    console.warn('Error applying SPL token patch:', err);
    return false;
  }
}

// Export a default function for easy importing
export default applySplTokenPatch;