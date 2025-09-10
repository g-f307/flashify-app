// front/app/(app)/library/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { DocumentList } from "@/components/documents/document-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Document } from "@/lib/api";

export default function LibraryPage() {
  const router = useRouter();

  const handleDocumentSelect = (doc: Document) => {
    // Navega para a página de estudo dinâmica com o ID do documento
    router.push(`/study/${doc.id}`);
  };

  const handleNewUpload = () => {
    router.push("/create");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Minha Biblioteca
        </h2>
        <Button
          onClick={handleNewUpload}
          size="sm"
          className="bg-lime-accent hover:bg-lime-accent/90 text-lime-accent-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Conjunto
        </Button>
      </div>
      <DocumentList
        onDocumentSelect={handleDocumentSelect}
        onNewUpload={handleNewUpload}
      />
    </div>
  );
}