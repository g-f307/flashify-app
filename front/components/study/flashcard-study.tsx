"use client";

import { useState, useEffect } from "react";
import { Document, Flashcard, apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, RotateCcw, Smile, Frown, Meh, Play } from "lucide-react";
import { FlashcardChat } from "./flashcard-chat";
import { PerformanceReportResponsive } from "./performance-report";
import { EditFlashcardModal } from "./edit-flashcard-modal";
import { SrsOnboardingModal } from "./srs-onboarding-modal";
import { FlashcardStage } from "./flashcard-stage";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  StudySession, 
  calculatePerformanceStats,
  PerformanceStats 
} from "@/lib/performance-utils";
import { 
  studyProgressManager, 
  StudyProgress, 
  StudyProgressUtils 
} from "@/lib/study-progress";

interface FlashcardStudyFinalProps {
  document: Document;
  initialFlashcards: Flashcard[];
  isReviewMode?: boolean;
  onBack: () => void;
  backButton?: React.ReactNode;
  flipAudioRef: React.RefObject<HTMLAudioElement>;
  onContentAdded?: () => void;
}

export function FlashcardStudyFinal({ 
  document, 
  initialFlashcards, 
  isReviewMode = false,
  onBack, 
  backButton,
  flipAudioRef,
  onContentAdded
}: FlashcardStudyFinalProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [sessionStartTime] = useState(new Date());
  
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [savedProgress, setSavedProgress] = useState<StudyProgress | null>(null);

  useEffect(() => {
    if (document.id !== 0) {
      const progress = studyProgressManager.getProgress(document.id);
      if (progress && progress.currentCardIndex > 0) {
        setSavedProgress(progress);
        setShowResumePrompt(true);
      }
    }
  }, [document.id]);

  useEffect(() => {
    if (document.id !== 0 && currentCardIndex > 0) {
      studyProgressManager.saveProgress(document.id, {
        currentCardIndex,
        totalCards: flashcards.length,
        studiedCards: studySessions.map(s => s.flashcardId),
        sessionData: studySessions.map(s => ({
          flashcardId: s.flashcardId,
          accuracy: s.accuracy,
          timestamp: s.timestamp.toISOString()
        }))
      });
    }
  }, [currentCardIndex, studySessions, document.id, flashcards.length]);

  const handleResumeFromSaved = () => {
    if (savedProgress) {
      setCurrentCardIndex(savedProgress.currentCardIndex);
      if (savedProgress.sessionData) {
        const restoredSessions: StudySession[] = savedProgress.sessionData.map(data => ({
          flashcardId: data.flashcardId,
          accuracy: data.accuracy,
          timestamp: new Date(data.timestamp)
        }));
        setStudySessions(restoredSessions);
      }
      toast.success(`Retomando do card ${savedProgress.currentCardIndex + 1} de ${savedProgress.totalCards}`);
    }
    setShowResumePrompt(false);
  };

  const handleStartFromBeginning = () => {
    studyProgressManager.clearProgress(document.id);
    setCurrentCardIndex(0);
    setStudySessions([]);
    setShowResumePrompt(false);
    toast.info("Iniciando do começo");
  };

  const handleFlip = () => {
    if (isLogging) return;
    setIsFlipped(!isFlipped);
    flipAudioRef.current?.play().catch(e => console.error("Erro ao tocar áudio:", e));
  };

  const goToNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex === flashcards.length - 1) {
        if (document.id === 0) {
          toast.success("Revisão concluída! Bom trabalho.");
          onBack();
          return;
        }
        studyProgressManager.clearProgress(document.id);
        setShowReport(true);
        return;
      }
      setCurrentCardIndex((prev) => prev + 1);
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => Math.max(0, prev - 1));
    }, 150);
  };
  
  const handleFeedback = async (accuracy: number) => {
    const currentFlashcard = flashcards[currentCardIndex];
    if (!currentFlashcard || isLogging) return;

    setIsLogging(true);
    try {
      const newSession: StudySession = {
        flashcardId: currentFlashcard.id,
        accuracy,
        timestamp: new Date()
      };
      setStudySessions(prev => [...prev, newSession]);
      await apiClient.logStudyForFlashcard(currentFlashcard.id, accuracy);
      goToNextCard();
    } catch (error) {
      toast.error("Não foi possível guardar o seu progresso. Tente novamente.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleUpdateFlashcard = (updatedFlashcard: Flashcard) => {
    const newFlashcards = flashcards.map(fc => 
      fc.id === updatedFlashcard.id ? updatedFlashcard : fc
    );
    setFlashcards(newFlashcards);
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowReport(false);
    setStudySessions([]);
    studyProgressManager.clearProgress(document.id);
  };

  const handleContinueReview = () => {
    const cardsToReview = studySessions
      .filter(session => session.accuracy < 1.0)
      .map(session => session.flashcardId);
    
    const reviewFlashcards = flashcards.filter(fc => 
      cardsToReview.includes(fc.id)
    );

    if (reviewFlashcards.length > 0) {
      setFlashcards(reviewFlashcards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowReport(false);
      setStudySessions([]);
      studyProgressManager.clearProgress(document.id);
      toast.info(`Revisando ${reviewFlashcards.length} cards que precisam de mais atenção.`);
    } else {
      toast.success("Não há cards para revisar. Excelente trabalho!");
      onBack();
    }
  };

  const handlePracticeQuestions = () => {
    toast.info("Funcionalidade de questões será implementada em breve!");
    onBack();
  };

  const performanceStats: PerformanceStats = calculatePerformanceStats(studySessions);

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

  if (showResumePrompt && savedProgress) {
    return (
      <div className="flex flex-col h-full items-center justify-center w-full max-w-md mx-auto p-6">
        <Card className="p-6 w-full text-center glow-on-hover">
          <div className="mb-6">
            <div className="bg-primary p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Continuar estudando?
            </h2>
            <p className="text-muted-foreground mb-4">
              Você parou no card {savedProgress.currentCardIndex + 1} de {savedProgress.totalCards}
            </p>
            <p className="text-sm text-muted-foreground">
              Última sessão: {StudyProgressUtils.formatTimeSinceLastStudy(savedProgress)}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleResumeFromSaved}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Continuar de onde parei
            </Button>
            
            <Button
              onClick={handleStartFromBeginning}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Começar do início
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (showReport) {
    return (
      <PerformanceReportResponsive
        stats={performanceStats}
        totalCards={flashcards.length}
        documentId={document.id}
        isReviewMode={isReviewMode}
        onRestart={handleRestart}
        onContinueReview={handleContinueReview}
        onPracticeQuestions={handlePracticeQuestions}
        onBack={onBack}
        onContentAdded={onContentAdded}
      />
    );
  }

  const currentFlashcard = flashcards[currentCardIndex];

  if (isChatOpen) {
    return <FlashcardChat flashcard={currentFlashcard} onClose={() => setIsChatOpen(false)} />;
  }

  return (
    <div className="flex flex-col h-full items-center w-full">
      {backButton ? (
        <div className="mb-4 self-start">{backButton}</div>
      ) : (
        <Button onClick={onBack} variant="ghost" className="mb-4 self-start">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Biblioteca
        </Button>
      )}

      <FlashcardStage
        flashcard={currentFlashcard}
        currentIndex={currentCardIndex}
        total={flashcards.length}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        onEdit={() => {
          setEditingFlashcard(currentFlashcard);
          setIsEditModalOpen(true);
        }}
        frontActions={
          <div className="flex flex-col sm:flex-row w-full justify-between items-center gap-2">
            <div className="flex w-full sm:w-auto justify-between gap-2">
              <Button
                onClick={handlePrevCard}
                variant="outline"
                size="lg"
                className="functional-button flex-1 sm:flex-none"
                disabled={currentCardIndex === 0}
              >
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
          </div>
        }
        backActions={
          <div className="flex flex-col sm:flex-row w-full justify-center items-center gap-2">
            <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-red-100 text-red-700 hover:bg-red-200 flex-col h-auto py-3" onClick={() => handleFeedback(0.0)} disabled={isLogging}>
              <span className="flex items-center gap-1"><Frown className="h-5 w-5" /> Não sabia</span>
              <span className="text-[10px] font-normal opacity-70">Não lembrei ou errei</span>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex-col h-auto py-3" onClick={() => handleFeedback(0.5)} disabled={isLogging}>
              <span className="flex items-center gap-1"><Meh className="h-5 w-5" /> Sabia em parte</span>
              <span className="text-[10px] font-normal opacity-70">Lembrei parcialmente</span>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:flex-1 bg-green-100 text-green-700 hover:bg-green-200 flex-col h-auto py-3" onClick={() => handleFeedback(1.0)} disabled={isLogging}>
              <span className="flex items-center gap-1"><Smile className="h-5 w-5" /> Sabia</span>
              <span className="text-[10px] font-normal opacity-70">Lembrei na hora</span>
            </Button>
          </div>
        }
      />
      
      <EditFlashcardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        flashcard={editingFlashcard}
        onUpdate={handleUpdateFlashcard}
      />
      <SrsOnboardingModal show={showReport} />
    </div>
  );
}
