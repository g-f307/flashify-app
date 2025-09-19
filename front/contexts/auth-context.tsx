"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, User, LoginRequest, RegisterRequest } from "@/lib/api";
import { setToken, clearToken, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation"; // Importa o useRouter
import { useLoading } from "@/components/providers/loading-provider";

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
  const router = useRouter(); // Inicializa o router
  const { setAuthLoading } = useLoading();

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
          router.push('/login'); // Se o token for inválido, vai para o login
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [router]);

  const login = async (credentials: LoginRequest) => {
    setAuthLoading(true, "Fazendo login...");
    try {
      const tokenData = await apiClient.login(credentials);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      // Simula um pequeno delay para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthLoading(false);
      router.push('/'); // <-- **REDIRECIONAMENTO APÓS LOGIN**
    } catch (error) {
      setAuthLoading(false);
      throw error; // Re-throw para que o componente de login possa tratar o erro
    }
  };
  
  const googleLogin = async (code: string) => {
    setAuthLoading(true, "Conectando com Google...");
    try {
      const tokenData = await apiClient.googleLogin(code);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      // Simula um pequeno delay para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAuthLoading(false);
      router.push('/'); // <-- **REDIRECIONAMENTO APÓS GOOGLE LOGIN**
    } catch (error) {
      setAuthLoading(false);
      throw error; // Re-throw para que o componente possa tratar o erro
    }
  };

  const register = async (userData: RegisterRequest) => {
    setAuthLoading(true, "Criando sua conta...");
    try {
      await apiClient.register(userData);
      // Após o registo, faz o login para criar a sessão e redirecionar
      await login({ username: userData.email, password: userData.password });
    } catch (error) {
      setAuthLoading(false);
      throw error; // Re-throw para que o componente possa tratar o erro
    }
  };

  const logout = () => {
    setAuthLoading(true, "Fazendo logout...");
    
    // Simula um pequeno delay para mostrar o loading
    setTimeout(() => {
      clearToken();
      setUser(null);
      setAuthLoading(false);
      router.push('/login'); // <-- **REDIRECIONAMENTO APÓS LOGOUT**
    }, 800);
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