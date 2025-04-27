// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\components\TradingViewChart.js
'use client';

import React, { useEffect, useRef } from 'react';

/**
 * TradingViewChart Component
 * 
 * A custom TradingView chart widget that uses the official TradingView embed script
 */
const TradingViewChart = ({ 
  symbol = 'SOLUSD', 
  theme = 'dark', 
  interval = '60', 
  width = '100%', 
  height = '100%',
  style = '1',
  timezone = 'Etc/UTC'
}) => {
  const containerRef = useRef(null);
  const scriptRef = useRef(null);
  
  useEffect(() => {
    // Clean up any existing widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    // Remove any old script tags
    if (scriptRef.current) {
      document.body.removeChild(scriptRef.current);
      scriptRef.current = null;
    }

    // Create new container for the widget
    const container = document.createElement('div');
    container.setAttribute('class', 'tradingview-widget-container');
    
    const widgetContainer = document.createElement('div');
    widgetContainer.setAttribute('id', `tradingview_${Math.random().toString(36).substring(2, 9)}`);
    widgetContainer.style.width = width;
    widgetContainer.style.height = height;
    
    container.appendChild(widgetContainer);
    containerRef.current.appendChild(container);

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          "width": "100%",
          "height": "100%",
          "symbol": symbol,
          "interval": interval,
          "timezone": timezone,
          "theme": theme,
          "style": style,
          "locale": "en",
          "toolbar_bg": "#1f2937",
          "enable_publishing": false,
          "hide_top_toolbar": false,
          "save_image": false,
          "container_id": widgetContainer.id
        });
      }
    };
    
    document.body.appendChild(script);
    scriptRef.current = script;
    
    return () => {
      // Clean up
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [symbol, theme, interval, width, height, style, timezone]);
  
  return <div ref={containerRef} style={{ width, height }} />;
};

export default TradingViewChart;
