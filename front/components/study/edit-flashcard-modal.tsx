"use client";

import { useState, useEffect } from "react";
import { Flashcard, apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { isRichTextEmpty, normalizeRichTextValue } from "@/lib/rich-text";

interface EditFlashcardModalProps {
  flashcard: Flashcard | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedFlashcard: Flashcard) => void;
}

export function EditFlashcardModal({ flashcard, isOpen, onClose, onUpdate }: EditFlashcardModalProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
    }
  }, [flashcard]);

  const handleSave = async () => {
    if (!flashcard) return;

    const normalizedFront = normalizeRichTextValue(front);
    const normalizedBack = normalizeRichTextValue(back);

    if (normalizedFront === flashcard.front && normalizedBack === flashcard.back) {
        toast.info("Nenhuma alteração foi feita.");
        onClose();
        return;
    }

    if (isRichTextEmpty(normalizedFront) || isRichTextEmpty(normalizedBack)) {
      toast.error("Frente e verso precisam ter conteúdo.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedFlashcard = await apiClient.updateFlashcard(flashcard.id, {
        front: normalizedFront,
        back: normalizedBack,
      });
      toast.success("Flashcard atualizado com sucesso!");
      onUpdate(updatedFlashcard); 
      onClose();
    } catch (error: any) {
      toast.error("Falha ao atualizar", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!flashcard) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[min(90vh,54rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b border-black/10 px-4 py-4 dark:border-white/10 sm:px-6 sm:py-5">
          <DialogTitle>Editar Flashcard</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Label htmlFor="front" className="pt-1">
                Frente
              </Label>
              <RichTextEditor
                value={front}
                onChange={setFront}
                placeholder="Pergunta, conceito ou comando principal do card"
                minHeightClassName="min-h-[160px] sm:min-h-[180px]"
              />
            </div>
            <div className="grid gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Label htmlFor="back" className="pt-1">
                Verso
              </Label>
              <RichTextEditor
                value={back}
                onChange={setBack}
                placeholder="Resposta, explicação, passos, fórmulas e observações"
                minHeightClassName="min-h-[200px] sm:min-h-[220px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t border-black/10 px-4 py-4 dark:border-white/10 sm:px-6">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
