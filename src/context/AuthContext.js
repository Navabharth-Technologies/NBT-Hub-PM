import React, { createContext, useState, useContext, useEffect } from 'react';
import { BASE_URL, API_ENDPOINTS } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('navAuthUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
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
        localStorage.setItem('navAuthUser', JSON.stringify(authData));
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
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
    localStorage.removeItem('navAuthUser');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  };

  const updateUserData = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('navAuthUser', JSON.stringify(updated));
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
