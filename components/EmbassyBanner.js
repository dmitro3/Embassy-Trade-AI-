'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const EmbassyBanner = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Check localStorage on component mount to determine if banner should be shown
  useEffect(() => {
    const bannerDismissed = localStorage.getItem('betaBannerDismissed');
    if (bannerDismissed === 'true') {
      setShowBanner(false);
    }
  }, []);

  // Function to handle when user clicks X to dismiss banner
  const handleDismissClick = () => {
    setShowModal(true);
  };

  // Function to handle when user confirms dismissal in the modal
  const handleConfirmDismissal = () => {
    localStorage.setItem('betaBannerDismissed', 'true');
    setShowBanner(false);
    setShowModal(false);
  };

  // If banner is not meant to be shown, return null
  if (!showBanner) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-cyan-600 to-blue-800 text-white px-4 py-2 relative">
        <div className="flex items-center justify-center">
          <span className="bg-red-600 text-xs font-semibold me-2 px-2.5 py-0.5 rounded uppercase">
            Beta
          </span>
          <p className="text-sm sm:text-base">
            This product is in beta. Features may change without notice.
          </p>
          <button 
            onClick={handleDismissClick}
            className="absolute right-2 text-white hover:text-gray-200"
            aria-label="Dismiss beta banner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Dismissal confirmation modal */}
      <Modal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirm Dismissal"
        primaryAction={{
          label: "Confirm",
          onClick: handleConfirmDismissal
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setShowModal(false)
        }}
        size="sm"
      >
        <div>
          <p className="mb-4">
            You're about to dismiss the beta notification banner. This will hide important information about the beta status of this product.
          </p>
          <p>
            Please note that this product is still in beta and features may change without notice.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default EmbassyBanner;