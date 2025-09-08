"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, User, LoginRequest, RegisterRequest } from "@/lib/api"; // Importando RegisterRequest
import { setToken, clearToken, getToken } from "@/lib/auth"; // Assumindo lib/auth.ts

// --- CORREÇÃO 1: Adicionando as funções que faltavam na interface ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  googleLogin: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Falha ao buscar usuário, limpando token", error);
          clearToken();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // --- CORREÇÃO 2: Implementando as funções que faltavam ---
  const login = async (credentials: LoginRequest) => {
    const tokenData = await apiClient.login(credentials);
    setToken(tokenData.access_token);
    const userData = await apiClient.getCurrentUser();
    setUser(userData);
  };
  
  const googleLogin = async (code: string) => {
    const tokenData = await apiClient.googleLogin(code);
    setToken(tokenData.access_token);
    const userData = await apiClient.getCurrentUser();
    setUser(userData);
  };

  const register = async (userData: RegisterRequest) => {
    await apiClient.register(userData);
    // Após o cadastro, faz o login automaticamente para criar a sessão
    await login({ username: userData.email, password: userData.password });
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  // --- CORREÇÃO 3: Passando as novas funções para o Provider ---
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};