"use client";

import { useEffect, useState } from "react";
import { apiClient, Document } from "@/lib/api"; // Importando o tipo Document
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
}

export function DocumentList({ onDocumentSelect }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const userDocuments = await apiClient.getDocuments();
        setDocuments(userDocuments);
      } catch (err: any) {
        setError(err.message || "Falha ao carregar documentos.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (loading) {
    return <p>Carregando documentos...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {documents.length > 0 ? (
        documents.map((doc) => (
          // --- CORREÇÃO: Chamando onDocumentSelect ao clicar no botão Estudar ---
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>{doc.file_path.split('/').pop()}</CardTitle>
              <CardDescription>Status: <Badge>{doc.status}</Badge></CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => onDocumentSelect(doc)}>
                Estudar Flashcards
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>Nenhum documento encontrado. Faça o upload de um arquivo para começar.</p>
      )}
    </div>
  );
}