// Firebase Mock for Expo Go development
// This allows the app to run in Expo Go without Firebase native modules

const mockMessaging = {
  requestPermission: async () => ({
    authorizationStatus: 1, // AUTHORIZED
    android: { notification: { enabled: true } }
  }),
  
  getToken: async () => `mock_fcm_token_${Date.now()}`,
  
  onTokenRefresh: (callback: (token: string) => void) => {
    // Mock token refresh
    setTimeout(() => {
      callback(`mock_fcm_token_${Date.now()}`);
    }, 5000);
    return () => {
      // unsubscribe function - no-op for mock
    };
  },
  
  onMessage: (callback: (message: any) => void) => {
    // Mock foreground message handler
    return () => {
      // unsubscribe function - no-op for mock
    };
  },
  
  setBackgroundMessageHandler: (callback: (message: any) => void) => {
    // Mock background message handler - no-op for mock
  }
};

export const messaging = mockMessaging;
export default mockMessaging;
