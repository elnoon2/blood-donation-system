import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  bloodType?: string;
  governorate?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: String | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Fetch full profile to ensure all fields are loaded and up to date
      api.get("/auth/me", { headers: { Authorization: `Bearer ${savedToken}` }})
        .then((response) => {
           setUser(response.data);
           localStorage.setItem('user', JSON.stringify(response.data));
        })
        .catch((err) => console.error("Failed to refresh user profile data", err));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
