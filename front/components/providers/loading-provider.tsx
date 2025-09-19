"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppLoadingScreen, PageLoadingScreen, AuthLoadingScreen } from '@/components/ui/loading-screen';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
  isAuthLoading: boolean;
  setAuthLoading: (loading: boolean, message?: string) => void;
  authLoadingMessage: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading deve ser usado dentro de LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState("Processando...");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pathname = usePathname();

  // Gerencia o carregamento inicial da aplicação
  useEffect(() => {
    if (isInitialLoad) {
      // Simula o tempo de compilação inicial do Next.js
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialLoad(false);
      }, 2000); // 2 segundos para dar tempo da compilação

      return () => clearTimeout(timer);
    }
  }, [isInitialLoad]);

  // Gerencia o carregamento entre páginas
  useEffect(() => {
    if (!isInitialLoad && !isAuthLoading) {
      setIsPageLoading(true);
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, 500); // Loading mais rápido para navegação entre páginas

      return () => clearTimeout(timer);
    }
  }, [pathname, isInitialLoad, isAuthLoading]);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const setPageLoading = (loading: boolean) => {
    setIsPageLoading(loading);
  };

  const setAuthLoadingWithMessage = (loading: boolean, message?: string) => {
    setIsAuthLoading(loading);
    if (message) {
      setAuthLoadingMessage(message);
    }
  };

  const contextValue: LoadingContextType = {
    isLoading,
    setLoading,
    isPageLoading,
    setPageLoading,
    isAuthLoading,
    setAuthLoading: setAuthLoadingWithMessage,
    authLoadingMessage,
  };

  // Mostra tela de carregamento inicial
  if (isLoading && isInitialLoad) {
    return <AppLoadingScreen />;
  }

  // Mostra tela de carregamento de autenticação (tela toda)
  if (isAuthLoading) {
    return <AuthLoadingScreen message={authLoadingMessage} />;
  }

  return (
    <LoadingContext.Provider value={contextValue}>
      {/* Tela de carregamento de página (considera sidebar) */}
      {isPageLoading && !isInitialLoad && !isAuthLoading && (
        <PageLoadingScreen message="Navegando..." />
      )}
      {children}
    </LoadingContext.Provider>
  );
}
