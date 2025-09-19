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

    // Verifica se houve alguma alteração
    if (front.trim() === flashcard.front && back.trim() === flashcard.back) {
        toast.info("Nenhuma alteração foi feita.");
        onClose();
        return;
    }

    setIsSaving(true);
    try {
      const updatedFlashcard = await apiClient.updateFlashcard(flashcard.id, { front, back });
      toast.success("Flashcard atualizado com sucesso!");
      onUpdate(updatedFlashcard); // Atualiza o estado no componente pai
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Flashcard</DialogTitle>
        </DialogHeader>
        {/* ▼▼▼ ALTERAÇÃO PRINCIPAL AQUI ▼▼▼ */}
        <div className="grid gap-4 py-4">
          {/* Borda em volta do campo "Frente" */}
          <div className="grid grid-cols-4 items-start gap-4 border p-4 rounded-md">
            <Label htmlFor="front" className="text-right pt-2">
              Frente
            </Label>
            <Textarea id="front" value={front} onChange={(e) => setFront(e.target.value)} className="col-span-3 min-h-[100px]" />
          </div>
          {/* Borda em volta do campo "Verso" */}
          <div className="grid grid-cols-4 items-start gap-4 border p-4 rounded-md">
            <Label htmlFor="back" className="text-right pt-2">
              Verso
            </Label>
            <Textarea id="back" value={back} onChange={(e) => setBack(e.target.value)} className="col-span-3 min-h-[100px]" />
          </div>
        </div>
        <DialogFooter>
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