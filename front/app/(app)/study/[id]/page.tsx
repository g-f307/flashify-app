// front/app/(app)/study/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Document } from '@/lib/api';
import { FlashcardStudy } from '@/components/study/flashcard-study';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // O áudio e sua referência agora vivem nesta página
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    const documentId = Number(params.id);
    if (isNaN(documentId)) {
      setError("ID do documento inválido.");
      setLoading(false);
      return;
    }

    const fetchDocumentDetails = async () => {
      try {
        const docDetails = await apiClient.getDocument(documentId);
        setDocument(docDetails);
      } catch (err: any) {
        setError(err.message || "Falha ao carregar os detalhes do conjunto.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando sua sessão de estudo...</p>
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
      {/* O elemento de áudio agora está aqui, garantindo que ele exista quando necessário */}
      <audio ref={flipAudioRef} preload="auto">
        <source src="/card-flip.mp3" type="audio/mpeg" />
      </audio>
      {document && (
        <FlashcardStudy
          document={document}
          onBack={() => router.push('/library')}
          flipAudioRef={flipAudioRef}
        />
      )}
    </>
  );
}