import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

export const AuthContext = (typeof window !== 'undefined' && window.__NBT_AUTH_CONTEXT__)
  ? window.__NBT_AUTH_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_AUTH_CONTEXT__) {
  window.__NBT_AUTH_CONTEXT__ = AuthContext;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on app load
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== '[object Object]') {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Failed to restore user session:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Securely package user data with JWT and employee_id as per manifest
        const authData = {
          ...data.user,
          token: data.token,
          id: data.user.id,
          employee_id: data.user.employee_id
        };

        setUser(authData);
        try {
          localStorage.setItem('user', JSON.stringify(authData));
          localStorage.setItem('token', data.token);
          localStorage.setItem('userRole', data.user.role);
        } catch (e) {
          console.warn('LocalStorage quota exceeded during login.', e);
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Authentication Failed' };
      }

    } catch (error) {
      console.error('Login Error:', error);
      return { success: false, error: 'Server Connection Failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration Failed' };
      }
    } catch (error) {
      console.error('Registration Error:', error);
      return { success: false, error: 'Server Connection Failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  };

  const updateUserData = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota exceeded. Changes will not persist after refresh.', e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => useContext(AuthContext);
