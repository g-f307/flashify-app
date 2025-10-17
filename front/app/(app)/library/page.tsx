"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, apiClient, LibraryData, Folder } from "@/lib/api";
import { DocumentList } from "@/components/documents/document-list";
import { Loader2, Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreateFolderModal } from "@/components/documents/create-folder-modal";
import { FolderCard } from "@/components/documents/folder-card";
import { RenameFolderModal } from "@/components/documents/rename-folder-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 8;

export default function LibraryPage() {
  const router = useRouter();
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDeleteDecksChecked, setIsDeleteDecksChecked] = useState(false);

  const fetchLibraryData = async () => {
    if (!libraryData) setLoading(true);
    
    try {
      const data = await apiClient.getLibraryData();
      setLibraryData(data);
    } catch (error) {
      toast.error("Não foi possível carregar a sua biblioteca.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  // A função handleDocumentSelect foi REMOVIDA
  const handleNewUpload = () => router.push("/create");

  const handleCreateSuccess = () => {
    setIsCreateFolderModalOpen(false);
    toast.success("Pasta criada com sucesso!");
    fetchLibraryData();
  };

  const handleRenameSuccess = () => {
    setFolderToRename(null);
    toast.success("Pasta renomeada com sucesso!");
    fetchLibraryData();
  };

  const handleDeleteConfirm = async () => {
    if (!folderToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteFolder(folderToDelete.id, isDeleteDecksChecked);
      
      toast.success(`Pasta "${folderToDelete.name}" excluída com sucesso!`);
      setFolderToDelete(null);
      fetchLibraryData();
    } catch (error: any) {
      toast.error("Falha ao excluir a pasta", { description: error.message });
    } finally {
      setIsDeleting(false);
      setIsDeleteDecksChecked(false);
    }
  };
  
  const rootDocuments = libraryData?.root_documents || [];
  const totalPages = Math.ceil(rootDocuments.length / ITEMS_PER_PAGE);
  const paginatedRootDocuments = rootDocuments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">A Minha Biblioteca</h2>
              <p className="text-muted-foreground mt-1">Organize os seus estudos em pastas e decks.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsCreateFolderModalOpen(true)} variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                Nova Pasta
              </Button>
              <Button onClick={handleNewUpload}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Deck
              </Button>
            </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center pt-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-12">
            {libraryData?.folders && libraryData.folders.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold tracking-tight mb-4">Pastas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {libraryData.folders.map((folder) => (
                    <FolderCard 
                      key={folder.id} 
                      folder={folder}
                      onRename={() => setFolderToRename(folder)}
                      onDelete={() => setFolderToDelete(folder)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xl font-semibold tracking-tight mb-4">Decks na Biblioteca</h3>
              <DocumentList
                documents={paginatedRootDocuments}
                // A propriedade onDocumentSelect foi REMOVIDA
                onNewUpload={handleNewUpload}
                onUpdate={fetchLibraryData}
              />
              {totalPages > 1 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(p - 1, 1)); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={currentPage === i + 1} onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}>{i + 1}</PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(p + 1, totalPages)); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </section>
          </div>
        )}
      </div>

      <CreateFolderModal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} onSuccess={handleCreateSuccess} />
      <RenameFolderModal folder={folderToRename} isOpen={!!folderToRename} onClose={() => setFolderToRename(null)} onSuccess={handleRenameSuccess} />
      
      <AlertDialog 
        open={!!folderToDelete} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setFolderToDelete(null);
            setIsDeleteDecksChecked(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a pasta "{folderToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os decks dentro desta pasta não serão apagados, mas movidos para a biblioteca principal. Se desejar apagar os decks permanentemente, selecione a opção abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 my-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <Checkbox 
              id="delete-decks" 
              checked={isDeleteDecksChecked}
              onCheckedChange={(checked) => setIsDeleteDecksChecked(!!checked)}
              className="border-destructive"
            />
            <Label htmlFor="delete-decks" className="text-sm font-medium leading-none text-destructive">
              Sim, excluir permanentemente todos os decks dentro desta pasta.
            </Label>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}