// front/app/(app)/study/[id]/page.tsx

"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { apiClient, Document, Flashcard } from '@/lib/api';
import { FlashcardStudyFinal } from '@/components/study/flashcard-study';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

export default function StudyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  const from = searchParams.get("from");
  const backPath = from || "/library";

  const getBackLinkText = () => {
    if (from === "/") {
      return "Voltar para o Início";
    }
    if (from?.startsWith("/library/folder")) {
      return "Voltar para a Pasta";
    }
    return "Voltar para a Biblioteca";
  };
  
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
          onBack={() => router.push(backPath)}
          backButton={
            <Link href={backPath}>
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {getBackLinkText()}
              </Button>
            </Link>
          }
          flipAudioRef={flipAudioRef}
        />
      )}
    </>
  );
}