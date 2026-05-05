// front/contexts/generation-limit-context.tsx

"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiClient, GenerationLimitInfo } from "@/lib/api";
import { useAuth } from "./auth-context";

interface GenerationLimitContextType {
  limitInfo: GenerationLimitInfo | null;
  loading: boolean;
  refreshLimitInfo: () => Promise<void>;
  incrementUsage: (amount?: number) => void;
}

const GenerationLimitContext = createContext<GenerationLimitContextType | undefined>(undefined);

export function GenerationLimitProvider({ children }: { children: ReactNode }) {
  const [limitInfo, setLimitInfo] = useState<GenerationLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLimitInfo = useCallback(async () => {
    if (!user) {
      setLimitInfo(null);
      setLoading(false);
      return;
    }
    
    try {
      const info = await apiClient.getGenerationLimitStatus();
      setLimitInfo(info);
    } catch (error) {
      console.error("Erro ao carregar limite:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLimitInfo();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchLimitInfo, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLimitInfo]);

  // Função para atualizar manualmente (após criar deck)
  const refreshLimitInfo = useCallback(async () => {
    await fetchLimitInfo();
  }, [fetchLimitInfo]);

  // Função otimista para incrementar localmente (feedback imediato)
  const incrementUsage = useCallback((amount: number = 1) => {
    if (limitInfo) {
      setLimitInfo({
        ...limitInfo,
        used: limitInfo.used + amount,
        remaining: Math.max(0, limitInfo.remaining - amount)
      });
    }
  }, [limitInfo]);

  return (
    <GenerationLimitContext.Provider value={{ limitInfo, loading, refreshLimitInfo, incrementUsage }}>
      {children}
    </GenerationLimitContext.Provider>
  );
}

export function useGenerationLimit() {
  const context = useContext(GenerationLimitContext);
  if (context === undefined) {
    throw new Error("useGenerationLimit must be used within a GenerationLimitProvider");
  }
  return context;
}
