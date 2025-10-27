'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  showLoading: (message?: string, fullScreen?: boolean) => void;
  hideLoading: () => void;
  showAuthLoading: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: React.ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Carregando...');
  const [fullScreen, setFullScreen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthZone = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  const showLoading = useCallback((newMessage?: string, isFullScreen?: boolean) => {
    setMessage(newMessage || 'Carregando...');
    setFullScreen(isFullScreen ?? (isAuthZone ? true : false));
    setIsLoading(true);
  }, [isAuthZone]);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const showAuthLoading = useCallback((newMessage: string) => {
    setMessage(newMessage);
    setFullScreen(true); 
    setIsLoading(true);
  }, []);

  useEffect(() => {
    const handleStart = () => {
      const shouldBeFullScreen = isAuthZone;
      showLoading('Navegando...', shouldBeFullScreen);
    };

    const handleComplete = () => {
      setTimeout(() => {
        hideLoading();
      }, 200);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href], button[data-navigate]');
      
      if (link) {
        const href = link.getAttribute('href');
        const navigate = link.getAttribute('data-navigate');
        
        if ((href && !href.startsWith('http') && !href.startsWith('#')) || navigate) {
          handleStart();
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [showLoading, hideLoading, isAuthZone]);

  useEffect(() => {
    const timer = setTimeout(() => {
      hideLoading();
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, hideLoading]);

  const contextValue: LoadingContextType = {
    isLoading,
    message,
    showLoading,
    hideLoading,
    showAuthLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {isLoading && (
        <LoadingScreen 
          message={message} 
          fullScreen={fullScreen}
        />
      )}
    </LoadingContext.Provider>
  );
}
