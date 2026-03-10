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
<<<<<<< HEAD
          "image": "./assets/astrobarlogo.jpg",
          "resizeMode": "contain",
          "backgroundColor": "#8B5CF6"
=======
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#8B5CF6"
>>>>>>> 6c26480b12c9609c7a9194c9c0fe1c6bdfefbff1
        }
      ],
      "expo-web-browser",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      [
<<<<<<< HEAD
        "@stripe/stripe-react-native",
=======
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Necesitamos tu ubicación para mostrarte bares cercanos y calcular rutas."
        }
      ],
      [
        "react-native-maps",
>>>>>>> 6c26480b12c9609c7a9194c9c0fe1c6bdfefbff1
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
      ],

    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      eas: {
        projectId: "8c58541f-bf02-4e36-bcf9-a2e64b126a5b"
      },
<<<<<<< HEAD
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || "https://astrobar-backend.onrender.com"
=======
      EXPO_PUBLIC_BACKEND_URL: "https://astrobar-backend.onrender.com"
>>>>>>> 6c26480b12c9609c7a9194c9c0fe1c6bdfefbff1
    },
    owner: "caskiuzs-organization"
  }
};
