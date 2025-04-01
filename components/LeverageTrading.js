"use client";

import { useState } from 'react';

export default function LeverageTrading() {
  const [leverage, setLeverage] = useState(1);
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Leverage Trading</h2>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <p className="text-yellow-700">
          Leverage trading is coming soon! Trade with up to 10x leverage on EMB/USDC pairs.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Leverage (Coming Soon)
          </label>
          <select 
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            disabled
          >
            {[1, 2, 3, 5, 10].map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </div>
        <button
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
          disabled
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}