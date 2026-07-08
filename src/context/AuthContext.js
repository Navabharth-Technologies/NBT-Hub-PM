import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';

export const AuthContext = (typeof window !== 'undefined' && window.__NBT_AUTH_CONTEXT__)
  ? window.__NBT_AUTH_CONTEXT__
  : createContext();

if (typeof window !== 'undefined' && !window.__NBT_AUTH_CONTEXT__) {
  window.__NBT_AUTH_CONTEXT__ = AuthContext;
}

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);

  const adjustLoggedUser = (u) => {
    if (!u) return u;
    const empId = String(u.employee_id || u.id || u.empId || '').trim();
    const email = String(u.email || '').toLowerCase().trim();
    if (empId === '202512' || email === 'rakesh@navabharathtechnologies.com') {
      return {
        ...u,
        name: 'Rakesh Gowda H N',
        user_name: 'Rakesh Gowda H N',
        employee_name: 'Rakesh Gowda H N',
        empName: 'Rakesh Gowda H N'
      };
    }
    if (empId === '202522' || email === 'hr@navabharathtechnologies.com') {
      return {
        ...u,
        name: 'HR Team',
        user_name: 'HR Team',
        employee_name: 'HR Team',
        empName: 'HR Team'
      };
    }
    return u;
  };

  const setUser = (val) => {
    setUserState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return adjustLoggedUser(next);
    });
  };

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

        const adjusted = adjustLoggedUser(authData);
        setUser(adjusted);
        try {
          localStorage.setItem('user', JSON.stringify(adjusted));
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
    // Hard reload kills all background polling intervals instantly
    window.location.replace(window.location.pathname + '#/login');
  };

  const updateUserData = (newData) => {
    setUser(prev => {
      const updated = adjustLoggedUser({ ...prev, ...newData });
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota exceeded. Changes will not persist after refresh.', e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
