import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/api'; // Ruta corregida hacia client/constants/api.ts

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.TIMEOUT,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const userStr = await AsyncStorage.getItem('@AstroBar_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error('Error getting token in interceptor:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = apiClient;