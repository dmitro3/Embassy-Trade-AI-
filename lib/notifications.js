/**
 * Advanced notification system for trading signals and price alerts
 */

"use client";

// Store notification settings in localStorage
const NOTIFICATION_SETTINGS_KEY = 'embassy_notification_settings';

export const getNotificationSettings = () => {
  const settings = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
  return settings ? JSON.parse(settings) : {
    priceAlerts: true,
    tradeSignals: true,
    minimumConfidence: 0.8,
    priceChangeThreshold: 0.05, // 5% price change
    enabled: false
  };
};

export const updateNotificationSettings = (settings) => {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const settings = getNotificationSettings();
    settings.enabled = permission === 'granted';
    updateNotificationSettings(settings);
    return permission === 'granted';
  } catch (err) {
    console.error('Notification Permission Error:', err);
    return false;
  }
};

export const sendNotification = (title, options = {}) => {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
      data: {
        timestamp: new Date().toISOString(),
        ...options.data
      }
    });

    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error('Send Notification Error:', err);
    return null;
  }
};

export const notifyTradeOpportunity = async (signal) => {
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.tradeSignals) return;

  if (signal.confidence >= settings.minimumConfidence) {
    return sendNotification('High Confidence Trading Signal', {
      body: `${signal.signal.toUpperCase()} opportunity for EMB at $${signal.price.toFixed(3)} (${(signal.confidence * 100).toFixed(1)}% confidence)`,
      data: {
        url: '/trade',
        signalId: signal.id,
        type: 'trade_signal'
      }
    });
  }
};

export const notifyPriceMovement = async (priceData, previousPrice) => {
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.priceAlerts) return;

  const priceChange = Math.abs((priceData.price - previousPrice) / previousPrice);
  if (priceChange >= settings.priceChangeThreshold) {
    const direction = priceData.price > previousPrice ? 'increased' : 'decreased';
    return sendNotification('Significant Price Movement', {
      body: `EMB price has ${direction} by ${(priceChange * 100).toFixed(1)}% to $${priceData.price.toFixed(3)}`,
      data: {
        url: '/trade',
        type: 'price_alert',
        priceData
      }
    });
  }
};

// Track last known price for movement detection
let lastKnownPrice = null;

export const initializeNotifications = async () => {
  const permissionGranted = await requestNotificationPermission();
  if (!permissionGranted) return false;

  // Reset last known price
  lastKnownPrice = null;

  return true;
};

export const processNewPriceData = async (priceData) => {
  if (lastKnownPrice !== null) {
    await notifyPriceMovement(priceData, lastKnownPrice);
  }
  lastKnownPrice = priceData.price;
};

// Function to create a notification object
export const createNotification = (type, title, message) => ({
  id: Date.now(),
  type,
  title,
  message,
  timestamp: new Date().toISOString()
});

// Initial notifications state
export const initialNotifications = [];

// Sound settings
export const NOTIFICATION_SOUND_ENABLED = true;
export const NOTIFICATION_SOUND_URL = '/notification.mp3';

// Helper to play notification sound
export const playNotificationSound = () => {
  if (typeof window !== 'undefined' && NOTIFICATION_SOUND_ENABLED) {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.play().catch(error => {
      console.warn('Failed to play notification sound:', error);
    });
  }
};