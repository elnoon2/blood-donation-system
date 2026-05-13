import axios from 'axios';

export const API_BASE_URL = typeof window !== "undefined" ? `${window.location.origin}/api` : "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Force absolute URLs for any relative paths to bypass Axios URL-resolution bugs in browser
api.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http')) {
    const rawUrl = config.url.startsWith('/') ? config.url : `/${config.url}`;
    config.url = `${API_BASE_URL}${rawUrl}`;
    config.baseURL = undefined; // prevent axios from appending it twice
  }
  return config;
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasToken = !!localStorage.getItem('token');
    const url = error.config?.url || '';
    const isPublicEndpoint = url.includes('/api/hospitals') || url.includes('/api/auth') || url.includes('/api/requests');

    // Avoid forced redirect loops; just clear stale session on real unauthorized protected calls.
    if (hasToken && (status === 401 || status === 403) && !isPublicEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
