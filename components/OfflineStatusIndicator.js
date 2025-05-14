import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOfflineMode from '../hooks/useOfflineMode';

/**
 * OfflineStatusIndicator - Displays offline status and manages reconnection
 */
const OfflineStatusIndicator = ({
  position = 'bottom-right',
  enableAutoSync = true,
  onReconnect = null,
  theme = 'auto',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  
  // Get system theme preference
  const prefersDarkMode = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches 
    : false;
    
  // Determine theme colors
  const isDarkMode = theme === 'auto' ? prefersDarkMode : theme === 'dark';
  
  // Get offline mode state and utilities
  const {
    isOnline,
    offlineModeEnabled,
    offlineDuration,
    formattedOfflineDuration,
    pendingOperations,
    pendingOperationCount,
    syncPendingOperations
  } = useOfflineMode({
    onOfflineStart: () => {
      // Auto-expand when going offline
      setExpanded(true);
    },
    onOfflineEnd: (totalOfflineTime) => {
      // Auto-sync when coming back online
      if (enableAutoSync && pendingOperationCount > 0) {
        handleSyncOperations();
      }
      
      // Call onReconnect callback if provided
      if (onReconnect) {
        onReconnect(totalOfflineTime);
      }
    }
  });
  
  // Position styles
  const positionStyles = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
  }[position] || { bottom: '20px', right: '20px' };
  
  // Color theme
  const colors = isDarkMode ? {
    background: 'rgba(33, 33, 33, 0.95)',
    text: 'white',
    border: '#444',
    offlineBadge: '#dc3545',
    onlineBadge: '#28a745',
    buttonPrimary: '#007bff',
    buttonSecondary: '#6c757d',
  } : {
    background: 'rgba(255, 255, 255, 0.95)',
    text: '#333',
    border: '#ddd',
    offlineBadge: '#dc3545',
    onlineBadge: '#28a745',
    buttonPrimary: '#007bff',
    buttonSecondary: '#6c757d',
  };
  
  // Handle sync operations
  const handleSyncOperations = async () => {
    if (syncInProgress || !isOnline) return;
    
    setSyncInProgress(true);
    try {
      const result = await syncPendingOperations();
      setLastSyncResult(result);
      
      // Hide panel after successful sync if all operations were processed
      if (result.success && result.remaining === 0) {
        setTimeout(() => {
          setExpanded(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error syncing operations:', error);
      setLastSyncResult({
        success: false,
        error: error.message || 'Unknown error'
      });
    } finally {
      setSyncInProgress(false);
    }
  };
  
  // Periodic check for connectivity
  useEffect(() => {
    let checkInterval;
    
    if (offlineModeEnabled) {
      // Check connectivity every 30 seconds when offline
      checkInterval = setInterval(() => {
        // Try to fetch a small resource to test connectivity
        fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
          .then(() => {
            // If successful, we might have connectivity
            // The browser's online event should handle the rest
          })
          .catch(() => {
            // Still offline, nothing to do
          });
      }, 30000);
    }
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [offlineModeEnabled]);
  
  // Don't render anything if always online and no pending operations
  if (isOnline && !offlineModeEnabled && pendingOperationCount === 0) {
    return null;
  }
  
  return (
    <motion.div
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...positionStyles,
        maxWidth: expanded ? '320px' : '180px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.background,
        color: colors.text,
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div 
        style={{ 
          padding: '10px 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${colors.border}` : 'none',
        }}
        onClick={() => setExpanded(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{ 
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOnline ? colors.onlineBadge : colors.offlineBadge,
              animation: isOnline ? 'none' : 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <span style={{ fontWeight: 500 }}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {pendingOperationCount > 0 && (
            <span style={{ 
              backgroundColor: '#f0ad4e',
              color: 'white',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
            }}>
              {pendingOperationCount}
            </span>
          )}
          
          <span style={{ fontSize: '0.8rem' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>
      
      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '12px 15px' }}
          >
            {/* Status information */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Status:</span>
                <span style={{ 
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: isOnline ? colors.onlineBadge : colors.offlineBadge,
                }}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {!isOnline && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Offline for:</span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {formattedOfflineDuration}
                  </span>
                </div>
              )}
              
              {pendingOperationCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Pending operations:</span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {pendingOperationCount}
                  </span>
                </div>
              )}
            </div>
            
            {/* Last sync result */}
            {lastSyncResult && (
              <div 
                style={{ 
                  fontSize: '0.75rem',
                  padding: '8px',
                  marginBottom: '12px',
                  borderRadius: '4px',
                  backgroundColor: lastSyncResult.success ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                  border: `1px solid ${lastSyncResult.success ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)'}`,
                  color: lastSyncResult.success ? '#28a745' : '#dc3545',
                }}
              >
                {lastSyncResult.success ? (
                  <>Synced {lastSyncResult.successCount} operations successfully.</>
                ) : (
                  <>Failed to sync: {lastSyncResult.error || 'Unknown error'}</>
                )}
                {lastSyncResult.failureCount > 0 && (
                  <> Failed: {lastSyncResult.failureCount}</>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {/* Sync button */}
              <button
                onClick={handleSyncOperations}
                disabled={!isOnline || pendingOperationCount === 0 || syncInProgress}
                style={{
                  flex: '1',
                  padding: '6px 12px',
                  backgroundColor: colors.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: isOnline && pendingOperationCount > 0 && !syncInProgress ? 'pointer' : 'not-allowed',
                  opacity: isOnline && pendingOperationCount > 0 && !syncInProgress ? 1 : 0.6,
                }}
              >
                {syncInProgress ? 'Syncing...' : 'Sync Now'}
              </button>
              
              {/* Dismiss button */}
              <button
                onClick={() => setExpanded(false)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.buttonSecondary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* CSS for the pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
};

export default OfflineStatusIndicator;
