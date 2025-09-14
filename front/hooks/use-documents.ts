// front/hooks/use-documents.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Document, apiClient } from '@/lib/api';

// A interface do hook agora utiliza a 'Document' diretamente da api.ts
// que já inclui os campos 'current_step', 'total_flashcards', etc.

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usamos useCallback para garantir que a função não seja recriada a cada renderização,
  // otimizando o seu uso nos hooks useEffect.
  const fetchDocuments = useCallback(async () => {
    try {
      const allDocs = await apiClient.getDocuments();
      // Ordena os documentos pela data de criação, do mais recente para o mais antigo
      const sortedDocs = allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDocuments(sortedDocs);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar documentos.');
    } finally {
      // O loading principal só é desativado na primeira busca.
      // As atualizações de polling acontecem em segundo plano.
      if (loading) {
        setLoading(false);
      }
    }
  }, [loading]); // A dependência garante que a função se mantenha estável

  // Efeito para a busca inicial
  useEffect(() => {
    fetchDocuments();
    // O array de dependências vazio garante que esta busca inicial só aconteça uma vez.
  }, []);

  // Efeito para a lógica de polling
  useEffect(() => {
    // Verifica se existe algum documento em processamento na lista atual
    const isProcessing = documents.some(doc => doc.status === 'PROCESSING');

    if (isProcessing) {
      // Se houver, configura um intervalo para verificar novamente a cada 5 segundos
      const intervalId = setInterval(() => {
        console.log("A verificar o estado dos documentos...");
        fetchDocuments();
      }, 5000); // 5 segundos

      // A função de limpeza do useEffect é crucial para parar o polling
      // quando o componente for desmontado ou quando a lista de documentos mudar e já não houver nada a processar.
      return () => clearInterval(intervalId);
    }
  }, [documents, fetchDocuments]); // Re-executa este efeito sempre que a lista de documentos mudar

  return { documents, loading, error, refetchDocuments: fetchDocuments };
}