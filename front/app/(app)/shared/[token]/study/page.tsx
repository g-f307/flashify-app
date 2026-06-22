"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, SharedDeckRead } from "@/lib/api";
import { FlashcardStage } from "@/components/study/flashcard-stage";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useSound } from "@/contexts/sound-context";

type PageState = "loading" | "loaded" | "error";

export default function SharedStudyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [deck, setDeck] = useState<SharedDeckRead | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { playSound } = useSound();

  useEffect(() => {
    if (!token) return;
    apiClient
      .getSharedDeck(token)
      .then((data) => {
        setDeck(data);
        setPageState("loaded");
      })
      .catch(() => {
        setPageState("error");
      });
  }, [token]);

  const flashcards = deck?.flashcards ?? [];
  const currentCard = flashcards[currentCardIndex];

  const handleFlip = () => {
    setIsFlipped((current) => !current);
    playSound("flashcardFlip");
  };

  const handlePrev = () => {
    setIsFlipped(false);
    playSound("cardSlide", { volume: 0.18 });
    setCurrentCardIndex((current) => Math.max(0, current - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    playSound("cardSlide");
    setCurrentCardIndex((current) => Math.min(flashcards.length - 1, current + 1));
  };

  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando flashcards...</p>
      </div>
    );
  }

  if (pageState === "error" || !deck || flashcards.length === 0 || !currentCard) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Não foi possível carregar os flashcards deste deck compartilhado.</p>
        <Button onClick={() => router.push(`/shared/${token}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o deck
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-5xl flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push(`/shared/${token}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <p className="text-right text-xs text-muted-foreground">Modo leitura · deck compartilhado</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-start pt-4 sm:pt-6 lg:pt-8">
          <div className="mx-auto w-full max-w-2xl">
            <FlashcardStage
              flashcard={{
                front: currentCard.front,
                back: currentCard.back,
                type: ["concept", "code", "diagram", "example", "comparison"].includes(currentCard.type)
                  ? (currentCard.type as "concept" | "code" | "diagram" | "example" | "comparison")
                  : "concept",
              }}
              currentIndex={currentCardIndex}
              total={flashcards.length}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              stageClassName="min-h-0"
              cardClassName="mx-auto h-[min(48vh,360px)] sm:h-[min(52vh,420px)] lg:h-[min(56vh,500px)]"
              footerClassName="mt-3 pb-0"
              frontActions={
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={handlePrev} disabled={currentCardIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button variant="outline" onClick={handleFlip}>
                    Virar card
                  </Button>
                  <Button onClick={handleNext} disabled={currentCardIndex === flashcards.length - 1}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              }
              backActions={
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={handlePrev} disabled={currentCardIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button variant="outline" onClick={handleFlip}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Ver frente
                  </Button>
                  <Button onClick={handleNext} disabled={currentCardIndex === flashcards.length - 1}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
