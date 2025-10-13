// front/components/documents/move-to-folder-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { apiClient, Document, Folder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MoveToFolderModalProps {
  doc: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveToFolderModal({ doc, isOpen, onClose, onSuccess }: MoveToFolderModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchFolders = async () => {
        setIsLoading(true);
        try {
          const libraryData = await apiClient.getLibraryData();
          setFolders(libraryData.folders);
        } catch (error) {
          toast.error("Não foi possível carregar as pastas.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchFolders();
    }
  }, [isOpen]);

  const handleMove = async () => {
    if (!doc || selectedFolderId === null) return;
    
    // Converte a string 'root' para null, ou o ID da pasta para número
    const targetFolderId = selectedFolderId === 'root' ? null : parseInt(selectedFolderId, 10);

    // Impede mover para a mesma pasta
    if (doc.folder_id === targetFolderId) {
        toast.info("O deck já está nesta localização.");
        onClose();
        return;
    }

    setIsMoving(true);
    try {
      await apiClient.moveDocumentToFolder(doc.id, targetFolderId);
      toast.success("Deck movido com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error("Falha ao mover o deck", { description: error.message });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mover Deck</DialogTitle>
          <DialogDescription>
            Escolha um novo local para o deck "{doc?.file_path}".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Select onValueChange={setSelectedFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um destino..." />
              </SelectTrigger>
              <SelectContent>
                {/* Opção para mover para a raiz da biblioteca */}
                <SelectItem value="root">Biblioteca Principal (sem pasta)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isMoving}>
            Cancelar
          </Button>
          <Button onClick={handleMove} disabled={isMoving || !selectedFolderId}>
            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}