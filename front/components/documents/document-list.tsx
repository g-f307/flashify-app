"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient, Document } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, FileText, CheckCircle, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FlashcardLoader from "@/components/flashcard-loader";

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
  onNewUpload: () => void;
}

export function DocumentList({ onDocumentSelect, onNewUpload }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDocuments = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const userDocuments = await apiClient.getDocuments();
      
      setDocuments(userDocuments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      const isProcessing = userDocuments.some(doc => doc.status === 'PROCESSING');
      if (!isProcessing && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err: any) {
      setError(err.message || "Falha ao carregar a biblioteca.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    intervalRef.current = setInterval(() => fetchDocuments(false), 7000); 
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="flex flex-col h-full">
                <CardContent className="p-4 flex flex-col h-full">
                    {/* Skeleton Loader - Pode adicionar um componente de skeleton aqui */}
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-50 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" /> {error}
      </div>
    );
  }

  const totalPages = Math.ceil(documents.length / ITEMS_PER_PAGE);
  const currentDocuments = documents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="space-y-6">
      {documents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentDocuments.map((doc) => {
              const progressPercentage = doc.total_flashcards > 0 
                ? Math.round((doc.studied_flashcards / doc.total_flashcards) * 100) 
                : 0;
              const displayName = doc.file_path.split("/").pop()?.replace(/_/g, " ") || "Conjunto de Estudo";

              return (
                <Card key={doc.id} className="flex flex-col h-full glow-on-hover transition-all hover:-translate-y-1">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-secondary" />
                      {doc.status === "COMPLETED" ? (
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                          <CheckCircle className="w-3 h-3 mr-1.5" />{`${doc.total_flashcards || 0} Cards`}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FlashcardLoader progress={doc.processing_progress || 0} />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2" title={displayName}>
                      {displayName}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      Criado {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{doc.status === "COMPLETED" ? "Progresso de Estudo" : "Progresso da Criação" }</span>
                        <span>{doc.status === "COMPLETED" ? `${progressPercentage}%` : `${doc.processing_progress || 0}%`}</span>
                      </div>
                      <Progress value={doc.status === "COMPLETED" ? progressPercentage : (doc.processing_progress || 0)} className="h-2 mb-4" />
                      
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => onDocumentSelect(doc)}
                        disabled={doc.status !== "COMPLETED"}
                      >
                        {doc.status === "PROCESSING" 
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> A processar</> 
                          : "Iniciar"
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold mt-4">A sua biblioteca está vazia</h3>
          <p className="text-muted-foreground mt-2">Crie o seu primeiro conjunto de flashcards para começar a estudar.</p>
          <Button onClick={onNewUpload} className="mt-6" variant="default">
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Conjunto
          </Button>
        </div>
      )}
    </div>
  );
}