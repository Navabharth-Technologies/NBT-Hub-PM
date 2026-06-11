import axios from 'axios';
import axiosRetry from 'axios-retry';
import { BASE_URL } from './config';

const apiClient = axios.create({
  baseURL: BASE_URL,
});

// Automatically retry failed requests up to 3 times silently
axiosRetry(apiClient, { 
  retries: 3, 
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Wait 1s, then 2s, then 3s between retries
  },
  retryCondition: (error) => {
    // Retry if the server crashes (5xx errors) or network disconnects
    return error.response?.status >= 500 || !error.response;
  }
});

export default apiClient;
