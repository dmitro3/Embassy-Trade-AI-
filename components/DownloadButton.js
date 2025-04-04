import React, { useState, useEffect } from 'react';
import { FaWindows, FaApple } from 'react-icons/fa';
import Modal from './Modal'; // Assuming a reusable Modal component exists

const DownloadButton = () => {
  const [os, setOs] = useState('unknown');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) setOs('windows');
    else if (userAgent.includes('mac')) setOs('mac');
  }, []);

  const handleDownloadClick = () => setIsModalOpen(true);

  const handleAccept = () => {
    setIsModalOpen(false);
    const downloadUrl = os === 'windows'
      ? 'https://embassyai.xyz/downloads/embassy-trade-ai-win64.exe'
      : 'https://embassyai.xyz/downloads/embassy-trade-ai-mac64.dmg';
    window.location.href = downloadUrl; // Triggers the download
  };

  return (
    <div className="p-6">
      <button
        onClick={handleDownloadClick}
        className="flex items-center bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-2 rounded hover:brightness-110"
      >
        <img src="/assets/embassy-logo.png" alt="Embassy Trade AI Logo" className="h-6 mr-2" />
        {os === 'windows' ? <FaWindows className="mr-2" /> : <FaApple className="mr-2" />}
        Download for {os === 'windows' ? 'Windows' : 'macOS'}
      </button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Terms of Use"
        onConfirm={handleAccept}
      >
        <p>
          By downloading Embassy Trade AI, you agree that Embassy Trade AI LLC is not responsible for financial losses, does not provide financial advice, and offers no profit guarantee.
        </p>
      </Modal>
    </div>
  );
};

export default DownloadButton;