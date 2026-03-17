'use client';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Locale } from '@/i18n/config';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: Locale;
  sidebarCollapsed: boolean;
  reducedMotion: boolean;
}

const defaultSettings: Settings = {
  theme: 'system',
  language: 'zh',
  sidebarCollapsed: false,
  reducedMotion: false,
};

type SettingsContextType = {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  resetSettings: () => void;
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const updateSettings = useCallback((partial: Partial<Settings>) => setSettings(prev => ({ ...prev, ...partial })), []);
  const resetSettings = useCallback(() => setSettings(defaultSettings), []);
  const value = useMemo(() => ({ settings, updateSettings, resetSettings }), [settings, updateSettings, resetSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
export const useTheme = useSettings;
