import { useState, useEffect, useCallback } from 'react';
import { AppSettings, loadSettings, saveSettings, updateSetting, clearSettings } from '@/utils/appSettings';

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
      console.error('Error loading settings:', error);
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
      console.error('Error saving settings:', error);
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
      console.error('Error updating setting:', error);
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
      console.error('Error resetting settings:', error);
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