'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DesktopDownload() {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-lg p-6 border border-blue-700/30 mb-8">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="mb-6 md:mb-0 md:mr-8">
          <h2 className="text-2xl font-bold text-white mb-3">Download Embassy Desktop</h2>
          <p className="text-gray-300 mb-4">
            Get the best trading experience with our dedicated desktop application.
            Faster execution, lower latency, and exclusive desktop-only features.
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-gray-200">Faster trade execution</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-gray-200">Direct blockchain integration</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-gray-200">Exclusive desktop-only features</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <a 
              href="/downloads/embassy-desktop-latest.exe" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              Download for Windows
            </a>
            
            <a 
              href="/downloads/embassy-desktop-latest.dmg" 
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              Download for Mac
            </a>
            
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="bg-transparent border border-blue-500 text-blue-400 hover:bg-blue-900/20 px-4 py-3 rounded-lg font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              View Details
            </button>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg p-3 w-60 h-auto">
            <div className="relative">
              <div className="bg-gray-900 h-8 rounded-t-lg flex items-center px-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="h-40 bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <p className="text-sm mt-2 text-blue-300 font-medium">Embassy Desktop App</p>
                  <p className="text-xs text-gray-400">v1.2.3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-6 bg-blue-900/10 p-4 rounded-lg border border-blue-800/20 animate-fadeIn">
          <h3 className="text-lg font-medium text-white mb-3">Desktop App Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-blue-400 font-medium mb-2">System Requirements</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Windows 10/11 or macOS 11+</li>
                <li>• 4GB RAM minimum (8GB recommended)</li>
                <li>• 500MB free disk space</li>
                <li>• Internet connection</li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-400 font-medium mb-2">Desktop-Only Features</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Trading bot automation</li>
                <li>• Direct wallet hardware integrations</li>
                <li>• Advanced charting tools</li>
                <li>• Custom trading algorithm builder</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>The Embassy Desktop App provides a seamless trading experience with lower latency and better performance compared to the web application. It also includes additional security features and exclusive trading tools.</p>
          </div>
        </div>
      )}
    </div>
  );
}
