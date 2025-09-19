"use client";

import { useState, useEffect, useCallback } from 'react';
import { Document, apiClient } from '@/lib/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    // Manter o loading a true no início de cada chamada
    setLoading(true); 
    setError(null);
    try {
      const docs = await apiClient.getDocuments();
      const sortedDocs = docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDocuments(sortedDocs);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar documentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // A função refetchDocuments simplesmente chama a função de busca novamente,
  // o que irá atualizar o estado e re-renderizar a lista.
  return { documents, loading, error, refetchDocuments: fetchDocuments };
}