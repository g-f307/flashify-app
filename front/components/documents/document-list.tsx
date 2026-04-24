"use client";

import { useState } from "react";
import { Document, apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, Plus } from "lucide-react";
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
import { RecentDocumentCard } from "./recent-document-card";
import { formatDocumentTitle } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface DocumentListProps {
  documents?: Document[];
  onNewUpload: () => void;
  onUpdate: () => void;
  isInsideFolder?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function DocumentList({
  documents,
  onNewUpload,
  onUpdate,
  isInsideFolder = false,
  isLoading = false,
  error = null,
}: DocumentListProps) {
  const router = useRouter(); 
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDocumentSelect = (doc: Document) => {
    router.push(`/deck/${doc.id}`); 
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiClient.deleteDocument(docToDelete.id);
      toast.success(`Deck "${formatDocumentTitle(docToDelete.file_path)}" excluído com sucesso!`);
      onUpdate();
    } catch (error: any) {
      toast.error("Falha ao excluir o deck", { description: error.message });
    } finally {
      setIsDeleting(false);
      setDocToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,280px)] gap-4 sm:justify-start">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-[300px] rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-full animate-pulse flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted/70" />
                  <div className="space-y-2">
                    <div className="h-5 w-36 rounded-full bg-muted/70" />
                    <div className="h-4 w-24 rounded-full bg-muted/60" />
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-muted/60" />
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="h-6 w-24 rounded-full bg-muted/60" />
                <div className="h-6 w-28 rounded-full bg-muted/60" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-[78px] rounded-xl bg-[#FACC15]/10" />
                <div className="h-[78px] rounded-xl bg-[#48cfea]/10" />
              </div>

              <div className="mt-auto pt-4">
                <div className="h-10 rounded-xl bg-muted/70" />
              </div>
            </div>
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

  if (!documents || documents.length === 0) {
    if (isInsideFolder) {
      return (
        <div className="text-center py-6 px-4 border border-dashed rounded-md bg-muted/50">
          <p className="text-sm text-muted-foreground">Esta pasta está vazia.</p>
        </div>
      );
    }
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold mt-4">A biblioteca está vazia</h3>
        <p className="text-muted-foreground mt-2">Crie seu primeiro deck para começar a estudar.</p>
        <Button onClick={onNewUpload} className="mt-6" variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Deck
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {documents.map((doc) => (
          <RecentDocumentCard
            key={doc.id}
            document={doc}
            onSelect={() => handleDocumentSelect(doc)}
            onDelete={() => setDocToDelete(doc)}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <AlertDialog
        open={!!docToDelete}
        onOpenChange={(isOpen) => { if (!isOpen) setDocToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o deck <span className="font-bold">"{docToDelete ? formatDocumentTitle(docToDelete.file_path) : ''}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
