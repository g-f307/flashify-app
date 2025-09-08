"use client";

import { useEffect, useState } from "react";
import { apiClient, Document, Flashcard } from "@/lib/api"; // Importando os tipos
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

// --- CORREÇÃO: Definindo as propriedades que o componente pode receber ---
interface FlashcardStudyProps {
  document: Document;
  onBack: () => void;
}

export function FlashcardStudy({ document, onBack }: FlashcardStudyProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;

    const fetchFlashcards = async () => {
      try {
        setLoading(true);
        const fetchedFlashcards = await apiClient.getDocumentFlashcards(document.id);
        setFlashcards(fetchedFlashcards);
      } catch (err: any) {
        setError(err.message || "Falha ao carregar os flashcards.");
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [document]);

  const handleNextCard = () => {
    setShowAnswer(false);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setShowAnswer(false);
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  };

  if (loading) return <p>Carregando flashcards...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (flashcards.length === 0) return <p>Nenhum flashcard encontrado para este documento.</p>;

  const currentFlashcard = flashcards[currentCardIndex];

  return (
    <div>
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para a lista
      </Button>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Estudando: {document.file_path.split('/').pop()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="min-h-[200px] flex items-center justify-center p-6 bg-secondary rounded-md cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <p className="text-xl text-center">
              {showAnswer ? currentFlashcard.back : currentFlashcard.front}
            </p>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button onClick={handlePrevCard} variant="outline">Anterior</Button>
            <span>{currentCardIndex + 1} / {flashcards.length}</span>
            <Button onClick={handleNextCard}>Próximo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}