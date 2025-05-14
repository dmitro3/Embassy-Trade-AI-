import { renderHook, act } from '@testing-library/react';
import { useOfflineMode } from '../../hooks/useOfflineMode';

// Mock window.navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('granted')
};

describe('useOfflineMode', () => {
  // Setup and teardown
  beforeEach(() => {
    jest.useFakeTimers();
    window.navigator.onLine = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Clear any intervals
    jest.runOnlyPendingTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should initialize with online status', () => {
    const { result } = renderHook(() => useOfflineMode());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.offlineModeEnabled).toBe(false);
    expect(result.current.offlineDuration).toBe(0);
    expect(result.current.pendingOperations).toEqual([]);
  });
  
  test('should detect when going offline', () => {
    const mockOfflineStart = jest.fn();
    const mockConnectivityChange = jest.fn();
    
    const { result } = renderHook(() => useOfflineMode({
      onOfflineStart: mockOfflineStart,
      onConnectivityChange: mockConnectivityChange
    }));
    
    // Trigger offline event
    act(() => {
      window.navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    // Verify state changes
    expect(result.current.isOnline).toBe(false);
    expect(result.current.offlineModeEnabled).toBe(true);
    expect(mockOfflineStart).toHaveBeenCalledTimes(1);
    expect(mockConnectivityChange).toHaveBeenCalledWith(false);
  });
  
  test('should detect when going back online', () => {
    const mockOfflineStart = jest.fn();
    const mockOfflineEnd = jest.fn();
    const mockConnectivityChange = jest.fn();
    
    const { result } = renderHook(() => useOfflineMode({
      onOfflineStart: mockOfflineStart,
      onOfflineEnd: mockOfflineEnd,
      onConnectivityChange: mockConnectivityChange
    }));
    
    // Go offline first
    act(() => {
      window.navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    // Advance time
    act(() => {
      jest.advanceTimersByTime(5000); // 5 seconds
    });
    
    // Then go back online
    act(() => {
      window.navigator.onLine = true;
      window.dispatchEvent(new Event('online'));
    });
    
    // Verify state changes
    expect(result.current.isOnline).toBe(true);
    expect(result.current.offlineModeEnabled).toBe(false);
    expect(mockOfflineStart).toHaveBeenCalledTimes(1);
    expect(mockOfflineEnd).toHaveBeenCalledTimes(1);
    expect(mockOfflineEnd).toHaveBeenCalledWith(5); // 5 seconds
    expect(mockConnectivityChange).toHaveBeenCalledTimes(2);
    expect(mockConnectivityChange).toHaveBeenNthCalledWith(2, true);
  });
  
  test('should track offline duration', () => {
    const { result } = renderHook(() => useOfflineMode());
    
    // Go offline
    act(() => {
      window.navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    // Check initial duration
    expect(result.current.offlineDuration).toBe(0);
    
    // Advance time and check duration updates
    act(() => {
      jest.advanceTimersByTime(1000); // 1 second
    });
    expect(result.current.offlineDuration).toBe(1);
    
    act(() => {
      jest.advanceTimersByTime(9000); // 10 seconds total
    });
    expect(result.current.offlineDuration).toBe(10);
  });
  
  test('should add and manage pending operations', () => {
    const { result } = renderHook(() => useOfflineMode());
    
    // Add pending operation
    act(() => {
      result.current.addPendingOperation({
        type: 'trade',
        data: { tokenAddress: '0x123', amount: '100' }
      });
    });
    
    // Verify operation was added
    expect(result.current.pendingOperations.length).toBe(1);
    expect(result.current.pendingOperations[0].type).toBe('trade');
    expect(result.current.pendingOperations[0].data.tokenAddress).toBe('0x123');
    
    // Add another operation
    act(() => {
      result.current.addPendingOperation({
        type: 'wallet-update',
        data: { balance: '200' }
      });
    });
    
    // Verify both operations are present
    expect(result.current.pendingOperations.length).toBe(2);
    expect(result.current.pendingOperationCount).toBe(2);
  });
  
  test('should not sync operations when offline', async () => {
    const { result } = renderHook(() => useOfflineMode());
    
    // Go offline
    act(() => {
      window.navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));
    });
    
    // Add pending operation
    act(() => {
      result.current.addPendingOperation({
        type: 'trade',
        data: { tokenAddress: '0x123', amount: '100' }
      });
    });
    
    // Attempt sync
    let syncResult;
    await act(async () => {
      syncResult = await result.current.syncPendingOperations();
    });
    
    // Verify sync failed due to being offline
    expect(syncResult.success).toBe(false);
    expect(syncResult.reason).toBe('offline');
    expect(result.current.pendingOperations.length).toBe(1);
  });
});
