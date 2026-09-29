import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 💡 Dejamos la URL base limpia sin agregarle /api forzado
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const userStr = await AsyncStorage.getItem('@AstroBar_user');
      console.log('Token check:', userStr ? 'Found' : 'Not found');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
          console.log('Token added to request');
        } else {
          console.log('No token in user object');
        }
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = apiClient;