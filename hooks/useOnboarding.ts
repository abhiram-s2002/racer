import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  isFirstTime: boolean;
  onboardingCompleted: boolean;
  loading: boolean;
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isFirstTime: true,
    onboardingCompleted: false,
    loading: true,
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      const isFirstTime = onboardingCompleted === null;
      
      setState({
        isFirstTime,
        onboardingCompleted: onboardingCompleted === 'true',
        loading: false,
      });
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setState({
        isFirstTime: true,
        onboardingCompleted: false,
        loading: false,
      });
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setState(prev => ({
        ...prev,
        isFirstTime: false,
        onboardingCompleted: true,
      }));
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      setState({
        isFirstTime: true,
        onboardingCompleted: false,
        loading: false,
      });
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return {
    ...state,
    completeOnboarding,
    resetOnboarding,
  };
}
