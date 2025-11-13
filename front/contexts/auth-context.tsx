// front/contexts/auth-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, User, LoginRequest, RegisterRequest } from "@/lib/api";
import { setToken, clearToken, getToken } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation"; 
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
  const [isLoggingOut, setIsLoggingOut] = useState(false); // ✅ Novo estado
  const router = useRouter();
  const pathname = usePathname();
  const { showAuthLoading, hideLoading } = useLoading();

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await apiClient.getCurrentUser();
        setUser(userData);
        
        // ✅ Redireciona ANTES de renderizar a landing page
        if (pathname === '/') {
          router.replace('/dashboard'); // ✅ Usa replace ao invés de push
        }
      } catch (error) {
        console.error("Token inválido ou expirado, limpando autenticação", error);
        
        clearToken();
        setUser(null);
        
        const publicRoutes = ['/', '/login', '/register'];
        if (!publicRoutes.includes(pathname)) {
          showAuthLoading("Sessão expirada. Redirecionando...");
          
          setTimeout(() => {
            router.push('/');
            setTimeout(() => {
              hideLoading();
            }, 500);
          }, 1500);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [pathname]); // ✅ Adiciona pathname como dependência

  const login = async (credentials: LoginRequest) => {
    showAuthLoading("Fazendo login...");
    try {
      const tokenData = await apiClient.login(credentials);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      showAuthLoading("Login realizado com sucesso!");
      
      setTimeout(() => {
        router.push('/dashboard');
        
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
        router.push('/dashboard');
        
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
        router.push('/dashboard');
        
        setTimeout(() => {
          hideLoading();
        }, 1500); 
      }, 1200);
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };

  // ✅ CORREÇÃO PRINCIPAL: Logout sem piscar
  const logout = () => {
    setIsLoggingOut(true); // ✅ Marca que está fazendo logout
    showAuthLoading("Fazendo logout...");
    
    setTimeout(() => {
      showAuthLoading("Logout realizado com sucesso!");
      
      setTimeout(() => {
        // ✅ Limpa dados DEPOIS de iniciar navegação
        setUser(null);
        clearToken();
        
        router.push('/');
        
        setTimeout(() => {
          setIsLoggingOut(false); // ✅ Reset do estado
          hideLoading();
        }, 300);
      }, 600);
    }, 400);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, googleLogin }}>
      {/* ✅ Não renderiza children se estiver fazendo logout */}
      {!isLoggingOut && children}
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