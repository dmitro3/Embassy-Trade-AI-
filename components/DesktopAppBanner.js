import React from 'react';
import useElectron from '../lib/useElectron';

/**
 * Banner that displays only in the desktop app to distinguish it from the web version
 * Shows "Desktop App (Demo/Beta Mode)" with version info
 */
const DesktopAppBanner = () => {
  const { isDesktopApp, appVersion, platform, openWebVersion } = useElectron();

  if (!isDesktopApp) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-1 px-4 text-xs flex justify-between items-center">
      <div className="flex items-center">
        <span className="font-bold">Desktop App (Demo/Beta Mode)</span>
        <span className="ml-2 px-1.5 py-0.5 bg-white bg-opacity-20 rounded text-xs">
          v{appVersion}
        </span>
        <span className="ml-2 opacity-70">
          {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux'}
        </span>
      </div>
      
      <button 
        onClick={openWebVersion}
        className="text-xs hover:underline focus:outline-none flex items-center"
      >
        Open Web Version
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
  );
};

export default DesktopAppBanner;