import axios from 'axios';

// In local dev, VITE_API_URL is unset, so this falls back to '/api/v1',
// which vite.config.js proxies to http://127.0.0.1:8000.
// In production (Vercel), set VITE_API_URL to your Render backend URL,
// e.g. https://cinemind-backend.onrender.com/api/v1
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinemind_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
