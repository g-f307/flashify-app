"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient, Document, Flashcard } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, RotateCcw, MessageCircle, Loader2 } from "lucide-react";
import { EnhancedFlashcardRenderer } from "./enhanced-flashcard-renderer";
import { FlashcardChat } from "./flashcard-chat";
import { toast } from "sonner";

interface FlashcardStudyProps {
  document: Document;
  onBack: () => void;
  flipAudioRef: React.RefObject<HTMLAudioElement>;
}

export function FlashcardStudy({ document, onBack, flipAudioRef }: FlashcardStudyProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Estado para guardar os IDs dos flashcards já estudados nesta sessão
  const [sessionStudiedIds, setSessionStudiedIds] = useState<Set<number>>(new Set(document.studied_flashcard_ids || []));

  useEffect(() => {
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

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    flipAudioRef.current?.play().catch(e => console.error("Erro ao tocar áudio:", e));
  };

  // --- LÓGICA DE ATUALIZAÇÃO DE PROGRESSO ---
  const markCurrentCardAsStudied = async () => {
    const currentFlashcard = flashcards[currentCardIndex];
    if (currentFlashcard && !sessionStudiedIds.has(currentFlashcard.id)) {
        try {
            // Atualiza o estado local imediatamente para uma resposta visual rápida
            setSessionStudiedIds(prev => new Set(prev).add(currentFlashcard.id));
            // Envia a atualização para o backend em segundo plano
            await apiClient.markFlashcardAsStudied(currentFlashcard.id);
        } catch (error) {
            console.error("Falha ao marcar card como estudado:", error);
            toast.error("Não foi possível salvar o seu progresso.");
        }
    }
  };

  const handleNextCard = () => {
    markCurrentCardAsStudied(); // Marca o card atual como estudado antes de avançar
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };
  
  if (loading) return (
    <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (error) return <p className="text-red-500">{error}</p>;
  if (flashcards.length === 0) return <p>Nenhum flashcard encontrado para este conjunto.</p>;

  const currentFlashcard = flashcards[currentCardIndex];

  if (isChatOpen) {
    return <FlashcardChat flashcard={currentFlashcard} onClose={() => setIsChatOpen(false)} />;
  }

  return (
    <div className="flex flex-col h-full items-center">
       <Button onClick={onBack} variant="ghost" className="mb-4 self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Biblioteca
        </Button>

      <div className="w-full max-w-2xl flex-grow flex flex-col items-center justify-center perspective-1000">
        <div
          className="relative w-full h-full transform-style-preserve-3d transition-transform duration-600"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={handleFlip}
        >
          <Card className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 flashcard-enhanced glow-on-hover">
              <EnhancedFlashcardRenderer content={currentFlashcard.front} type={currentFlashcard.type} />
          </Card>
          <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-6 flashcard-enhanced glow-on-hover">
            <EnhancedFlashcardRenderer content={currentFlashcard.back} type={currentFlashcard.type} isAnswer />
          </Card>
        </div>
      </div>

       <div className="w-full max-w-2xl mt-6 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
                {currentCardIndex + 1} / {flashcards.length}
            </div>
            <div className="flex justify-between items-center">
                <Button onClick={handlePrevCard} variant="outline" size="lg" className="functional-button">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button onClick={handleFlip} variant="ghost" size="lg" className="flex-grow mx-4 functional-button">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Virar Card
                </Button>
                <Button onClick={handleNextCard} variant="outline" size="lg" className="functional-button">
                    <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
             <Button onClick={() => setIsChatOpen(true)} variant="secondary" className="w-full mt-2">
                <MessageCircle className="w-4 h-4 mr-2" />
                Aprofundar com IA
            </Button>
        </div>
    </div>
  );
}