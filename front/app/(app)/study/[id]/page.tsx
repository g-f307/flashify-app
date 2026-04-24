// front/app/(app)/study/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { apiClient, Document, Flashcard } from '@/lib/api';
import { FlashcardStudyFinal } from '@/components/study/flashcard-study';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const documentId = params.id as string;
  const mode = searchParams?.get('mode');
  const group = searchParams?.get('group');

  const [document, setDocument] = useState<Document | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const fetchStudyData = async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      setError(null);

      const docIdNumber = parseInt(documentId, 10);
      if (isNaN(docIdNumber)) {
        throw new Error("ID do documento inválido.");
      }

      if (group) {
        // Modo sub-deck: buscar cards de uma categoria SRS específica
        const [docData, groupCards] = await Promise.all([
          apiClient.getDocument(docIdNumber),
          apiClient.getSrsGroupCards(docIdNumber, group)
        ]);
        
        if (groupCards.length === 0) {
          toast.info("Não há cards nesta categoria no momento!");
          router.back();
          return;
        }
        setDocument(docData);
        setFlashcards(groupCards);
      } else if (mode === 'review') {
        const [docData, reviewFlashcards] = await Promise.all([
          apiClient.getDocument(docIdNumber),
          apiClient.getReviewFlashcardsByDocument(docIdNumber)
        ]);
        
        if (reviewFlashcards.length === 0) {
           toast.info("Você não tem cards para rever neste deck no momento!");
           router.back();
           return;
        }
        setDocument(docData);
        setFlashcards(reviewFlashcards);
      } else {
        const [docData, flashcardsData] = await Promise.all([
          apiClient.getDocument(docIdNumber),
          apiClient.getDocumentFlashcards(docIdNumber),
        ]);
        setDocument(docData);
        setFlashcards(flashcardsData);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao carregar a sessão de estudo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyData();
  }, [documentId, router]);

  const handleContentAdded = () => {
    // Recarrega os flashcards quando novos são adicionados
    toast.success("Novos flashcards carregados!");
    fetchStudyData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando flashcards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => router.push('/library')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Biblioteca
        </Button>
      </div>
    );
  }

  return (
    <>
      <audio ref={flipAudioRef} preload="auto">
        <source src="/card-flip.mp3" type="audio/mpeg" />
      </audio>
      {document && (
        <FlashcardStudyFinal
          document={document}
          initialFlashcards={flashcards}
          isReviewMode={mode === 'review'}
          onBack={() => router.back()} 
          backButton={
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
          flipAudioRef={flipAudioRef}
          onContentAdded={handleContentAdded}
        />
      )}
    </>
  );
}