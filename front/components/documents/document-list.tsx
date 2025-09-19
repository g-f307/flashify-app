"use client";

import { useState } from "react";
import { Document, apiClient } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, FileText, CheckCircle, Plus, AlertTriangle, MoreVertical, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDocuments } from "@/hooks/use-documents";
import TimeAgo from "../common/time-ago";
import { formatDocumentTitle } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
// 1. Importar os componentes de paginação
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
  onNewUpload: () => void;
}

export function DocumentList({ onDocumentSelect, onNewUpload }: DocumentListProps) {
  const { documents, loading, error, refetchDocuments } = useDocuments();
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 2. Adicionar o estado para a paginação
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const handleDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteDocument(docToDelete.id);
      toast.success("Deck excluído com sucesso!");
      refetchDocuments();
    } catch (error: any) {
      toast.error("Falha ao excluir o deck", { description: error.message });
    } finally {
      setIsDeleting(false);
      setDocToDelete(null);
    }
  };

  // 3. Adicionar a lógica para calcular os itens da página atual
  const totalPages = Math.ceil(documents.length / ITEMS_PER_PAGE);
  const paginatedDocuments = documents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          Criar Novo Deck
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* 4. Mapear sobre os documentos paginados */}
        {paginatedDocuments.map((doc) => {
          const displayName = formatDocumentTitle(doc.file_path);
          return (
            <div key={doc.id} className="relative group h-full">
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-card/80 backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      onSelect={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDocToDelete(doc); 
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Card
                className={`flex flex-col h-full transition-all duration-200 glow-on-hover card-enhanced ${
                  doc.status === "COMPLETED" ? "cursor-pointer" : "opacity-80"
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
                  <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 flex-grow" title={displayName}>{displayName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">Criado <TimeAgo date={doc.created_at} /></p>
                  <div className="mt-auto">
                    {doc.status === 'PROCESSING' && ( <div className="flex items-center text-sm text-blue-500 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md"><Loader2 className="w-4 h-4 mr-2 animate-spin" /><span className="truncate">{doc.current_step || 'A processar...'}</span></div> )}
                    {doc.status === 'FAILED' && ( <div className="flex items-center text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-md"><AlertTriangle className="w-4 h-4 mr-2" /><span className="truncate" title={doc.current_step}>Falhou: {doc.current_step?.replace('Erro: ', '').split('.')[0] || 'Erro desconhecido'}</span></div> )}
                    {doc.status === 'COMPLETED' && ( <> <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progresso de Estudo</span><span>{`${doc.total_flashcards > 0 ? Math.round((doc.studied_flashcards / doc.total_flashcards) * 100) : 0}%`}</span></div> <Progress value={doc.total_flashcards > 0 ? (doc.studied_flashcards / doc.total_flashcards) * 100 : 0} className="h-2 mb-4" /> <Button className="w-full" variant="secondary" disabled={doc.status !== "COMPLETED"}>Iniciar</Button> </> )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* 5. Renderizar os controlos de paginação se houver mais de uma página */}
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === i + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(i + 1);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto excluirá permanentemente o deck
              <span className="font-bold"> "{docToDelete ? formatDocumentTitle(docToDelete.file_path) : ''}"</span> e todos os seus flashcards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}