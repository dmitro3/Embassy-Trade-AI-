'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Dynamic trading chart animation that simulates real-time market movements
 */
export const TradingChartAnimation = ({ trend = 'neutral', height = 180 }) => {
  const [points, setPoints] = useState([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Generate initial chart data
  useEffect(() => {
    const trendMultiplier = trend === 'bullish' ? 1.5 : trend === 'bearish' ? 0.7 : 1;
    const volatility = trend === 'neutral' ? 10 : 15;
    
    // Generate smooth sine wave pattern with random variations
    const newPoints = Array(40).fill(0).map((_, i) => {
      const baseline = Math.sin(i / 5) * 20 + 50; // Sine wave
      const random = (Math.random() - 0.5) * volatility; // Random variation
      const trendLine = i * 0.5 * (trendMultiplier - 1); // Trend direction
      return Math.max(10, Math.min(90, baseline + random + trendLine));
    });
    
    setPoints(newPoints);
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setPoints(prev => {
        const lastValue = prev[prev.length - 1];
        const nextValue = Math.max(
          10, 
          Math.min(
            90,
            lastValue + (Math.random() - 0.5) * 10 * trendMultiplier
          )
        );
        return [...prev.slice(1), nextValue];
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [trend]);
  
  // Build the SVG path string from points
  const svgPath = points.length > 0
    ? points.reduce((path, point, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 100 - point;
        return path + `${i === 0 ? 'M' : 'L'}${x},${y}`;
      }, '')
    : '';
  
  // Add area below the line
  const areaPath = points.length > 0
    ? svgPath + `L100,100 L0,100 Z`
    : '';
    
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        pathLength: { duration: 2, ease: "easeInOut" },
        opacity: { duration: 0.5 }
      }
    }
  };
  
  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Gradient background for the area beneath the chart */}
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop 
              offset="0%" 
              style={{ 
                stopColor: trend === 'bullish' ? 'rgba(52, 211, 153, 0.8)' : 
                          trend === 'bearish' ? 'rgba(239, 68, 68, 0.8)' : 
                          'rgba(59, 130, 246, 0.8)', 
                stopOpacity: 0.5 
              }} 
            />
            <stop offset="100%" style={{ stopColor: 'rgba(17, 24, 39, 0)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line 
            key={`grid-${y}`} 
            x1="0" 
            y1={y} 
            x2="100" 
            y2={y} 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="0.5"
          />
        ))}
        
        {/* Area fill */}
        <path 
          d={areaPath} 
          fill="url(#chartGradient)"
          opacity={0.7}
          className="transition-opacity duration-500"
        />
        
        {/* Line */}
        <motion.path
          d={svgPath}
          fill="none"
          stroke={
            trend === 'bullish' ? '#10B981' :
            trend === 'bearish' ? '#EF4444' :
            '#3B82F6'
          }
          strokeWidth="2"
          strokeLinecap="round"
          variants={pathVariants}
          initial="hidden"
          animate="visible"
          onAnimationComplete={() => setAnimationComplete(true)}
        />
        
        {/* Pulsating dot at the end of the line */}
        {animationComplete && points.length > 0 && (
          <motion.circle
            cx={100}
            cy={100 - points[points.length - 1]}
            r={2}
            fill="white"
            animate={{
              r: [2, 4, 2],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </svg>
    </div>
  );
};

/**
 * Animated bot activity indicator
 */
export const BotActivityIndicator = ({ status, size = 180 }) => {
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer rotating ring */}
      <motion.div
        className={`absolute inset-0 rounded-full border-4 ${
          isActive ? 'border-green-500' : isPaused ? 'border-yellow-500' : 'border-gray-600'
        }`}
        style={{
          borderTopColor: 'transparent',
          borderRightColor: isActive ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
        }}
        animate={{
          rotate: isActive ? 360 : 0
        }}
        transition={{
          duration: isActive ? 3 : 0,
          ease: "linear",
          repeat: Infinity
        }}
      />
      
      {/* Inner pulsating circle */}
      <motion.div
        className={`absolute inset-4 rounded-full ${
          isActive ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : 'bg-gray-700'
        }`}
        animate={{
          scale: isActive ? [1, 1.05, 1] : [1, 1, 1],
          opacity: isActive ? [0.5, 0.8, 0.5] : 0.4
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Status text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className={`font-bold text-lg uppercase ${
            isActive ? 'text-green-400' : isPaused ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {status}
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {isActive ? 'Trading' : isPaused ? 'Standby' : 'Offline'}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Animated progress bar for trades
 */
export const TradeProgressBar = ({ progress, status, tradeId }) => {
  const colors = {
    pending: {
      bg: 'bg-blue-900',
      bar: 'bg-blue-500',
      pulse: 'rgba(59, 130, 246, 0.8)'
    },
    executing: {
      bg: 'bg-yellow-900',
      bar: 'bg-yellow-500',
      pulse: 'rgba(245, 158, 11, 0.8)'
    },
    completed: {
      bg: 'bg-green-900',
      bar: 'bg-green-500',
      pulse: 'rgba(16, 185, 129, 0.8)'
    },
    failed: {
      bg: 'bg-red-900',
      bar: 'bg-red-500',
      pulse: 'rgba(239, 68, 68, 0.8)'
    }
  };
  
  const currentColor = colors[status] || colors.pending;
  
  return (
    <div className={`w-full ${currentColor.bg} rounded-full h-4 relative overflow-hidden`}>
      <motion.div 
        className={`h-full ${currentColor.bar} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ 
          duration: 0.8, 
          ease: "easeOut"
        }}
      />
      
      {/* Pulsating effect for in-progress trades */}
      {(status === 'pending' || status === 'executing') && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: currentColor.pulse }}
          animate={{
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Progress percentage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white drop-shadow">
          {status === 'completed' ? 'COMPLETE' : status === 'failed' ? 'FAILED' : `${Math.round(progress)}%`}
        </span>
      </div>
    </div>
  );
};

/**
 * Price change animation with number counters
 */
export const PriceChangeAnimation = ({ initialPrice, currentPrice, symbol = 'SOL' }) => {
  const [displayPrice, setDisplayPrice] = useState(initialPrice);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [isDecreasing, setIsDecreasing] = useState(false);
  
  useEffect(() => {
    // Determine if price is increasing or decreasing
    if (currentPrice > displayPrice) {
      setIsIncreasing(true);
      setIsDecreasing(false);
    } else if (currentPrice < displayPrice) {
      setIsIncreasing(false);
      setIsDecreasing(true);
    }
    
    // Animate to new price
    const interval = setInterval(() => {
      setDisplayPrice(prev => {
        if (Math.abs(prev - currentPrice) < 0.01) {
          return currentPrice;
        }
        return prev + (currentPrice - prev) * 0.1;
      });
    }, 50);
    
    // Reset indicators after animation
    const timeout = setTimeout(() => {
      setIsIncreasing(false);
      setIsDecreasing(false);
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentPrice]);
  
  // Format price with appropriate decimals
  const formattedPrice = parseFloat(displayPrice).toFixed(
    displayPrice > 1000 ? 2 : 
    displayPrice > 100 ? 3 : 
    displayPrice > 1 ? 4 : 6
  );
  
  const percentChange = initialPrice !== 0 
    ? ((currentPrice - initialPrice) / initialPrice) * 100
    : 0;
  
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="flex items-baseline">
        <span className="text-gray-400 text-sm mr-2">{symbol}</span>
        <motion.span 
          className={`text-2xl font-mono font-bold ${
            isIncreasing ? 'text-green-500' : 
            isDecreasing ? 'text-red-500' : 
            'text-white'
          }`}
          animate={{ 
            scale: isIncreasing || isDecreasing ? [1, 1.05, 1] : 1 
          }}
          transition={{ duration: 0.3 }}
        >
          ${formattedPrice}
        </motion.span>
        
        {(isIncreasing || isDecreasing) && (
          <motion.span
            className={`ml-2 ${isIncreasing ? 'text-green-500' : 'text-red-500'}`}
            initial={{ opacity: 0, y: isIncreasing ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {isIncreasing ? '↑' : '↓'}
          </motion.span>
        )}
      </div>
      
      <div className={`text-xs ${
        percentChange > 0 ? 'text-green-500' : 
        percentChange < 0 ? 'text-red-500' : 
        'text-gray-400'
      }`}>
        {percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%
      </div>
    </div>
  );
};

/**
 * Animated particle system for trade execution visualization
 */
export const TradeExecutionParticles = ({ isExecuting, success }) => {
  const canvasRef = useRef(null);
  const [particles, setParticles] = useState([]);
  
  // Initialize particles
  useEffect(() => {
    if (!isExecuting && !success) return;
    
    // Create particle objects
    const newParticles = Array(30).fill().map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 5 + 1,
      speedX: (Math.random() - 0.5) * 8,
      speedY: (Math.random() - 0.5) * 8,
      color: success 
        ? `rgba(16, 185, 129, ${Math.random() * 0.7 + 0.3})` 
        : `rgba(59, 130, 246, ${Math.random() * 0.7 + 0.3})`,
      life: 100
    }));
    
    setParticles(newParticles);
    
    return () => {
      setParticles([]);
    };
  }, [isExecuting, success]);
  
  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || particles.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    const animationFrame = requestAnimationFrame(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            life: p.life - 1,
            size: p.life > 50 ? p.size : p.size * (p.life / 50)
          }))
          .filter(p => p.life > 0)
      );
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [particles]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-50"
      width={typeof window !== 'undefined' ? window.innerWidth : 300}
      height={typeof window !== 'undefined' ? window.innerHeight : 300}
    />
  );
};

/**
 * Network activity visualization for API calls and blockchain operations
 */
export const NetworkActivity = ({ active = false, speed = 'normal' }) => {
  const [dots, setDots] = useState([]);
  
  // Handle animation speed
  const speedMultiplier = 
    speed === 'slow' ? 0.5 :
    speed === 'fast' ? 2 : 1;
  
  useEffect(() => {
    if (!active) {
      setDots([]);
      return;
    }
    
    // Generate initial dots
    setDots(Array(5).fill().map((_, i) => ({
      id: i,
      x: Math.random() * 90 + 5,
      y: -10,
      size: Math.random() * 3 + 2,
      speed: (Math.random() + 0.5) * 3 * speedMultiplier
    })));
    
    // Animation interval
    const interval = setInterval(() => {
      setDots(prev => {
        // Move existing dots
        const updated = prev.map(dot => ({
          ...dot,
          y: dot.y + dot.speed
        })).filter(dot => dot.y < 110); // Remove dots that go beyond bottom
        
        // Add new dot with 20% probability
        if (Math.random() > 0.8 && updated.length < 15) {
          updated.push({
            id: Date.now(),
            x: Math.random() * 90 + 5,
            y: -10,
            size: Math.random() * 3 + 2,
            speed: (Math.random() + 0.5) * 3 * speedMultiplier
          });
        }
        
        return updated;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [active, speedMultiplier]);
  
  if (!active && dots.length === 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {dots.map(dot => (
          <circle
            key={dot.id}
            cx={dot.x}
            cy={dot.y}
            r={dot.size}
            fill="#3B82F6"
            opacity={(100 - dot.y) / 100}
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * Market pulse animation - visualizes market sentiment
 */
export const MarketPulse = ({ sentiment = 'neutral', intensity = 0.5 }) => {
  // Calculate parameters based on sentiment
  const frequency = 
    sentiment === 'bullish' ? 0.8 + intensity * 0.4 :
    sentiment === 'bearish' ? 0.5 + intensity * 0.3 :
    0.6 + intensity * 0.2;
  
  const amplitude = 
    sentiment === 'bullish' ? 15 + intensity * 10 :
    sentiment === 'bearish' ? 5 + intensity * 15 :
    10 + intensity * 5;
  
  const color = 
    sentiment === 'bullish' ? '#10B981' :
    sentiment === 'bearish' ? '#EF4444' :
    '#3B82F6';
  
  const [wave, setWave] = useState([]);
  
  // Generate wave pattern
  useEffect(() => {
    const generateWave = () => {
      const time = Date.now() / 1000;
      const points = [];
      
      for (let i = 0; i <= 100; i += 2) {
        const x = i;
        let y = 50;
        
        // Main wave
        y += Math.sin(i / 10 * frequency + time) * amplitude;
        
        // Add smaller harmonic waves for complexity
        y += Math.sin(i / 5 * frequency * 2 + time * 1.3) * (amplitude * 0.3);
        y += Math.cos(i / 15 * frequency * 0.5 + time * 0.7) * (amplitude * 0.2);
        
        points.push({ x, y });
      }
      
      return points;
    };
    
    setWave(generateWave());
    
    const interval = setInterval(() => {
      setWave(generateWave());
    }, 50);
    
    return () => clearInterval(interval);
  }, [frequency, amplitude]);
  
  // Create SVG path from wave points
  const getPath = () => {
    if (wave.length === 0) return '';
    
    return wave.reduce((path, point, i) => {
      return path + `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`;
    }, '');
  };
  
  return (
    <div className="w-full h-16 relative overflow-hidden">
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Reference line */}
        <line 
          x1="0" 
          y1="50" 
          x2="100" 
          y2="50" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="0.5" 
          strokeDasharray="3,3"
        />
        
        {/* Wave path */}
        <path
          d={getPath()}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
