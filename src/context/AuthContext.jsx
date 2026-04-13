import React, { createContext, useContext, useState } from 'react';
import { api, getStoredUserSession } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUserSession());
  const [loading] = useState(false);

  const login = async (username, password) => {
    const data = await api.login({ username, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Clear local session even if backend logout fails.
    }
    localStorage.removeItem('imms_token');
    localStorage.removeItem('imms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
