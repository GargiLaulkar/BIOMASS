import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('bioplan_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Keep token in api sync
    const token = localStorage.getItem('bioplan_token');
    if (token) {
      api.setToken(token);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api.login(email, password);
      const userData = {
        email,
        role: data.role,
        token: data.access_token
      };
      setUser(userData);
      localStorage.setItem('bioplan_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setAuthError(null);
    try {
      await api.register(name, email, password, role);
      // Automatically login after successful registration
      return await login(email, password);
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    localStorage.removeItem('bioplan_user');
    localStorage.removeItem('bioplan_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || null,
        loading,
        authError,
        login,
        register,
        logout,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
