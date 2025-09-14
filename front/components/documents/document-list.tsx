"use client";

import { useEffect, useRef } from "react";
import { Document } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, FileText, CheckCircle, Plus, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDocuments } from "@/hooks/use-documents"; // Importar o hook
import TimeAgo from "../common/time-ago"; // Importar o TimeAgo

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
  onNewUpload: () => void;
}

export function DocumentList({ onDocumentSelect, onNewUpload }: DocumentListProps) {
  // O componente agora consome o nosso hook centralizado
  const { documents, loading, error } = useDocuments();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Skeleton Loader para uma melhor experiência de carregamento inicial */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-60 animate-pulse bg-muted/50"></Card>
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

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold mt-4">A sua biblioteca está vazia</h3>
        <p className="text-muted-foreground mt-2">Crie o seu primeiro conjunto de flashcards para começar a estudar.</p>
        <Button onClick={onNewUpload} className="mt-6" variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Conjunto
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {documents.map((doc) => {
        const displayName = doc.file_path.split("/").pop()?.replace(/_/g, " ").replace(/\.[^/.]+$/, "") || "Conjunto de Estudo";

        return (
          <Card
            key={doc.id}
            className={`flex flex-col h-full transition-all duration-200 ${
              doc.status === "COMPLETED"
                ? "cursor-pointer hover:shadow-lg hover:-translate-y-1"
                : "" // Remove o fundo esbatido para consistência
            }`}
            onClick={() => doc.status === "COMPLETED" && onDocumentSelect(doc)}
          >
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-secondary" />
                {doc.status === "COMPLETED" && (
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                    <CheckCircle className="w-3 h-3 mr-1.5" />{`${doc.total_flashcards || 0} Cards`}
                  </Badge>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 flex-grow" title={displayName}>
                {displayName}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Criado <TimeAgo date={doc.created_at} />
              </p>
              
              <div className="mt-auto">
                {doc.status === 'PROCESSING' && (
                  <div className="flex items-center text-sm text-blue-500 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span className="truncate">{doc.current_step || 'A processar...'}</span>
                  </div>
                )}
                {doc.status === 'FAILED' && (
                  <div className="flex items-center text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="truncate" title={doc.current_step}>
                      Falhou: {doc.current_step?.replace('Erro: ', '').split('.')[0] || 'Erro desconhecido'}
                    </span>
                  </div>
                )}
                {doc.status === 'COMPLETED' && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progresso de Estudo</span>
                      <span>{`${doc.total_flashcards > 0 ? Math.round((doc.studied_flashcards / doc.total_flashcards) * 100) : 0}%`}</span>
                    </div>
                    <Progress value={doc.total_flashcards > 0 ? (doc.studied_flashcards / doc.total_flashcards) * 100 : 0} className="h-2 mb-4" />
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={doc.status !== "COMPLETED"}
                    >
                      Iniciar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}