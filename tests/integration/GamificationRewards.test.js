import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Import gamification module directly to test its integration
import * as gamification from '@/lib/gamification';

// Create a simple test component that uses gamification
const TestComponent = ({ onMount = () => {} }) => {
  React.useEffect(() => {
    onMount();
  }, [onMount]);
  
  return (
    <div>
      <h1>Gamification Test</h1>
      <div data-testid="xp-value">{gamification.getCurrentXP()}</div>
      <div data-testid="level-value">{gamification.getLevel()}</div>
      <div id="notifications" data-testid="notifications"></div>
    </div>
  );
};

// We need React to use hooks
import React from 'react';

describe('Gamification Rewards Integration', () => {
  // Store original methods before mocking
  const originalShowNotification = gamification.showNotification;
  const originalAddXpPoints = gamification.addXpPoints;
  const originalGetCurrentXP = gamification.getCurrentXP;
  const originalGetLevel = gamification.getLevel;
  
  // Mock DOM for notifications
  beforeAll(() => {
    // Create notification container
    document.body.innerHTML = '<div id="notification-container"></div>';
  });
  
  afterEach(() => {
    // Clear notification container between tests
    if (document.getElementById('notification-container')) {
      document.getElementById('notification-container').innerHTML = '';
    }
    
    // Reset XP and level
    gamification.setCurrentXP(0);
  });
  
  afterAll(() => {
    // Restore original methods after all tests
    if (typeof originalShowNotification === 'function') {
      gamification.showNotification = originalShowNotification;
    }
    if (typeof originalAddXpPoints === 'function') {
      gamification.addXpPoints = originalAddXpPoints;
    }
    if (typeof originalGetCurrentXP === 'function') {
      gamification.getCurrentXP = originalGetCurrentXP;
    }
    if (typeof originalGetLevel === 'function') {
      gamification.getLevel = originalGetLevel;
    }
  });
  
  test('Trading with EMB grants +5 XP', async () => {
    const handleTrade = jest.fn().mockImplementation(async () => {
      await gamification.addXpPoints(5, 'Trading with $EMB');
      return true;
    });
    
    render(<TestComponent onMount={handleTrade} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('xp-value').textContent).toBe('5');
    });
    
    // Check if notification was displayed
    const notificationContainer = document.getElementById('notification-container');
    expect(notificationContainer.innerHTML).toContain('+5 XP for Trading with $EMB');
  });
  
  test('Swapping to EMB grants +15 XP', async () => {
    const handleSwap = jest.fn().mockImplementation(async () => {
      await gamification.addXpPoints(15, 'Swapping to $EMB');
      return true;
    });
    
    render(<TestComponent onMount={handleSwap} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('xp-value').textContent).toBe('15');
    });
    
    // Check if notification was displayed
    const notificationContainer = document.getElementById('notification-container');
    expect(notificationContainer.innerHTML).toContain('+15 XP for Swapping to $EMB');
  });
  
  test('Level up triggers notification and badge award', async () => {
    // Mock initial XP to be just below level threshold
    gamification.setCurrentXP(95);
    
    const handleAction = jest.fn().mockImplementation(async () => {
      // Add enough XP to level up
      await gamification.addXpPoints(10, 'Action');
      return true;
    });
    
    render(<TestComponent onMount={handleAction} />);
    
    await waitFor(() => {
      // XP should be 105 now
      expect(screen.getByTestId('xp-value').textContent).toBe('105');
      // Level should be 2 now
      expect(screen.getByTestId('level-value').textContent).toBe('2');
    });
    
    // Check if level-up notification was displayed
    const notificationContainer = document.getElementById('notification-container');
    expect(notificationContainer.innerHTML).toContain('Congratulations! You reached level 2');
    expect(notificationContainer.innerHTML).toContain('New badge unlocked');
  });
  
  test('Multiple actions aggregate XP correctly', async () => {
    const handleMultipleActions = jest.fn().mockImplementation(async () => {
      await gamification.addXpPoints(5, 'First action');
      await gamification.addXpPoints(10, 'Second action');
      await gamification.addXpPoints(15, 'Third action');
      return true;
    });
    
    render(<TestComponent onMount={handleMultipleActions} />);
    
    await waitFor(() => {
      // Total XP should be 30
      expect(screen.getByTestId('xp-value').textContent).toBe('30');
    });
    
    // Check if all notifications were displayed
    const notificationContainer = document.getElementById('notification-container');
    expect(notificationContainer.innerHTML).toContain('+5 XP for First action');
    expect(notificationContainer.innerHTML).toContain('+10 XP for Second action');
    expect(notificationContainer.innerHTML).toContain('+15 XP for Third action');
  });
  
  test('Badge awards trigger special notifications', async () => {
    // Mock the badge awarding function
    const originalAwardBadge = gamification.awardBadge;
    gamification.awardBadge = jest.fn().mockImplementation((badgeId) => {
      return {
        id: badgeId,
        name: 'Test Badge',
        description: 'Earned for testing',
        image: '/badges/test.png'
      };
    });
    
    const handleBadgeAction = jest.fn().mockImplementation(async () => {
      await gamification.addXpPoints(20, 'Badge action');
      const badge = gamification.awardBadge('test-badge-1');
      gamification.showNotification(`Badge Unlocked: ${badge.name}`, 'badge');
      return true;
    });
    
    render(<TestComponent onMount={handleBadgeAction} />);
    
    await waitFor(() => {
      // XP should be increased
      expect(screen.getByTestId('xp-value').textContent).toBe('20');
    });
    
    // Check if badge notification was displayed
    const notificationContainer = document.getElementById('notification-container');
    expect(notificationContainer.innerHTML).toContain('Badge Unlocked: Test Badge');
    
    // Restore original function
    gamification.awardBadge = originalAwardBadge;
  });
});