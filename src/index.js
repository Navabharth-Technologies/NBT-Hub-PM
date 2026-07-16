// Intercept localStorage to redirect Auth-related keys to sessionStorage
// This ensures that multiple tabs/windows can run different user/role sessions without overwriting each other.
(function() {
  if (typeof window === 'undefined') return;

  const authKeys = new Set(['token', 'user', 'navAuthUser', 'userRole']);
  const originalGetItem = localStorage.getItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function(key) {
    if (authKeys.has(key)) {
      return sessionStorage.getItem(key);
    }
    return originalGetItem(key);
  };

  localStorage.setItem = function(key, value) {
    if (authKeys.has(key)) {
      return sessionStorage.setItem(key, value);
    }
    return originalSetItem(key, value);
  };

  localStorage.removeItem = function(key) {
    if (authKeys.has(key)) {
      return sessionStorage.removeItem(key);
    }
    return originalRemoveItem(key);
  };

  const originalClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function() {
    authKeys.forEach(key => sessionStorage.removeItem(key));
    originalClear();
  };
})();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';

// Helper: show a beautiful centered modal (pure DOM, works outside React tree)
function showSessionExpiredModal(message, onConfirm, title = "Session Expired", icon = "⚠") {
  const existing = document.getElementById('__session_modal__');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = '__session_modal__';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: __smFadeIn__ 0.2s ease;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes __smFadeIn__ { from { opacity:0; } to { opacity:1; } }
      @keyframes __smPop__    { from { opacity:0; transform:scale(0.85) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
      #__session_modal__ .__sm_card__ {
        background: linear-gradient(135deg, #fff8f0 0%, #fff1e6 100%);
        border: 2px solid #fed7aa;
        border-radius: 28px;
        padding: 36px 40px 28px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 24px 64px rgba(234,88,12,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
        animation: __smPop__ 0.3s cubic-bezier(0.16,1,0.3,1);
        font-family: 'Inter', 'Outfit', system-ui, sans-serif;
      }
      #__session_modal__ .__sm_icon__ {
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #f97316, #ea580c);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 24px rgba(249,115,22,0.4);
        font-size: 26px; color: white;
      }
      #__session_modal__ .__sm_title__ {
        font-size: 17px; font-weight: 900; color: #9a3412; margin: 0;
      }
      #__session_modal__ .__sm_msg__ {
        font-size: 14px; font-weight: 600; color: #7c2d12;
        margin: 0; line-height: 1.6;
      }
      #__session_modal__ .__sm_btn__ {
        margin-top: 4px;
        padding: 12px 40px;
        border-radius: 50px; border: none;
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: white; font-size: 14px; font-weight: 900;
        cursor: pointer; letter-spacing: 0.5px;
        box-shadow: 0 6px 20px rgba(249,115,22,0.4);
        transition: transform 0.15s, box-shadow 0.15s;
        font-family: inherit;
      }
      #__session_modal__ .__sm_btn__:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(249,115,22,0.5);
      }
    </style>
    <div class="__sm_card__">
      <div class="__sm_icon__">${icon}</div>
      <p class="__sm_title__">${title}</p>
      <p class="__sm_msg__">${message}</p>
      <button class="__sm_btn__" id="__session_ok_btn__">OK, Got it</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('__session_ok_btn__').addEventListener('click', () => {
    overlay.style.animation = 'none';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s';
    setTimeout(() => { overlay.remove(); if (onConfirm) onConfirm(); }, 200);
  });
}

// Global Security Interceptor (Fetch version of Axios Interceptor)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      // Avoid infinite loop if already on login page
      if (window.location.hash === '#/login' || window.location.pathname === '/login') return response;

      try {
        const data = await response.clone().json();
        if (data.globalLogout) {
          // Clear storage first, then show modal
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userRole');
          showSessionExpiredModal(
            "Your session has expired because your password was changed on another device.",
            () => { window.location.hash = '/login'; }
          );
          return response;
        }
      } catch (e) { /* Ignore non-JSON errors */ }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.hash = '/login';
    }
    return response;
  } catch (error) {
    if (error.name === 'TypeError' || error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      window.dispatchEvent(new Event('offline'));
      showSessionExpiredModal(
        "Please check your internet connection and try again.",
        null,
        "Network Error",
        "🔌"
      );
    }
    return Promise.reject(error);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
