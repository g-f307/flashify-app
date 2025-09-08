'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, User, LoginRequest } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>; // Adicionamos a função aqui
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = user !== null;

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        // Se temos um token, tentamos buscar os dados do usuário
        apiClient.setToken(token);
        const userData = await apiClient.getMe();
        setUser(userData);
      } catch (error) {
        // Se o token for inválido, limpa tudo
        apiClient.clearToken();
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (data: LoginRequest) => {
    await apiClient.login(data);
    await checkAuth(); // Após o login, busca os dados do usuário
    router.push('/'); // Redireciona para o dashboard
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    router.push('/'); // Redireciona para a home
  };
  
  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth, // Disponibiliza a função no contexto
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}