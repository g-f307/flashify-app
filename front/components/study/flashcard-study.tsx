"use client";

import { useState } from "react";
import { Document, Flashcard, apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, RotateCcw, MessageCircle, Smile, Frown, Meh } from "lucide-react";
import { EnhancedFlashcardRenderer } from "./enhanced-flashcard-renderer";
import { FlashcardChat } from "./flashcard-chat";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FlashcardStudyProps {
  document: Document;
  initialFlashcards: Flashcard[];
  onBack: () => void;
  flipAudioRef: React.RefObject<HTMLAudioElement>;
}

export function FlashcardStudy({ document, initialFlashcards, onBack, flipAudioRef }: FlashcardStudyProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const handleFlip = () => {
    if (isLogging) return;
    setIsFlipped(!isFlipped);
    flipAudioRef.current?.play().catch(e => console.error("Erro ao tocar áudio:", e));
  };

  const goToNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex === flashcards.length - 1 && document.id === 0) { // ID 0 é a sessão de revisão
        toast.success("Revisão concluída! Bom trabalho.");
        onBack();
        return;
      }
      setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };
  
  const handleFeedback = async (accuracy: number) => {
    const currentFlashcard = flashcards[currentCardIndex];
    if (!currentFlashcard || isLogging) return;

    setIsLogging(true);
    try {
      await apiClient.logStudyForFlashcard(currentFlashcard.id, accuracy);
      toast.success("Progresso guardado!");
      goToNextCard();
    } catch (error) {
      toast.error("Não foi possível guardar o seu progresso. Tente novamente.");
    } finally {
      setIsLogging(false);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="text-center">
        <p>Nenhum flashcard encontrado para este conjunto.</p>
        <Button onClick={onBack} variant="link" className="mt-4">
            Voltar para a Biblioteca
        </Button>
      </div>
    );
  }

  const currentFlashcard = flashcards[currentCardIndex];

  if (isChatOpen) {
    return <FlashcardChat flashcard={currentFlashcard} onClose={() => setIsChatOpen(false)} />;
  }

  return (
    <div className="flex flex-col h-full items-center w-full">
       <Button onClick={onBack} variant="ghost" className="mb-4 self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Biblioteca
        </Button>

      <div className="w-full max-w-2xl flex-grow flex flex-col items-center justify-center perspective-1000">
        {/* ▼▼▼ ALTERAÇÃO AQUI ▼▼▼ */}
        <div
          className="relative w-full h-[350px] sm:h-[400px] transform-style-preserve-3d transition-transform duration-600 cursor-pointer glow-on-hover"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={handleFlip}
        >
          <Card className="absolute w-full h-full backface-hidden flex items-center justify-center p-4 sm:p-6 flashcard-enhanced">
              <EnhancedFlashcardRenderer content={currentFlashcard.front} type={currentFlashcard.type} />
          </Card>
          <Card className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-4 sm:p-6 flashcard-enhanced">
            <EnhancedFlashcardRenderer content={currentFlashcard.back} type={currentFlashcard.type} isAnswer />
          </Card>
        </div>
      </div>

      <div className="w-full max-w-2xl mt-6 space-y-4">
        <div className="text-center text-sm text-muted-foreground">
            {currentCardIndex + 1} / {flashcards.length}
        </div>
        
        <div className="min-h-[6rem] sm:min-h-[3.5rem] flex items-center">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="navigation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row w-full justify-between items-center gap-2"
              >
                  <div className="flex w-full sm:w-auto justify-between gap-2">
                    <Button onClick={handlePrevCard} variant="outline" size="lg" className="functional-button flex-1 sm:flex-none">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Button onClick={goToNextCard} variant="outline" size="lg" className="functional-button flex-1 sm:flex-none">
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                  <Button onClick={handleFlip} variant="ghost" size="lg" className="w-full sm:w-auto flex-grow sm:mx-4 functional-button">
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Virar Card
                  </Button>
              </motion.div>
            ) : (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row w-full justify-center items-center gap-2"
              >
                <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleFeedback(0.0)} disabled={isLogging}>
                  <Frown className="mr-2 h-5 w-5" /> Errei
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200" onClick={() => handleFeedback(0.5)} disabled={isLogging}>
                  <Meh className="mr-2 h-5 w-5" /> Quase
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleFeedback(1.0)} disabled={isLogging}>
                  <Smile className="mr-2 h-5 w-5" /> Acertei
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}