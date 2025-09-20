"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Document, apiClient } from "@/lib/api";
import { FileText, Loader2, MoreVertical, Trash2 } from "lucide-react";
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
import { useLoading } from "@/components/providers/loading-provider";

// ▼▼▼ ALTERAÇÃO PONTUAL AQUI ▼▼▼
interface RecentDocumentCardProps {
  document: Document;
  onDeleteSuccess: (deletedId: number) => void; // Agora espera receber o ID
  onDocumentSelect: (document: Document) => void;
}

export function RecentDocumentCard({ document, onDeleteSuccess, onDocumentSelect }: RecentDocumentCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showLoading } = useLoading();

  const displayName = formatDocumentTitle(document.file_path);

  const progressPercentage = document.total_flashcards > 0 
    ? Math.round((document.studied_flashcards / document.total_flashcards) * 100) 
    : 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.deleteDocument(document.id);
      toast.success(`Deck "${displayName}" excluído com sucesso!`);
      onDeleteSuccess(document.id); // Avisa o pai QUAL deck foi excluído
    } catch (error: any) {
      toast.error("Falha ao excluir o deck", { description: error.message });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleStartStudy = () => {
    showLoading("Preparando sessão de estudo...", false);
    onDocumentSelect(document);
  };
  // ▲▲▲ FIM DA ALTERAÇÃO ▲▲▲

  return (
    <>
      <Card className="flex flex-col h-full w-64 card-enhanced transition-all hover:-translate-y-1 glow-on-hover overflow-hidden">
        <CardHeader className="pb-3 relative">
          <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0 overflow-hidden">
                  <CardTitle className="text-lg leading-tight break-words line-clamp-2" title={displayName}>
                      {displayName}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                      Criado <TimeAgo date={document.created_at} />
                  </CardDescription>
              </div>
          </div>
          
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  onSelect={(e) => { e.preventDefault(); e.stopPropagation(); setIsDeleteDialogOpen(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{document.status === 'COMPLETED' ? 'Progresso' : 'Criação'}</span>
              <span>{document.status === 'COMPLETED' ? `${progressPercentage}%` : `${document.processing_progress || 0}%`}</span>
            </div>
            <Progress value={document.status === 'COMPLETED' ? progressPercentage : (document.processing_progress || 0)} className="h-2" />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            variant="secondary"
            onClick={handleStartStudy}
            disabled={document.status !== 'COMPLETED'}
          >
            {document.status === 'PROCESSING' 
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> A processar</> 
              : 'Iniciar'
            }
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto excluirá permanentemente o deck
              <span className="font-bold"> "{displayName}"</span> e todos os seus flashcards.
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