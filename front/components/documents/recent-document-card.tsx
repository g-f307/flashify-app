"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Document } from "@/lib/api";
import {
  Loader2,
  MoreVertical,
  Trash2,
  Move,
  AlertTriangle,
  BrainCircuit,
  Layers,
  BookOpen,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import TimeAgo from "../common/time-ago";
import { cn, formatDocumentTitle } from "@/lib/utils";
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

  const displayName = formatDocumentTitle(document.file_path, document.title);
  const pendingCount = (document.flashcards_pending || 0) + (document.questions_pending || 0);
  const isCompleted = document.status === "COMPLETED";
  const isClickable = isCompleted && !!onSelect;
  const hasFlashcards = document.total_flashcards > 0;
  const hasQuiz = !!document.has_quiz;
  const linkHref = isCompleted ? `/deck/${document.id}?from=${pathname}` : '#';

  const handleStartStudy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      showLoading("Preparando seu deck...", false);
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

  const statusBadge =
    document.status === "PROCESSING" ? (
      <Badge
        variant="outline"
        className="rounded-full border-[#48cfea]/30 bg-[#48cfea]/10 px-2.5 py-1 text-[#48cfea]"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {document.current_step || "Processando"}
      </Badge>
    ) : document.status === "FAILED" ? (
      <Badge
        variant="outline"
        className="rounded-full border-red-500/25 bg-red-500/10 px-2.5 py-1 text-red-500"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Falha
      </Badge>
    ) : null;

  return (
    <>
      <Link href={linkHref} legacyBehavior passHref>
        <a
          onClick={(e) => {
            if (!isClickable) {
              e.preventDefault();
              return;
            }
            if (onSelect) onSelect();
          }}
          className="block h-full w-full"
        >
          <Card
            className={cn(
              "group relative flex h-[300px] w-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 dark:border-zinc-700/80 dark:bg-[#2a2e38]",
              isClickable
                ? "cursor-pointer border-border hover:-translate-y-1 hover:border-[#FACC15]/40 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.24),0_0_28px_rgba(250,204,21,0.16),0_18px_40px_-24px_rgba(250,204,21,0.52)] dark:hover:border-[#FACC15]/30 dark:hover:shadow-[0_0_0_1px_rgba(250,204,21,0.16),0_0_22px_rgba(250,204,21,0.12),0_18px_40px_-24px_rgba(250,204,21,0.34)]"
                : "cursor-default border-border/80 bg-muted/20 dark:bg-[#2a2e38]/90"
            )}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-border/50 dark:ring-zinc-800/80" />
            <div className="pointer-events-none absolute inset-[7px] rounded-[12px] border border-black/5 dark:border-zinc-700/60" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/70 dark:bg-zinc-700/70" />
            <div className="pointer-events-none absolute left-4 right-4 top-0 h-[3px] rounded-b-full bg-[linear-gradient(90deg,rgba(250,204,21,0.0),rgba(250,204,21,0.7),rgba(72,207,234,0.75),rgba(72,207,234,0.0))] opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
            <div className="pointer-events-none absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r border-t border-[#48cfea]/12 opacity-60 dark:border-zinc-800 dark:opacity-100" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 rounded-bl-xl border-b border-l border-[#FACC15]/12 opacity-60 dark:border-zinc-800 dark:opacity-100" />

            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#48cfea]/25 bg-[#48cfea]/10 dark:border-[#48cfea]/20 dark:bg-[#48cfea]/8">
                  <BookOpen className="h-4.5 w-4.5 text-[#1f8cab] dark:text-[#48cfea]" />
                  {document.srs_enabled && pendingCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-card dark:ring-[#2a2e38]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground" title={displayName}>
                    {displayName}
                  </h3>
                  <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                    <span className="truncate whitespace-nowrap">
                      <TimeAgo date={document.created_at} />
                    </span>
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-8 w-8 flex-shrink-0 rounded-lg hover:bg-muted/80 transition-all opacity-60 group-hover:opacity-100 dark:hover:bg-zinc-700/70" 
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

            <div className="relative flex flex-1 flex-col justify-between min-h-0">
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex flex-wrap items-start gap-2",
                    document.srs_enabled || statusBadge ? "min-h-8" : "min-h-0"
                  )}
                >
                  {statusBadge}
                  {document.srs_enabled ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "max-w-full rounded-full px-2.5 py-1",
                        pendingCount > 0
                          ? "border-red-500/25 bg-red-500/10 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {pendingCount > 0 ? `${pendingCount} revisões pendentes` : "Revisão inteligente"}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/8 p-3 dark:border-[#FACC15]/20 dark:bg-[#FACC15]/6">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 text-[#FACC15]" />
                      Flashcards
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {hasFlashcards ? "Disponível" : "Não gerado"}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-xl border border-[#48cfea]/30 bg-[#48cfea]/8 p-3 dark:border-[#48cfea]/20 dark:bg-[#48cfea]/6">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <BrainCircuit className="h-3.5 w-3.5 text-[#48cfea]" />
                      Quiz
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {hasQuiz ? "Disponível" : "Não gerado"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative mt-4 border-t border-muted pt-4 dark:border-zinc-700/60">
              <Button 
                className={cn(
                  "w-full rounded-xl transition-all duration-200",
                  isClickable 
                    ? "bg-[#48cfea] hover:bg-[#48cfea]/90 text-black shadow-sm" 
                    : ""
                )}
                variant={document.status === 'COMPLETED' ? "default" : "secondary"}
                onClick={handleStartStudy} 
                disabled={document.status !== 'COMPLETED'}
              >
                {document.status === 'PROCESSING' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin"/> 
                    Processando
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
