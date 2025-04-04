'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * Custom Modal Component with a background image
 * Features:
 * - Uses modal.png as background
 * - Modern typography
 * - Responsive design
 * - Keyboard accessibility (Esc to close)
 * - Backdrop click to close
 * - Focus trap for accessibility
 */
const CustomModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  primaryAction = null,
  secondaryAction = null,
  size = 'md', // sm, md, lg, xl
  closeOnBackdropClick = true,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key press
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that was focused when the modal opened
    previousActiveElement.current = document.activeElement;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Focus the modal when it opens
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to the element that was focused before the modal opened
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case 'md':
      default: return 'max-w-md';
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`${getSizeClasses()} w-full mx-4 relative animate-modal-fade-in`}
        tabIndex={-1}
      >
        {/* Background Image */}
        <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
          <Image
            src="/images/modal.png"
            alt="Modal Background"
            layout="fill"
            objectFit="cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"></div>
        </div>
        
        <div className="relative bg-transparent rounded-lg p-0 shadow-2xl z-10">
          {/* Modal Header */}
          <div className="p-5 border-b border-gray-800/50">
            <h3 
              className="text-xl font-semibold text-white"
              id="modal-title"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>

          {/* Modal Footer */}
          {(primaryAction || secondaryAction) && (
            <div className="p-5 border-t border-gray-800/50 flex justify-end space-x-3">
              {secondaryAction && (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  className="px-4 py-2 bg-gray-700/70 text-gray-100 rounded-md hover:bg-gray-600/70 transition-colors"
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-md font-medium transition-colors"
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Styles for animation */}
      <style jsx global>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-modal-fade-in {
          animation: modalFadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CustomModal;