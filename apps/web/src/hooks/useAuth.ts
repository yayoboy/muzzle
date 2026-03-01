import { useState, useEffect } from 'react';
import { getStoredToken, initAuth, setToken, clearToken } from '@/lib/auth';
import { api } from '@/lib/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.setToken(token);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);
  const login = async (pw: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(pw);
      setToken(res.token, res.expiresAt);
      setIsAuthenticated(true);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };
  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
  };
  return { isAuthenticated, isLoading, login, logout };
}