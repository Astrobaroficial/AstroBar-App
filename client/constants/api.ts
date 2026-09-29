// API Configuration for AstroBar Frontend
import { Platform } from "react-native";
import Constants from "expo-constants";

// DEVELOPMENT: Set to true to disable GPS tracking and use fixed location from DB
const DISABLE_GPS_IN_DEV = true;

// Get API base URL dynamically at runtime
export const getApiBaseUrl = (): string => {
  // PRODUCTION: Check expo config first (from app.config.js)
  const expoBackendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL;
  if (expoBackendUrl && !__DEV__) {
    return expoBackendUrl;
  }

  // Check for environment variable (development)
  const envBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envBackendUrl) {
    const trimmed = envBackendUrl.trim();
    return trimmed;
  }

  if (__DEV__) {
    return "https://astrobar-app-production-4821.up.railway.app";
  }

  // For web in production, use current origin (same domain)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }

  // Production fallback
  return "https://astrobar-app-production-4821.up.railway.app";
};

export const API_CONFIG = {
  get BASE_URL() {
    return getApiBaseUrl();
  },
  ENDPOINTS: {
    AUTH: {
      VERIFY_PHONE: "/api/auth/verify-phone",
      SEND_CODE: "/api/auth/send-code",
      LOGIN: "/api/auth/login",
      LOGOUT: "/api/auth/logout",
      PHONE_SIGNUP: "/api/auth/phone-signup",
    },
    BUSINESSES: {
      LIST: "/api/businesses",
      DETAIL: (id: string) => `/api/businesses/${id}`,
      PRODUCTS: (id: string) => `/api/businesses/${id}/products`,
    },
    ORDERS: {
      CREATE: "/api/orders",
      LIST: "/api/orders",
      DETAIL: (id: string) => `/api/orders/${id}`,
      UPDATE_STATUS: (id: string) => `/api/orders/${id}/status`,
    },
    USERS: {
      PROFILE: "/api/user/profile",
      UPDATE: "/api/user/profile",
    },
  },
  TIMEOUT: 10000,
};

export const GPS_CONFIG = {
  DISABLE_IN_DEV: DISABLE_GPS_IN_DEV,
};

export const buildApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getDefaultHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};