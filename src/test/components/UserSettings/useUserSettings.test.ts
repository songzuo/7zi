import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserSettings } from '@/components/UserSettings/hooks/useUserSettings';

// Mock useLocalStorage hook
const mockLocalStorageValues: Record<string, unknown> = {};
const mockSetLocalStorage = vi.fn();

vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: (key: string, initialValue: unknown) => {
    const value = mockLocalStorageValues[key] ?? initialValue;
    return [value, (newValue: unknown) => {
      mockLocalStorageValues[key] = typeof newValue === 'function' ? newValue(value) : newValue;
      mockSetLocalStorage(key, newValue);
    }];
  },
}));

describe('useUserSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock storage
    Object.keys(mockLocalStorageValues).forEach(key => {
      delete mockLocalStorageValues[key];
    });
  });

  it('returns default profile when no stored value', () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.profile).toEqual({
      nickname: '',
      avatar: '',
      bio: '',
      email: '',
    });
  });

  it('returns default security settings', () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.security).toEqual({
      twoFactorEnabled: false,
      lastPasswordChange: null,
    });
  });

  it('returns default notification preferences', () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.notifications).toEqual({
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      weeklyDigest: true,
      mentionNotifications: true,
    });
  });

  it('returns default privacy settings', () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.privacy).toEqual({
      profileVisibility: 'public',
      showEmail: false,
      showActivity: true,
      allowMessages: true,
      dataCollection: true,
    });
  });

  it('returns idle save status initially', () => {
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.saveStatus).toBe('idle');
  });

  it('updates profile via setProfile', () => {
    const { result } = renderHook(() => useUserSettings());
    
    act(() => {
      result.current.setProfile({
        nickname: 'Test User',
        avatar: '/avatar.png',
        bio: 'Test bio',
        email: 'test@example.com',
      });
    });
    
    expect(result.current.profile.nickname).toBe('Test User');
    expect(result.current.profile.email).toBe('test@example.com');
  });

  it('updates security settings via setSecurity', () => {
    const { result } = renderHook(() => useUserSettings());
    
    act(() => {
      result.current.setSecurity({
        twoFactorEnabled: true,
        lastPasswordChange: '2024-01-01',
      });
    });
    
    expect(result.current.security.twoFactorEnabled).toBe(true);
    expect(result.current.security.lastPasswordChange).toBe('2024-01-01');
  });

  it('toggles notification preference via handleNotificationChange', () => {
    const { result } = renderHook(() => useUserSettings());
    
    // Default is true
    expect(result.current.notifications.emailNotifications).toBe(true);
    
    act(() => {
      result.current.handleNotificationChange('emailNotifications');
    });
    
    // Should be toggled to false
    expect(result.current.notifications.emailNotifications).toBe(false);
  });

  it('toggles marketingEmails notification', () => {
    const { result } = renderHook(() => useUserSettings());
    
    // Default is false
    expect(result.current.notifications.marketingEmails).toBe(false);
    
    act(() => {
      result.current.handleNotificationChange('marketingEmails');
    });
    
    // Should be toggled to true
    expect(result.current.notifications.marketingEmails).toBe(true);
  });

  it('updates privacy settings via setPrivacy', () => {
    const { result } = renderHook(() => useUserSettings());
    
    act(() => {
      result.current.setPrivacy({
        profileVisibility: 'private',
        showEmail: true,
        showActivity: false,
        allowMessages: false,
        dataCollection: false,
      });
    });
    
    expect(result.current.privacy.profileVisibility).toBe('private');
    expect(result.current.privacy.showEmail).toBe(true);
    expect(result.current.privacy.showActivity).toBe(false);
  });

  it('updates save status via setSaveStatus', () => {
    const { result } = renderHook(() => useUserSettings());
    
    act(() => {
      result.current.setSaveStatus('saving');
    });
    
    expect(result.current.saveStatus).toBe('saving');
    
    act(() => {
      result.current.setSaveStatus('saved');
    });
    
    expect(result.current.saveStatus).toBe('saved');
  });

  it('provides storedProfile from localStorage', () => {
    // Set up stored profile
    mockLocalStorageValues['user-profile'] = {
      nickname: 'Stored User',
      avatar: '/stored-avatar.png',
      bio: 'Stored bio',
      email: 'stored@example.com',
    };
    
    const { result } = renderHook(() => useUserSettings());
    
    expect(result.current.storedProfile.nickname).toBe('Stored User');
  });

  it('provides setStoredProfile to update localStorage directly', () => {
    const { result } = renderHook(() => useUserSettings());
    
    act(() => {
      result.current.setStoredProfile({
        nickname: 'Direct Update',
        avatar: '',
        bio: '',
        email: 'direct@example.com',
      });
    });
    
    expect(mockSetLocalStorage).toHaveBeenCalled();
  });

  it('handles all notification preferences', () => {
    const { result } = renderHook(() => useUserSettings());
    
    const notificationKeys = [
      'emailNotifications',
      'pushNotifications',
      'marketingEmails',
      'weeklyDigest',
      'mentionNotifications',
    ] as const;
    
    notificationKeys.forEach(key => {
      const initialValue = result.current.notifications[key];
      
      act(() => {
        result.current.handleNotificationChange(key);
      });
      
      expect(result.current.notifications[key]).toBe(!initialValue);
    });
  });
});