"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, apiClient, LibraryData, Folder } from "@/lib/api";
import { DocumentList } from "@/components/documents/document-list";
import { Loader2, Plus, FolderPlus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { formatDocumentTitle } from "@/lib/utils";

const ITEMS_PER_PAGE = 8;
type DeckSortOption = "recent" | "oldest" | "name";

function getPendingReviewsCount(document: Document) {
  return (document.flashcards_pending || 0) + (document.questions_pending || 0);
}

function paginateDocuments(documents: Document[], page: number) {
  return documents.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
}

function SectionPagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onChange(Math.max(currentPage - 1, 1));
            }}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        {Array.from({ length: totalPages }).map((_, index) => (
          <PaginationItem key={index}>
            <PaginationLink
              href="#"
              isActive={currentPage === index + 1}
              onClick={(e) => {
                e.preventDefault();
                onChange(index + 1);
              }}
            >
              {index + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onChange(Math.min(currentPage + 1, totalPages));
            }}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function DeckSection({
  title,
  count,
  documents,
  onNewUpload,
  onUpdate,
}: {
  title: string;
  count: number;
  documents: Document[];
  onNewUpload: () => void;
  onUpdate: () => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {title} <span className="text-muted-foreground">({count})</span>
          </h3>
        </div>
      </div>

      {documents.length > 0 ? (
        <>
          <DocumentList
            documents={documents}
            onNewUpload={onNewUpload}
            onUpdate={onUpdate}
          />
        </>
      ) : (
        <Card className="rounded-2xl border border-dashed border-border/70 bg-card/70 px-5 py-8 text-center shadow-none dark:border-zinc-700/80 dark:bg-[#2a2e38]/70">
          <p className="text-base font-semibold text-foreground">Nenhum deck encontrado nesta seção</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste os filtros ou a busca para ver mais resultados.
          </p>
        </Card>
      )}
    </section>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<DeckSortOption>("recent");
  
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
      toast.error("Não foi possível carregar a biblioteca.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, libraryData?.root_documents]);

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
  
  const filteredRootDocuments = useMemo(() => {
    const documents = libraryData?.root_documents || [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const searchedDocuments = normalizedSearch
      ? documents.filter((document) => {
          const displayName = formatDocumentTitle(document.file_path, document.title).toLowerCase();
          const rawPath = document.file_path.toLowerCase();
          return displayName.includes(normalizedSearch) || rawPath.includes(normalizedSearch);
        })
      : documents;

    const sortedDocuments = [...searchedDocuments].sort((left, right) => {
      if (sortBy === "name") {
        return formatDocumentTitle(left.file_path, left.title).localeCompare(
          formatDocumentTitle(right.file_path, right.title),
          "pt-BR",
          { sensitivity: "base" }
        );
      }

      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();

      return sortBy === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });

    return sortedDocuments;
  }, [libraryData?.root_documents, searchTerm, sortBy]);

  const pendingDocuments = useMemo(
    () => filteredRootDocuments.filter((document) => getPendingReviewsCount(document) > 0),
    [filteredRootDocuments]
  );

  const regularDocuments = useMemo(
    () => filteredRootDocuments.filter((document) => getPendingReviewsCount(document) === 0),
    [filteredRootDocuments]
  );

  const totalPendingPages = Math.max(1, Math.ceil(pendingDocuments.length / ITEMS_PER_PAGE));
  const totalRegularPages = Math.max(1, Math.ceil(regularDocuments.length / ITEMS_PER_PAGE));
  const totalPages = Math.max(totalPendingPages, totalRegularPages);

  const paginatedPendingDocuments = useMemo(
    () => paginateDocuments(pendingDocuments, currentPage),
    [pendingDocuments, currentPage]
  );

  const paginatedRegularDocuments = useMemo(
    () => paginateDocuments(regularDocuments, currentPage),
    [regularDocuments, currentPage]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Minha Biblioteca</h2>
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

          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_220px] xl:max-w-[760px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar deck..."
                className="h-11 rounded-xl border border-black/10 bg-background pl-11 dark:border-white/10 dark:bg-[#1b1f28]"
              />
            </div>

            <div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as DeckSortOption)}>
                <SelectTrigger
                  aria-label="Ordenar decks"
                  className="h-11 w-full rounded-xl border border-black/10 bg-background dark:border-white/10 dark:bg-[#1b1f28]"
                >
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigas</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {filteredRootDocuments.length === 0 ? (
                <Card className="rounded-2xl border border-dashed border-border/70 bg-card/70 px-5 py-10 text-center shadow-none dark:border-zinc-700/80 dark:bg-[#2a2e38]/70">
                  <p className="text-base font-semibold text-foreground">Nenhum deck encontrado</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tente outro termo de busca ou altere a ordenação para localizar seus decks.
                  </p>
                </Card>
              ) : (
                <div className="space-y-10">
                  {paginatedPendingDocuments.length > 0 ? (
                    <DeckSection
                      title="Revisões pendentes"
                      count={pendingDocuments.length}
                      documents={paginatedPendingDocuments}
                      onNewUpload={handleNewUpload}
                      onUpdate={fetchLibraryData}
                    />
                  ) : null}

                  {paginatedRegularDocuments.length > 0 ? (
                    <DeckSection
                      title="Sem revisões pendentes"
                      count={regularDocuments.length}
                      documents={paginatedRegularDocuments}
                      onNewUpload={handleNewUpload}
                      onUpdate={fetchLibraryData}
                    />
                  ) : null}

                  <SectionPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onChange={setCurrentPage}
                  />
                </div>
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
            <AlertDialogTitle>Excluir pasta "{folderToDelete?.name}"?</AlertDialogTitle>
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
