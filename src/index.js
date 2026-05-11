import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Security Interceptor (Fetch version of Axios Interceptor)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      // Avoid infinite loop if already on login page
      if (window.location.pathname === '/login') return response;

      try {
        const data = await response.clone().json();
        if (data.globalLogout) {
          alert("Your session has expired because your password was changed on another device.");
        }
      } catch (e) { /* Ignore non-JSON errors */ }

      localStorage.removeItem('token');
      localStorage.removeItem('navAuthUser');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
