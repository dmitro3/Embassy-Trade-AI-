'use client';

/**
 * TradeForce UI Components & Styles
 * 
 * Professional UI components styled specifically for the TradeForce trading platform
 */

import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { pulse, fadeIn, gradientShift, botActivity } from '../animations/TradingAnimations';

// Premium gradient background
export const GradientBackground = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  background-size: 400% 400%;
  animation: ${gradientShift} 15s ease infinite;
`;

// Professional card component with subtle shadow and border
export const Card = styled.div`
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.5s ease-out;
  
  &:hover {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    border-color: rgba(255, 255, 255, 0.12);
  }
`;

// Dashboard section container
export const Section = styled.div`
  margin-bottom: 24px;
  animation: ${fadeIn} 0.5s ease-out;
  animation-fill-mode: both;
  animation-delay: ${props => props.delay || '0ms'};
`;

// Status indicator with animation based on status
export const StatusIndicator = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.status) {
      case 'active':
        return '#22c55e';
      case 'warning':
        return '#eab308';
      case 'error':
        return '#ef4444';
      case 'inactive':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }};
  display: inline-block;
  margin-right: 8px;
  
  ${props => props.status === 'active' && css`
    animation: ${pulse} 2s infinite;
  `}
`;

// Bot status badge with animation
export const BotStatusBadge = styled.div`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.status) {
      case 'active':
        return css`
          background-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          box-shadow: 0 0 0 rgba(34, 197, 94, 0.4);
          animation: ${botActivity} 2s infinite;
        `;
      case 'paused':
        return css`
          background-color: rgba(234, 179, 8, 0.2);
          color: #eab308;
        `;
      case 'stopped':
        return css`
          background-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        `;
      default:
        return css`
          background-color: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
        `;
    }
  }}
`;

// Animated button with hover effects
export const AnimatedButton = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return css`
          background-color: #3b82f6;
          color: white;
          &:hover {
            background-color: #2563eb;
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(1px);
          }
        `;
      case 'success':
        return css`
          background-color: #22c55e;
          color: white;
          &:hover {
            background-color: #16a34a;
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(1px);
          }
        `;
      case 'danger':
        return css`
          background-color: #ef4444;
          color: white;
          &:hover {
            background-color: #dc2626;
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(1px);
          }
        `;
      case 'outline':
        return css`
          background-color: transparent;
          border: 1px solid #3b82f6;
          color: #3b82f6;
          &:hover {
            background-color: rgba(59, 130, 246, 0.1);
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(1px);
          }
        `;
      default:
        return css`
          background-color: #1e293b;
          border: 1px solid #334155;
          color: white;
          &:hover {
            background-color: #334155;
            transform: translateY(-1px);
          }
          &:active {
            transform: translateY(1px);
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.4);
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;

// Trading chart container with professional styling
export const ChartContainer = styled.div`
  border-radius: 8px;
  background-color: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  height: ${props => props.height || '300px'};
`;

// Token input search box
export const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px;
  background-color: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
  
  &::placeholder {
    color: #4b5563;
  }
`;

// Professional select dropdown
export const Select = styled.select`
  appearance: none;
  background-color: rgba(15, 23, 42, 0.5);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  padding-right: 40px;
  color: white;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
`;

// Progress bar with animation
export const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    width: ${props => props.value || 0}%;
    height: 100%;
    background-color: ${props => {
      if (props.variant === 'success') return '#22c55e';
      if (props.variant === 'danger') return '#ef4444';
      if (props.variant === 'warning') return '#eab308';
      return '#3b82f6';
    }};
    border-radius: 3px;
    transition: width 0.5s ease;
  }
`;

// Tooltip styled component
export const Tooltip = styled.div`
  position: relative;
  display: inline-block;
  
  .tooltiptext {
    visibility: hidden;
    width: 120px;
    background-color: #1e293b;
    color: white;
    text-align: center;
    border-radius: 6px;
    padding: 5px;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -60px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.05);
    
    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: #1e293b transparent transparent transparent;
    }
  }
  
  &:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }
`;

// Export common premium styles
export const sharedStyles = {
  glassMorphism: `
    background: rgba(30, 41, 59, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  `,
  premium: `
    font-weight: 500;
    letter-spacing: -0.01em;
  `,
  // Adds a professional subtle shadow
  shadow: `
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  `,
  // Animation for elements appearing
  appearAnimation: `
    animation: ${fadeIn} 0.5s ease-out forwards;
  `,
  // Styles for premium text
  premiumText: `
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  `
};
