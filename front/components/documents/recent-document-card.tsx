// front/components/documents/recent-document-card.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Document } from "@/lib/api";
import { FileText, Loader2, MoreVertical, Trash2, Move, AlertTriangle } from "lucide-react";
import TimeAgo from "../common/time-ago";
import { formatDocumentTitle } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLoading } from "@/components/providers/loading-provider";
import { MoveToFolderModal } from "./move-to-folder-modal";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface RecentDocumentCardProps {
  document: Document;
  onSelect?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export function RecentDocumentCard({ document, onSelect, onDelete, onUpdate }: RecentDocumentCardProps) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const { showLoading } = useLoading();
  const pathname = usePathname();

  const displayName = formatDocumentTitle(document.file_path);

  const progressPercentage = document.total_flashcards > 0
    ? Math.round((document.studied_flashcards / document.total_flashcards) * 100)
    : 0;

  const handleStartStudy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      showLoading("A preparar sessão de estudo...", false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent | Event) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  const handleMoveClick = (e: React.MouseEvent | Event) => {
    e.stopPropagation();
    setIsMoveModalOpen(true);
  };

  const handleMoveSuccess = () => {
    setIsMoveModalOpen(false);
    if (onUpdate) onUpdate();
  };

  return (
    <>
      <Link href={document.status === "COMPLETED" ? `/study/${document.id}?from=${pathname}` : '#'} legacyBehavior>
        <a onClick={(e) => { 
            if (document.status !== 'COMPLETED') e.preventDefault(); 
            if (onSelect) onSelect();
        }}>
          {/* A classe 'w-64' foi removida daqui */}
          <Card
            className={`flex flex-col h-full card-enhanced transition-all hover:-translate-y-1 glow-on-hover overflow-hidden ${
              document.status === "COMPLETED" && onSelect ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <CardHeader className="pb-3 relative">
              <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                  {/* Container do título com altura mínima e padding à direita */}
                  <div className="flex-1 min-w-0 overflow-hidden pr-8 min-h-[3rem]">
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onUpdate && (
                      <DropdownMenuItem onSelect={handleMoveClick} onClick={(e) => e.stopPropagation()}>
                          <Move className="mr-2 h-4 w-4" />
                          Mover para...
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onSelect={handleDeleteClick} onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="flex-grow">
              {document.status === 'PROCESSING' && (
                <div className="flex items-center text-sm text-blue-500 rounded-md h-full">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{document.current_step || 'A processar...'}</span>
                </div>
              )}
              {document.status === 'FAILED' && (
                <div className="flex items-center text-sm text-red-500 rounded-md h-full">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span>Falhou</span>
                </div>
              )}
              {document.status === 'COMPLETED' && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleStartStudy}
                disabled={document.status !== 'COMPLETED'}
              >
                {document.status === 'PROCESSING' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> A processar</> : 'Iniciar'}
              </Button>
            </CardFooter>
          </Card>
        </a>
      </Link>
      
      {onUpdate && (
        <MoveToFolderModal
          doc={document}
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onSuccess={handleMoveSuccess}
        />
      )}
    </>
  );
}