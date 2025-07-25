import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  // App Preferences
  autoRefresh: boolean;
  locationServices: boolean;
  
  // Data & Storage
  autoSaveImages: boolean;
  cacheImages: boolean;
  dataUsage: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: AppSettings = {
  // App Preferences
  autoRefresh: true,
  locationServices: true,
  
  // Data & Storage
  autoSaveImages: true,
  cacheImages: true,
  dataUsage: 'medium',
};

const SETTINGS_STORAGE_KEY = 'appSettings';

// Load settings from AsyncStorage
export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      return { ...DEFAULT_SETTINGS, ...parsedSettings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to AsyncStorage
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

// Update a specific setting
export const updateSetting = async <K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> => {
  try {
    const currentSettings = await loadSettings();
    const newSettings = { ...currentSettings, [key]: value };
    await saveSettings(newSettings);
  } catch (error) {
    console.error('Error updating setting:', error);
  }
};

// Clear all settings (reset to defaults)
export const clearSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing settings:', error);
  }
};

// Get a specific setting value
export const getSetting = async <K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K]> => {
  const settings = await loadSettings();
  return settings[key];
};

// Check if a setting is enabled
export const isSettingEnabled = async (key: keyof AppSettings): Promise<boolean> => {
  const value = await getSetting(key);
  return Boolean(value);
};

// Export default settings for use in components
export { DEFAULT_SETTINGS }; 