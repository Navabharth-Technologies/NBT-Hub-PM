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
        // Normalize points fields
        const totalPoints = Number(data.user.totalPoints ?? data.user.total_points ?? data.user.totalRep ?? 0);
        const rewardPoints = Number(data.user.rewardPoints ?? data.user.reward_points ?? 0);
        const quizPoints = Number(data.user.quizPoints ?? data.user.quiz_points ?? 0);

        // Securely package user data with JWT and employee_id as per manifest
        const authData = {
          ...data.user,
          token: data.token,
          id: data.user.id,
          employee_id: data.user.employee_id,
          totalPoints,
          rewardPoints,
          quizPoints,
          total_points: totalPoints,
          reward_points: rewardPoints,
          quiz_points: quizPoints,
          totalRep: totalPoints
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
      const merged = { ...prev, ...newData };

      // Normalize points fields
      const totalPoints = Number(merged.totalPoints ?? merged.total_points ?? merged.totalRep ?? 0);
      const rewardPoints = Number(merged.rewardPoints ?? merged.reward_points ?? 0);
      const quizPoints = Number(merged.quizPoints ?? merged.quiz_points ?? 0);

      const updated = {
        ...merged,
        totalPoints,
        rewardPoints,
        quizPoints,
        total_points: totalPoints,
        reward_points: rewardPoints,
        quiz_points: quizPoints,
        totalRep: totalPoints
      };

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
