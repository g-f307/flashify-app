// front/components/documents/rename-folder-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { apiClient, Folder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RenameFolderModalProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RenameFolderModal({ folder, isOpen, onClose, onSuccess }: RenameFolderModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
    }
  }, [folder]);

  const handleSave = async () => {
    if (!folder || !name.trim()) return toast.error("O nome da pasta não pode estar vazio.");
    
    setIsSaving(true);
    try {
      await apiClient.updateFolder(folder.id, name);
      toast.success("Pasta renomeada com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error("Falha ao renomear pasta", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Renomear Pasta</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="name" className="text-left">Novo nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}