// front/app/(app)/library/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, apiClient } from "@/lib/api";
import { DocumentList } from "@/components/documents/document-list";
import { Loader2, Plus } from "lucide-react";
import { ReviewDeckCard } from "@/components/documents/review-deck-card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function LibraryPage() {
  const router = useRouter();
  // A lista de documentos não é mais necessária neste estado
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        // Agora buscamos apenas os dados da sessão de revisão
        const reviewFlashcards = await apiClient.getReviewFlashcards();
        setReviewCount(reviewFlashcards.length);
        
      } catch (error) {
        console.error("Falha ao carregar dados de revisão:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, []);
  
  const handleDocumentSelect = (doc: Document) => {
    router.push(`/study/${doc.id}`);
  };

  const handleStartReview = () => {
    router.push(`/study/review`);
  };

  const handleNewUpload = () => {
    router.push("/create");
  };
  
  if (loading) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Minha Biblioteca
        </h2>
        <Button onClick={handleNewUpload} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Conjunto
        </Button>
      </div>

      {/* Secção de Revisão Inteligente */}
      {reviewCount > 0 && (
         <section>
          <h3 className="text-xl font-semibold tracking-tight mb-4">Sessões de Revisão</h3>
          <div className="-mx-4 px-4">
             <ReviewDeckCard reviewCount={reviewCount} onClick={handleStartReview} />
          </div>
        </section>
      )}
      
      {reviewCount > 0 && <Separator />}

      {/* Secção de Todos os Conjuntos */}
      <section>
         {reviewCount > 0 && <h3 className="text-xl font-semibold tracking-tight mb-4">Todos os Conjuntos</h3>}
        {/* CORREÇÃO AQUI: O componente DocumentList busca os seus próprios dados */}
        <DocumentList
            onDocumentSelect={handleDocumentSelect}
            onNewUpload={handleNewUpload}
        />
      </section>
    </div>
  );
}