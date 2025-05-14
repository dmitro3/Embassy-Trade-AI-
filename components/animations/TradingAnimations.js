'use client';

/**
 * TradeForce Animation Library
 * 
 * This module provides professional animations for the TradeForce trading interface
 * inspired by professional platforms like Robinhood, Kraken, and Salesforce.
 */

import { keyframes } from '@emotion/react';

// Pulse animation for active indicators
export const pulse = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(0.98);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.98);
  }
`;

// Slide in animation for panels and cards
export const slideIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Fade in animation for gentle transitions
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

// Subtle gradient shift animation
export const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Price ticker animation
export const priceTicker = keyframes`
  0% {
    color: inherit;
  }
  50% {
    color: #22c55e;
  }
  100% {
    color: inherit;
  }
`;

// Profit flash animation (green)
export const profitFlash = keyframes`
  0% {
    background-color: rgba(34, 197, 94, 0);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.2);
  }
  100% {
    background-color: rgba(34, 197, 94, 0);
  }
`;

// Loss flash animation (red)
export const lossFlash = keyframes`
  0% {
    background-color: rgba(239, 68, 68, 0);
  }
  50% {
    background-color: rgba(239, 68, 68, 0.2);
  }
  100% {
    background-color: rgba(239, 68, 68, 0);
  }
`;

// Bot activity animation
export const botActivity = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
`;

// Chart loading animation
export const chartLoading = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// Animation timing presets
export const AnimationTimings = {
  fast: '0.2s',
  normal: '0.4s',
  slow: '0.8s',
  veryFast: '0.1s'
};

// Button press animation
export const buttonPress = {
  initial: { scale: 1 },
  pressed: { scale: 0.97 },
  transition: { duration: 0.1 }
};

// Panel appear animation
export const panelAppear = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1.0]
    }
  }
};

// Staggered list item animation
export const listItemAnimation = (index) => ({
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      delay: index * 0.05,
      duration: 0.3
    }
  }
});

export const createRipple = (event) => {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
  circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
};
