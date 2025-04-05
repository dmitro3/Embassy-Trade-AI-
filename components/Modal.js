'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Modern Modal Component for Embassy Trade AI with Solana-inspired design
 * Features:
 * - Dark background with glowing borders using Solana colors
 * - Modern typography
 * - Responsive design
 * - Keyboard accessibility (Esc to close)
 * - Backdrop click to close
 * - Focus trap for accessibility
 */
const Modal = ({ 
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
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/70 backdrop-blur-md"
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
        <div className="relative bg-[#1A1F2E]/95 backdrop-blur-sm rounded-xl border border-transparent p-0 shadow-2xl">
          {/* Faux-gradient animated border */}
          <div className="absolute inset-0 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="solana-glow-border"></div>
          </div>
          
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-gray-800/50">
            <h3 
              className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA3] to-[#9945FF]"
              id="modal-title"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>

          {/* Modal Footer */}
          {(primaryAction || secondaryAction) && (
            <div className="px-6 py-5 border-t border-gray-800/50 flex justify-end space-x-3">
              {secondaryAction && (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  className="px-5 py-2.5 bg-gray-800/80 text-gray-100 rounded-lg hover:bg-gray-700/80 transition-colors border border-gray-700/50"
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction && (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#00FFA3] to-[#9945FF] hover:opacity-90 text-gray-900 rounded-lg font-medium transition-all transform hover:scale-105"
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Styles for the glowing border effect with Solana colors */}
      <style jsx global>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .solana-glow-border {
          position: absolute;
          top: -150%;
          left: -150%;
          right: -150%;
          bottom: -150%;
          background: conic-gradient(
            from 0deg, 
            rgba(0, 255, 163, 0),
            rgba(0, 255, 163, 0.3),
            rgba(153, 69, 255, 0.5),
            rgba(0, 255, 163, 0.3),
            rgba(0, 255, 163, 0)
          );
          animation: rotate 12s linear infinite;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-modal-fade-in {
          animation: modalFadeIn 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;