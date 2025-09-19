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
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
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
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
          Minha Biblioteca
        </h2>
        <Button onClick={handleNewUpload} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Deck
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center pt-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {reviewCount > 0 && (
            <section>
              <h3 className="text-xl font-semibold tracking-tight mb-2">Sessões de Revisão</h3>
              <ReviewDeckCard reviewCount={reviewCount} onClick={handleStartReview} />
            </section>
          )}
          
          {reviewCount > 0 && <Separator />}

          <section>
            <h3 className="text-xl font-semibold tracking-tight mb-4">
              {reviewCount > 0 ? "Todos os Decks" : ""}
            </h3>
            <DocumentList
                onDocumentSelect={handleDocumentSelect}
                onNewUpload={handleNewUpload}
            />
          </section>
        </>
      )}
    </div>
  );
}