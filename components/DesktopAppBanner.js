// This file creates the missing component so your app can build properly

'use client';

import React, { useState } from 'react';
import Modal from './Modal';

export default function DesktopAppBanner({ isOpen, onClose }) {
  return (
    <div className="bg-blue-900/20 border border-blue-800/40 p-4 rounded-lg mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-3">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Embassy Desktop App Available</h3>
            <p className="text-sm text-gray-300">Get the best trading experience with our desktop application</p>
          </div>
        </div>
        <div className="ml-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Download Now
          </button>
        </div>
      </div>
    </div>
  );
}
