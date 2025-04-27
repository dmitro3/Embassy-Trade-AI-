'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { useTheme } from '../lib/ThemeProvider';

const timeframes = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

const TechnicalChart = ({ 
  tradeData, 
  symbol = 'SOL/USD',
  initialTimeframe = '15m',
  showGridView = false,
  onPatternDetected = () => {},
  height = 400,
  width = '100%'
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialTimeframe);
  const [isGridView, setIsGridView] = useState(showGridView);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();
  
  // Generate mock data for demonstration
  const generateMockData = (timeframe, symbol) => {
    const now = new Date();
    const data = [];
    const basePrice = symbol.includes('SOL') ? 150 : symbol.includes('BTC') ? 65000 : 3000;
    const volatility = symbol.includes('SOL') ? 5 : symbol.includes('BTC') ? 1000 : 100;
    
    // Determine time increment based on timeframe
    let timeIncrement;
    let dataPoints;
    
    switch(timeframe) {
      case '1m':
        timeIncrement = 60 * 1000; // 1 minute
        dataPoints = 60; // 1 hour of data
        break;
      case '5m':
        timeIncrement = 5 * 60 * 1000; // 5 minutes
        dataPoints = 60; // 5 hours of data
        break;
      case '15m':
        timeIncrement = 15 * 60 * 1000; // 15 minutes
        dataPoints = 60; // 15 hours of data
        break;
      case '1h':
        timeIncrement = 60 * 60 * 1000; // 1 hour
        dataPoints = 48; // 2 days of data
        break;
      case '4h':
        timeIncrement = 4 * 60 * 60 * 1000; // 4 hours
        dataPoints = 42; // 7 days of data
        break;
      case '1d':
        timeIncrement = 24 * 60 * 60 * 1000; // 1 day
        dataPoints = 30; // 30 days of data
        break;
      default:
        timeIncrement = 15 * 60 * 1000; // 15 minutes
        dataPoints = 60; // 15 hours of data
    }
    
    // Generate data points
    for (let i = dataPoints; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * timeIncrement));
      
      // Create some price movement patterns
      let priceNoise = (Math.random() - 0.5) * volatility;
      
      // Add a trend
      let trendComponent = 0;
      if (i < dataPoints / 2) {
        // Uptrend in the first half
        trendComponent = (dataPoints / 2 - i) * (volatility / 20);
      } else {
        // Downtrend in the second half
        trendComponent = -(i - dataPoints / 2) * (volatility / 20);
      }
      
      // Add a bull flag pattern near the end
      let patternComponent = 0;
      if (i < 10) {
        // Bull flag consolidation
        patternComponent = Math.sin(i) * (volatility / 4);
      }
      
      const open = basePrice + trendComponent + patternComponent + priceNoise;
      const high = open + Math.random() * (volatility / 2);
      const low = open - Math.random() * (volatility / 2);
      const close = (open + high + low + priceNoise) / 3;
      
      data.push({
        time: time.getTime() / 1000,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    // Detect patterns in the generated data
    detectPatterns(data);
    
    return data;
  };
  
  // Detect trading patterns in the data
  const detectPatterns = (data) => {
    if (data.length < 10) return;
    
    // Detect bull flag pattern
    const lastBars = data.slice(-10);
    let hasUptrend = true;
    let hasConsolidation = true;
    
    // Check for prior uptrend
    for (let i = 0; i < 5; i++) {
      if (lastBars[i].close <= lastBars[i+1].close) {
        hasUptrend = false;
        break;
      }
    }
    
    // Check for consolidation (sideways movement)
    const consolidationBars = lastBars.slice(-5);
    const avgPrice = consolidationBars.reduce((sum, bar) => sum + bar.close, 0) / 5;
    const maxDeviation = Math.max(...consolidationBars.map(bar => Math.abs(bar.close - avgPrice)));
    
    // If max deviation is more than 2%, it's not a tight consolidation
    if (maxDeviation / avgPrice > 0.02) {
      hasConsolidation = false;
    }
    
    if (hasUptrend && hasConsolidation) {
      onPatternDetected({
        type: 'bull_flag',
        confidence: 0.85,
        entryPrice: lastBars[lastBars.length - 1].close,
        stopLoss: Math.min(...lastBars.slice(-5).map(bar => bar.low)) * 0.99,
        takeProfit: lastBars[lastBars.length - 1].close * 1.1
      });
    }
    
    // Detect relative volume spike
    const avgVolume = data.slice(-20, -1).reduce((sum, bar) => sum + bar.volume, 0) / 19;
    const currentVolume = data[data.length - 1].volume;
    
    if (currentVolume > avgVolume * 2) {
      onPatternDetected({
        type: 'volume_spike',
        confidence: 0.75,
        ratio: currentVolume / avgVolume,
        price: data[data.length - 1].close
      });
    }
  };
  
  // Load chart data
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would fetch data from an API
      // For now, we'll generate mock data
      const data = generateMockData(selectedTimeframe, symbol);
      setChartData(data);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data. Please try again later.');
      setIsLoading(false);
    }
  }, [selectedTimeframe, symbol]);
  
  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || isLoading || chartData.length === 0) return;
    
    // Clear previous chart if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    
    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: isDarkMode ? '#1e293b' : '#ffffff' },
        textColor: isDarkMode ? '#e5e7eb' : '#374151',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#334155' : '#e5e7eb' },
        horzLines: { color: isDarkMode ? '#334155' : '#e5e7eb' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    
    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#60a5fa',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    
    // Set data
    candlestickSeries.setData(chartData);
    volumeSeries.setData(chartData.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close > item.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    })));
    
    // Add trade markers if available
    if (tradeData) {
      // Entry marker
      candlestickSeries.createPriceLine({
        price: tradeData.entry,
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: 'Entry',
      });
      
      // Stop loss marker
      candlestickSeries.createPriceLine({
        price: tradeData.stopLoss,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'Stop Loss',
      });
      
      // Take profit marker
      candlestickSeries.createPriceLine({
        price: tradeData.takeProfit,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'Take Profit',
      });
    }
    
    // Fit content
    chart.timeScale().fitContent();
    
    // Save chart reference
    chartRef.current = chart;
    
    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartData, isDarkMode, height, tradeData, isLoading]);
  
  // Render grid view
  if (isGridView) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{symbol} Chart</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsGridView(false)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Single View
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {timeframes.map((tf) => (
            <div key={tf.value} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{symbol} - {tf.label}</h4>
              </div>
              <div className="h-[200px]">
                <TechnicalChart
                  symbol={symbol}
                  initialTimeframe={tf.value}
                  height={200}
                  showGridView={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Render single chart view
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{symbol} Chart</h3>
        <div className="flex items-center space-x-2">
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-3 py-1 text-sm ${
                  selectedTimeframe === tf.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } transition-colors`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsGridView(true)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Grid View
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <div 
          ref={chartContainerRef} 
          className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ height: `${height}px` }}
        />
      )}
      
      {tradeData && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Entry Price</div>
            <div className="text-lg font-medium text-blue-500">${tradeData.entry.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Stop Loss</div>
            <div className="text-lg font-medium text-red-500">${tradeData.stopLoss.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Take Profit</div>
            <div className="text-lg font-medium text-green-500">${tradeData.takeProfit.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalChart;
