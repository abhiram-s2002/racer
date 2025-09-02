import { useState, useEffect, useCallback } from 'react';
import { AppSettings, loadSettings, updateSetting, clearSettings } from '@/utils/appSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedSettings = await loadSettings();
      setSettings(loadedSettings);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      setSaving(true);
      await saveSettings(newSettings);
      setSettings(newSettings);
      return true;
    } catch (error) {
      // Silent error handling
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateSingleSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return false;
    
    try {
      setSaving(true);
      await updateSetting(key, value);
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      return true;
    } catch (error) {
      // Silent error handling
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(async () => {
    try {
      setSaving(true);
      await clearSettings();
      await loadSettingsData();
    } catch (error) {
      // Silent error handling
    } finally {
      setSaving(false);
    }
  }, [loadSettingsData]);

  const refreshSettings = useCallback(async () => {
    await loadSettingsData();
  }, [loadSettingsData]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    updateSetting: updateSingleSetting,
    resetSettings,
    refreshSettings,
  };
}; 