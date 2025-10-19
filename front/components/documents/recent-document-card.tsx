// front/components/documents/recent-document-card.tsx

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Document } from "@/lib/api";
import { Loader2, MoreVertical, Trash2, Move, AlertTriangle, BrainCircuit, Layers, BookOpen, CalendarDays, Sparkles } from "lucide-react";
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
import { Badge } from "../ui/badge";

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

  const handleStartStudy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      showLoading("A preparar o seu deck...", false);
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

  const linkHref = document.status === "COMPLETED" ? `/deck/${document.id}?from=${pathname}` : '#';
  const isClickable = document.status === "COMPLETED" && onSelect;

  return (
    <>
      <Link href={linkHref} legacyBehavior passHref>
        <a onClick={(e) => { 
            if (!isClickable) e.preventDefault(); 
            if (onSelect) onSelect();
        }} className="h-full block">
          <Card
            className={`group relative w-full h-full flex flex-col p-5 border-2 transition-all duration-300 ease-out overflow-hidden
              ${isClickable 
                ? "cursor-pointer hover:border-[#48cfea] hover:shadow-xl hover:shadow-[#48cfea]/20 hover:-translate-y-1.5 hover:bg-gradient-to-br hover:from-[#48cfea]/[0.03] hover:to-transparent" 
                : "cursor-default bg-muted/30 border-muted"
              }
            `}
          >
            {/* Efeito de brilho sutil no hover - gradiente azul/amarelo */}
            {isClickable && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#48cfea]/8 via-[#FACC15]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            )}

            {/* === CABEÇALHO === */}
            <div className="relative flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Ícone com background em azul */}
                <div className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ${
                  isClickable 
                    ? "bg-[#48cfea]/20 text-[#48cfea] group-hover:bg-[#48cfea] group-hover:text-white group-hover:scale-110" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                
                {/* Título com melhor tipografia */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold leading-tight line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors" title={displayName}>
                    {displayName}
                  </h3>
                </div>
              </div>
              
              {/* Menu com estilo melhorado */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-8 w-8 flex-shrink-0 rounded-lg hover:bg-muted/80 transition-all opacity-60 group-hover:opacity-100" 
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onUpdate && (
                    <DropdownMenuItem onSelect={handleMoveClick} onClick={(e) => e.stopPropagation()}>
                      <Move className="mr-2 h-4 w-4" /> Mover para...
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                      onSelect={handleDeleteClick} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* === CORPO === */}
            <div className="relative flex-grow flex flex-col justify-between min-h-[80px] space-y-4">
              {/* Status do processamento com azul da marca */}
              {document.status === 'PROCESSING' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#48cfea]/10 border border-[#48cfea]/30">
                  <Loader2 className="w-4 h-4 text-[#48cfea] animate-spin flex-shrink-0" />
                  <span className="text-sm font-medium text-[#48cfea] truncate">
                    {document.current_step || 'A processar...'}
                  </span>
                </div>
              )}
              
              {document.status === 'FAILED' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    Falha no processamento
                  </span>
                </div>
              )}
              
              {document.status === 'COMPLETED' && (
                <div className="space-y-3">
                  {/* Data de criação com estilo melhorado */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 opacity-60" />
                    <span className="font-medium">Criado <TimeAgo date={document.created_at} /></span>
                  </div>
                  
                  {/* Badges com as cores da marca - AMARELO para flashcards e quiz */}
                  <div className="flex flex-wrap items-center gap-2">
                    {document.total_flashcards > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FACC15]/20 text-[#FACC15] dark:text-[#FACC15] border-[#FACC15]/40 hover:bg-[#FACC15]/30 transition-colors font-medium"
                      >
                        <Layers className="w-3.5 h-3.5"/>
                        <span className="text-[#FACC15]">{document.total_flashcards} Flashcards</span>
                      </Badge>
                    )}
                    {document.has_quiz && (
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FACC15]/20 text-[#FACC15] dark:text-[#FACC15] border-[#FACC15]/40 hover:bg-[#FACC15]/30 transition-colors font-medium"
                      >
                        <BrainCircuit className="w-3.5 h-3.5"/>
                        <span className="text-[#FACC15]">Quiz</span>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* === RODAPÉ === */}
            <div className="relative mt-4 pt-4 border-t border-border/50">
              <Button 
                className={`w-full font-semibold transition-all duration-300 ${
                  isClickable 
                    ? "bg-[#48cfea] hover:bg-[#48cfea]/90 text-black shadow-md hover:shadow-lg hover:shadow-[#48cfea]/30 group-hover:scale-[1.02]" 
                    : ""
                }`}
                variant={document.status === 'COMPLETED' ? "default" : "secondary"}
                onClick={handleStartStudy} 
                disabled={document.status !== 'COMPLETED'}
              >
                {document.status === 'PROCESSING' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin"/> 
                    A processar
                  </>
                ) : (
                  <>
                    Acessar Deck
                  </>
                )}
              </Button>
            </div>
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