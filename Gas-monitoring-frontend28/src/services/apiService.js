import axios from 'axios';
 
const API_BASE_URL = 'http://localhost:5000/api';
 
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});
 
// Add request interceptor to include JWT token in headers
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);
 
// Handle token expiration
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
 
export const getSiteData = async (siteName) => {
  try {
    const response = await api.get(`/sites/${siteName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching site data:', error);
    throw error;
  }
};
 
export const getDeviceDetails = async (siteName) => {
  try {
    const response = await api.get(`/devices/${siteName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device details:', error);
    throw error;
  }
};
 
export const getSiteLogs = async (siteName) => {
  try {
    const response = await api.get(`/logs/${siteName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching site logs:', error);
    throw error;
  }
};
 
export const getSiteAlerts = async (siteName) => {
  try {
    const response = await api.get(`/alerts/${siteName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching site alerts:', error);
    throw error;
  }
};
 
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Error registering user:', error.response?.data || error);
    throw error;
  }
};
 
export const loginUser = async (userData) => {
  try {
    const response = await api.post('/auth/login', userData);
    return response.data;
  } catch (error) {
    console.error('Error logging in:', error.response?.data || error);
    throw error;
  }
};

export default api;
