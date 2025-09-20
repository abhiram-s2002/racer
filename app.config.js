module.exports = {
  expo: {
    name: "GeoMart",
    slug: "geomart",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "geomart",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.geomart.app",
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to take photos for marketplace listings.",
        NSLocationWhenInUseUsageDescription: "This app uses location to show nearby listings and help you find items in your area.",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to select images for marketplace listings.",
        NSMicrophoneUsageDescription: "This app may use the microphone for voice messages in chat.",
        NSFaceIDUsageDescription: "This app uses Face ID for secure authentication.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.geomart.app",
      versionCode: 2,
      config: {
        googleMaps: {
          apiKey: "AIzaSyBXZ3iGVmhKZZx0VmGjoLKTrArmFMwZ2qY"
        }
      },
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#22C55E"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.VIBRATE",
        "android.permission.RECORD_AUDIO",
        "com.android.vending.BILLING"
      ]
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "expo-location",
      "expo-image-picker",
      "expo-dev-client",
      [
        "@sentry/react-native/expo",
        {
          // Configure native Sentry integration for EAS builds
          organization: "silver",
          project: "geomart",
          url: "https://sentry.io/",
          deploy: true
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location."
        }
      ],

    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      environment: "development",
      EXPO_PUBLIC_ENV: "development",
      // Sentry DSN can be overridden via env at build/runtime
      EXPO_PUBLIC_SENTRY_DSN: "https://12bda6c71fb7e7c03519c5543ba94e47@o4509779115507712.ingest.us.sentry.io/4509779117080576",
      EXPO_PUBLIC_ENABLE_ERROR_REPORTING: "true",
      // Google Analytics ID
      EXPO_PUBLIC_GOOGLE_ANALYTICS_ID: "G-1RN9LQFY3G",
      router: {},
      eas: {
        projectId: "8f44f78a-7dfa-43c5-9b3e-999d5256971a"
      }
    },
    owner: "silvieur",
    privacy: "public",
    description: "A local marketplace app for buying and selling items in your community. Connect with nearby sellers, browse listings, and make secure transactions.",
    privacyPolicy: "https://abhiram-s2002.github.io/geomart-privacy/privacy-policy.html",
    primaryColor: "#22C55E",
    platforms: [
      "ios",
      "android"
    ]
  }
};
