import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('rs_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(() => localStorage.getItem('rs_token') || null);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('rs_user', JSON.stringify(data.user));
    localStorage.setItem('rs_token', data.token);
    return data;
  }, []);

  const loginDirect = useCallback((userData, tokenStr) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('rs_user', JSON.stringify(userData));
    localStorage.setItem('rs_token', tokenStr);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('rs_user');
    localStorage.removeItem('rs_token');
  }, []);

  const register = useCallback(async (data) => {
    const result = await authApi.register(data);
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem('rs_user', JSON.stringify(result.user));
    localStorage.setItem('rs_token', result.token);
    return result;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, loginDirect, logout, register, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
