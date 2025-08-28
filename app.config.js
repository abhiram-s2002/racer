module.exports = {
  expo: {
    name: "GeoMart",
    slug: "geomart",
    version: "1.0.0",
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
      versionCode: 1,
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
        "android.permission.RECORD_AUDIO"
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
      router: {},
      eas: {
        projectId: "8f44f78a-7dfa-43c5-9b3e-999d5256971a"
      }
    },
    owner: "silvieur",
    privacy: "public",
    description: "A local marketplace app for buying and selling items in your community. Connect with nearby sellers, browse listings, and make secure transactions.",
    primaryColor: "#22C55E",
    platforms: [
      "ios",
      "android"
    ]
  }
};
