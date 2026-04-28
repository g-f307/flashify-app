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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

    if (front.trim() === flashcard.front && back.trim() === flashcard.back) {
        toast.info("Nenhuma alteração foi feita.");
        onClose();
        return;
    }

    setIsSaving(true);
    try {
      const updatedFlashcard = await apiClient.updateFlashcard(flashcard.id, { front, back });
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
      <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-2xl flex-col p-0 sm:w-full">
        <DialogHeader className="border-b border-black/10 px-6 py-5 dark:border-white/10">
          <DialogTitle>Editar Flashcard</DialogTitle>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar]]:opacity-100 [&_[data-slot=scroll-area-scrollbar]]:w-3 [&_[data-slot=scroll-area-thumb]]:bg-black/15 dark:[&_[data-slot=scroll-area-thumb]]:bg-white/20">
          <div className="grid gap-4 px-6 py-5">
            <div className="grid gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Label htmlFor="front" className="pt-1">
                Frente
              </Label>
              <Textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                className="min-h-[140px] resize-none border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
            <div className="grid gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Label htmlFor="back" className="pt-1">
                Verso
              </Label>
              <Textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                className="min-h-[220px] resize-none border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t border-black/10 px-6 py-4 dark:border-white/10">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
