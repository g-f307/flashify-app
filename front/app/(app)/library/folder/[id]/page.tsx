"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, FolderWithDocuments, Document } from "@/lib/api";
import { Loader2, Plus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentList } from "@/components/documents/document-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RenameFolderModal } from "@/components/documents/rename-folder-modal";


const ITEMS_PER_PAGE = 8;

export default function FolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [folder, setFolder] = useState<FolderWithDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFolderData = async () => {
    if (!folderId) return;
    try {
      setLoading(true);
      const data = await apiClient.getFolder(parseInt(folderId, 10));
      setFolder(data);
    } catch (error) {
      toast.error("Pasta não encontrada");
      router.push("/library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderData();
  }, [folderId]);

  // A função handleDocumentSelect foi REMOVIDA pois não é mais necessária.

  const handleNewUploadInFolder = () => {
    router.push(`/create?folderId=${folderId}`);
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteFolder(folder.id, false);
      toast.success(`Pasta "${folder.name}" foi excluída.`);
      router.push("/library");
    } catch (err: any) {
      toast.error("Falha ao excluir a pasta", { description: err.message });
    } finally {
      setIsDeleting(false);
      setIsDeleteAlertOpen(false);
    }
  };
  
  const totalPages = folder ? Math.ceil(folder.documents.length / ITEMS_PER_PAGE) : 0;
  const paginatedDocuments = folder 
    ? folder.documents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center pt-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!folder) return null;

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/library">Biblioteca</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{folder.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">{folder.name}</h2>
            <p className="text-muted-foreground mt-1">Decks dentro desta pasta.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleNewUploadInFolder}><Plus className="w-4 h-4 mr-2" />Novo Deck</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenameModalOpen(true)}><Edit className="mr-2 h-4 w-4" />Renomear</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <DocumentList
          documents={paginatedDocuments}
          // A propriedade onDocumentSelect foi REMOVIDA
          onNewUpload={handleNewUploadInFolder}
          onUpdate={fetchFolderData}
          isInsideFolder
          isLoading={loading}
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
      </div>
      
      <RenameFolderModal folder={folder} isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} onSuccess={fetchFolderData} />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a pasta "{folder.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os decks nesta pasta não serão excluídos, mas movidos para a sua biblioteca principal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}