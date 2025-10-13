"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, FolderWithDocuments, Document } from "@/lib/api";
import { Loader2, Plus } from "lucide-react";
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

const ITEMS_PER_PAGE = 8;

export default function FolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [folder, setFolder] = useState<FolderWithDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleDocumentSelect = (doc: Document) => {
    router.push(`/study/${doc.id}`);
  };

  const handleNewUploadInFolder = () => {
    router.push(`/create?folderId=${folderId}`);
  };
  
  // Lógica de paginação
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ... (cabeçalho da página com breadcrumb) ... */}
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
        <Button onClick={handleNewUploadInFolder}><Plus className="w-4 h-4 mr-2" />Novo Deck Nesta Pasta</Button>
      </div>
      
      <DocumentList
        documents={paginatedDocuments} // Passa apenas os decks da página atual
        onDocumentSelect={handleDocumentSelect}
        onNewUpload={handleNewUploadInFolder}
        onUpdate={fetchFolderData}
        isInsideFolder
        isLoading={loading}
      />

      {/* Controlos da Paginação */}
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
  );
}