'use client';

import React, { useEffect, useState } from 'react';

/**
 * ArcadeNotification Component
 * 
 * A reusable notification component for the Arcade with support for different types:
 * - success: Green notification for successful actions
 * - error: Red notification for errors
 * - warning: Yellow/amber notification for warnings
 * - info: Blue notification for general information
 */
const ArcadeNotification = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  showIcon = true,
  showCloseButton = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  
  // Auto-dismiss after duration
  useEffect(() => {
    if (!duration) return;
    
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, duration);
    
    // Progress bar animation
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 16);
    
    return () => {
      clearTimeout(dismissTimer);
      clearInterval(interval);
    };
  }, [duration]);
  
  // Handle close button click
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(() => {
        onClose();
      }, 300); // Wait for fade-out animation
    }
  };
  
  // Early return if not visible
  if (!isVisible) return null;
  
  // Determine styles based on notification type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-900/30 border-green-700/50',
          icon: '✓',
          iconClass: 'bg-green-700 text-green-100',
          text: 'text-green-300',
          progress: 'bg-green-700'
        };
      case 'error':
        return {
          container: 'bg-red-900/30 border-red-700/50',
          icon: '✕',
          iconClass: 'bg-red-700 text-red-100',
          text: 'text-red-300',
          progress: 'bg-red-700'
        };
      case 'warning':
        return {
          container: 'bg-amber-900/30 border-amber-700/50',
          icon: '!',
          iconClass: 'bg-amber-700 text-amber-100',
          text: 'text-amber-300',
          progress: 'bg-amber-700'
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-900/30 border-blue-700/50',
          icon: 'i',
          iconClass: 'bg-blue-700 text-blue-100',
          text: 'text-blue-300',
          progress: 'bg-blue-700'
        };
    }
  };
  
  const styles = getTypeStyles();
  
  return (
    <div 
      className={`rounded-lg border ${styles.container} p-4 mb-4 backdrop-blur-sm animate-fade-in relative overflow-hidden`}
      role="alert"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${styles.iconClass} flex items-center justify-center mr-3 text-sm font-bold`}>
            {styles.icon}
          </div>
        )}
        
        <div className="flex-grow">
          <p className={`${styles.text}`}>{message}</p>
        </div>
        
        {showCloseButton && (
          <button 
            onClick={handleClose}
            className="ml-3 text-gray-400 hover:text-white"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
          <div 
            className={`h-full ${styles.progress} transition-all duration-300 ease-linear`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ArcadeNotification;
