export default {
  expo: {
    name: "AstroBar",
    slug: "astrobar-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/astrobarlogo.jpg",
    scheme: "astrobar",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.astrobar.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Necesitamos tu ubicación para mostrarte bares cercanos y promociones disponibles."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#8B5CF6",
        foregroundImage: "./assets/astrobarlogo.jpg"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.astrobar.app",
      config: {
        googleMaps: {
          apiKey: "AIzaSyDLejpcrNJNHzQIduWuot5QAoepitVk2zY"
        }
      }
    },
    web: {
      output: "single",
      favicon: "./assets/astrobarlogo.jpg"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          "image": "./assets/astrobarlogo.jpg",
          "resizeMode": "contain",
          "backgroundColor": "#8B5CF6"
        }
      ],
      "expo-web-browser",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.astrobar.app",
          enableGooglePay: true
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Necesitamos tu ubicación para mostrarte bares cercanos y calcular rutas."
        }
      ]
    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      eas: {
        projectId: "8c58541f-bf02-4e36-bcf9-a2e64b126a5b"
      },
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || "https://astrobar-backend.onrender.com"
    },
    owner: "caskiuzs-organization"
  }
};
