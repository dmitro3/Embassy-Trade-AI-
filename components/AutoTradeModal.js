'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function AutoTradeModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    enabled: false,
    maxTrades: 5,
    maxLoss: 10, // percentage
    takeProfit: 15, // percentage
    tradingPair: 'SOL/USD',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSave = () => {
    // Here you would save settings to your backend or local storage
    console.log('Saving auto-trade settings:', settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto Trade Settings">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="enabled" className="font-medium">Enable Auto Trading</label>
          <input
            type="checkbox"
            id="enabled"
            name="enabled"
            checked={settings.enabled}
            onChange={handleChange}
            className="toggle toggle-primary"
          />
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Trading Pair</span>
          </label>
          <select
            name="tradingPair"
            value={settings.tradingPair}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value="SOL/USD">SOL/USD</option>
            <option value="BTC/USD">BTC/USD</option>
            <option value="ETH/USD">ETH/USD</option>
          </select>
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Maximum Trades</span>
          </label>
          <input
            type="number"
            name="maxTrades"
            value={settings.maxTrades}
            onChange={handleChange}
            className="input input-bordered w-full"
            min="1"
            max="20"
          />
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Maximum Loss (%)</span>
          </label>
          <input
            type="number"
            name="maxLoss"
            value={settings.maxLoss}
            onChange={handleChange}
            className="input input-bordered w-full"
            min="1"
            max="50"
          />
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Take Profit (%)</span>
          </label>
          <input
            type="number"
            name="takeProfit"
            value={settings.takeProfit}
            onChange={handleChange}
            className="input input-bordered w-full"
            min="1"
            max="100"
          />
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </Modal>
  );
}
