// front/contexts/auth-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, User, LoginRequest, RegisterRequest } from "@/lib/api";
import { setToken, clearToken, getToken } from "@/lib/auth";
import { getAcquisitionContext } from "@/lib/acquisition";
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
        
        if (pathname === '/') {
          router.replace('/dashboard');
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
  }, [pathname]);

  const login = async (credentials: LoginRequest) => {
    showAuthLoading("Fazendo login...");
    try {
      const tokenData = await apiClient.login(credentials);
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      showAuthLoading("Login realizado com sucesso!");
      
      // ✅ CORREÇÃO: Aguarda mais tempo antes de esconder o loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/dashboard');
      
      // ✅ CORREÇÃO: Só esconde o loading após garantir que a navegação começou
      await new Promise(resolve => setTimeout(resolve, 2000));
      hideLoading();
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };
  
  const googleLogin = async (code: string) => {
    showAuthLoading("Conectando com Google...");
    try {
      const tokenData = await apiClient.googleLogin(code, getAcquisitionContext());
      setToken(tokenData.access_token);
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      
      showAuthLoading("Login realizado com sucesso!");
      
      // ✅ CORREÇÃO: Aguarda mais tempo antes de esconder o loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/dashboard');
      
      // ✅ CORREÇÃO: Só esconde o loading após garantir que a navegação começou
      await new Promise(resolve => setTimeout(resolve, 2000));
      hideLoading();
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };

  const register = async (userData: RegisterRequest) => {
    showAuthLoading("Criando sua conta...");
    try {
      await apiClient.register({
        ...userData,
        acquisition_context: userData.acquisition_context ?? getAcquisitionContext(),
      });
      
      showAuthLoading("Conta criada! Fazendo login...");
      
      const tokenData = await apiClient.login({ 
        username: userData.email, 
        password: userData.password 
      });
      setToken(tokenData.access_token);
      const userDataResponse = await apiClient.getCurrentUser();
      setUser(userDataResponse);
      
      showAuthLoading("Bem-vindo ao Flashify!");
      
      // ✅ CORREÇÃO: Aguarda mais tempo antes de esconder o loading
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      router.push('/dashboard');
      
      // ✅ CORREÇÃO: Só esconde o loading após garantir que a navegação começou
      await new Promise(resolve => setTimeout(resolve, 2000));
      hideLoading();
      
    } catch (error) {
      hideLoading();
      throw error; 
    }
  };

  const logout = () => {
    setIsLoggingOut(true);
    showAuthLoading("Fazendo logout...");
    
    setTimeout(() => {
      showAuthLoading("Logout realizado com sucesso!");
      
      setTimeout(() => {
        setUser(null);
        clearToken();
        
        router.push('/');
        
        setTimeout(() => {
          setIsLoggingOut(false);
          hideLoading();
        }, 300);
      }, 600);
    }, 400);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, googleLogin }}>
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
