import React, { useState, useEffect } from 'react';

const DisclaimerModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimerAccepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-black text-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl mb-4">Disclaimer</h2>
        <p className="mb-4">
          Embassy Trade AI LLC is not a financial advisor and does not provide financial advice. This application is for informational purposes only. Cryptocurrency trading carries high risks, including potential loss of funds. There is no guarantee of profit. You are solely responsible for your trading decisions and any losses. By using this application, you accept these terms and agree that Embassy Trade AI LLC is not liable for any damages or losses.
        </p>
        <button
          onClick={handleAccept}
          className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default DisclaimerModal;