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
          router.push('/login'); // Se o token for inválido, vai para o login
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
      
      // Mostrar sucesso antes de redirecionar
      showAuthLoading("Login realizado com sucesso!");
      
      // Aguardar um pouco para mostrar a mensagem de sucesso
      setTimeout(() => {
        // Redirecionar para a página inicial
        router.push('/');
        
        // Manter loading até a página inicial estar carregada
        setTimeout(() => {
          hideLoading();
        }, 1500); // Tempo suficiente para a página inicial carregar
      }, 1000);
      
    } catch (error) {
      hideLoading();
      throw error; // Re-throw para que o componente de login possa tratar o erro
    }
  };
  
  const googleLogin = async (code: string) => {
    showAuthLoading("Conectando com Google...");
    try {
      const tokenData = await apiClient.googleLogin(code);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      // Mostrar sucesso antes de redirecionar
      showAuthLoading("Login realizado com sucesso!");
      
      setTimeout(() => {
        // Redirecionar para a página inicial
        router.push('/');
        
        // Manter loading até a página inicial estar carregada
        setTimeout(() => {
          hideLoading();
        }, 1500); // Tempo suficiente para a página inicial carregar
      }, 1000);
      
    } catch (error) {
      hideLoading();
      throw error; // Re-throw para que o componente possa tratar o erro
    }
  };

  const register = async (userData: RegisterRequest) => {
    showAuthLoading("Criando sua conta...");
    try {
      await apiClient.register(userData);
      
      // Mostrar progresso
      showAuthLoading("Conta criada! Fazendo login...");
      
      // Fazer login automaticamente após registro
      const tokenData = await apiClient.login({ 
        username: userData.email, 
        password: userData.password 
      });
      setToken(tokenData.access_token);
      const userDataResponse = await apiClient.getCurrentUser();
      setUser(userDataResponse);
      
      // Mostrar sucesso antes de redirecionar
      showAuthLoading("Bem-vindo ao Flashify!");
      
      setTimeout(() => {
        // Redirecionar para a página inicial
        router.push('/');
        
        // Manter loading até a página inicial estar carregada
        setTimeout(() => {
          hideLoading();
        }, 1500); // Tempo suficiente para a página inicial carregar
      }, 1200);
      
    } catch (error) {
      hideLoading();
      throw error; // Re-throw para que o componente possa tratar o erro
    }
  };

  const logout = () => {
    showAuthLoading("Fazendo logout...");
    
    // Limpar dados imediatamente para evitar estados inconsistentes
    clearToken();
    setUser(null);
    
    // Mostrar sucesso antes de redirecionar
    setTimeout(() => {
      showAuthLoading("Logout realizado com sucesso!");
      
      setTimeout(() => {
        hideLoading();
        router.push('/login'); // Redirecionar para login
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