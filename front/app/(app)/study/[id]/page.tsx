"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, Document, Flashcard } from '@/lib/api';
import { FlashcardStudyFinal } from '@/components/study/flashcard-study';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StudyPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    const fetchStudyData = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        setError(null);

        if (documentId === 'review') {
          const reviewFlashcards = await apiClient.getReviewFlashcards();
          if (reviewFlashcards.length === 0) {
             toast.info("Você não tem cards para rever no momento!");
             router.push('/library');
             return;
          }
          setFlashcards(reviewFlashcards);
          setDocument({
            id: 0,
            file_path: "Sessão de Revisão Inteligente",
            status: 'COMPLETED',
            user_id: 0,
            created_at: new Date().toISOString(),
            total_flashcards: reviewFlashcards.length,
            studied_flashcards: 0,
            generates_flashcards: true,
            generates_quizzes: false,
            has_quiz: false,
          });
        } else {
          const docIdNumber = parseInt(documentId, 10);
          if (isNaN(docIdNumber)) {
            throw new Error("ID do documento inválido.");
          }
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

    fetchStudyData();
  }, [documentId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">A carregar a sua sessão de estudo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => router.push('/library')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a Biblioteca
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
          // ▼▼▼ CORREÇÃO APLICADA AQUI ▼▼▼
          onBack={() => router.back()} // Ação principal de voltar
          backButton={
            // O botão visual que o utilizador vê
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          }
          // ▲▲▲ FIM DA CORREÇÃO ▲▲▲
          flipAudioRef={flipAudioRef}
        />
      )}
    </>
  );
}