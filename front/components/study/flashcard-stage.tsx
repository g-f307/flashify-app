"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedFlashcardRenderer } from "./enhanced-flashcard-renderer";

type FlashcardContent = {
  front: string;
  back: string;
  type?: "concept" | "code" | "diagram" | "example" | "comparison";
};

interface FlashcardStageProps {
  flashcard: FlashcardContent;
  currentIndex: number;
  total: number;
  isFlipped: boolean;
  onFlip: () => void;
  frontActions: ReactNode;
  backActions: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  interactiveClassName?: string;
  stageClassName?: string;
  cardClassName?: string;
  footerClassName?: string;
  showCounter?: boolean;
}

export function FlashcardStage({
  flashcard,
  currentIndex,
  total,
  isFlipped,
  onFlip,
  frontActions,
  backActions,
  onEdit,
  onDelete,
  interactiveClassName,
  stageClassName,
  cardClassName,
  footerClassName,
  showCounter = true,
}: FlashcardStageProps) {
  return (
    <>
      <div className={cn("w-full max-w-2xl flex-grow flex flex-col items-center justify-center perspective-1000", stageClassName)}>
        <div
          className={cn(
            "relative group w-full h-[450px] sm:h-[500px] transform-style-preserve-3d transition-transform duration-600 cursor-pointer",
            cardClassName,
            interactiveClassName ?? "glow-on-hover"
          )}
          style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
          onClick={onFlip}
        >
          {(onEdit || onDelete) && (
            <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
                    className="h-9 w-9"
                    style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                  style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Card className="absolute w-full h-full backface-hidden flex items-center justify-center p-8 sm:p-12 flashcard-enhanced">
            <div className="w-full h-full flex items-center justify-center text-center">
              <EnhancedFlashcardRenderer
                content={flashcard.front}
                type={flashcard.type ?? "concept"}
              />
            </div>
          </Card>

          <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-8 sm:p-12 flashcard-enhanced">
            <div className="w-full h-full flex items-center justify-center text-center">
              <EnhancedFlashcardRenderer
                content={flashcard.back}
                type={flashcard.type ?? "concept"}
                isAnswer
              />
            </div>
          </Card>
        </div>
      </div>

      <div className={cn("w-full max-w-2xl mt-6 space-y-4", footerClassName)}>
        {showCounter && (
          <div className="text-center text-sm text-muted-foreground">
            {currentIndex + 1} / {total}
          </div>
        )}

        <div className="min-h-[6rem] sm:min-h-[3.5rem] flex items-center">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="navigation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {frontActions}
              </motion.div>
            ) : (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {backActions}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
