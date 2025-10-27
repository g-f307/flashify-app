"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, User, LoginRequest, RegisterRequest } from "@/lib/api";
import { setToken, clearToken, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation"; 
import { useLoading } from "@/components/providers/loading-provider";

export interface AuthContextType {
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
  const router = useRouter(); 
  const { showAuthLoading, hideLoading } = useLoading();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error("Falha ao buscar utilizador, a limpar token", error);
          clearToken();
          router.push('/login'); 
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [router]);

  const login = async (credentials: LoginRequest) => {
    showAuthLoading("Fazendo login...");
    try {
      const tokenData = await apiClient.login(credentials);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      showAuthLoading("Login realizado com sucesso!");
      
      setTimeout(() => {
        router.push('/');
        
        setTimeout(() => {
          hideLoading();
        }, 1500); 
      }, 1000);
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };
  
  const googleLogin = async (code: string) => {
    showAuthLoading("Conectando com Google...");
    try {
      const tokenData = await apiClient.googleLogin(code);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      showAuthLoading("Login realizado com sucesso!");
      
      setTimeout(() => {
        router.push('/');
        
        setTimeout(() => {
          hideLoading();
        }, 1500); 
      }, 1000);
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };

  const register = async (userData: RegisterRequest) => {
    showAuthLoading("Criando sua conta...");
    try {
      await apiClient.register(userData);
      
      showAuthLoading("Conta criada! Fazendo login...");
      
      const tokenData = await apiClient.login({ 
        username: userData.email, 
        password: userData.password 
      });
      setToken(tokenData.access_token);
      const userDataResponse = await apiClient.getCurrentUser();
      setUser(userDataResponse);
      
      showAuthLoading("Bem-vindo ao Flashify!");
      
      setTimeout(() => {
        router.push('/');
        
        setTimeout(() => {
          hideLoading();
        }, 1500); 
      }, 1200);
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };

  const logout = () => {
    showAuthLoading("Fazendo logout...");
    
    clearToken();
    setUser(null);
    
    setTimeout(() => {
      showAuthLoading("Logout realizado com sucesso!");
      
      setTimeout(() => {
        hideLoading();
        router.push('/login'); 
      }, 800);
    }, 500);
  };

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