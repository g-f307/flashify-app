"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, SharedDeckRead, SharedGuidedStudyStep, SharedGuidedStudyTopic } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, BookOpen, FileText, Loader2, RotateCcw, Wand2 } from "lucide-react";
import { FlashcardStage } from "@/components/study/flashcard-stage";
import { useSound } from "@/contexts/sound-context";

type PageState = "loading" | "loaded" | "error";

type FlattenedStep = {
  topic: SharedGuidedStudyTopic;
  step: SharedGuidedStudyStep;
};

export default function SharedGuidedPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [deck, setDeck] = useState<SharedDeckRead | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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

  const flattenedSteps = useMemo<FlattenedStep[]>(() => {
    if (!deck?.guided_study) return [];
    return deck.guided_study.topics.flatMap((topic) =>
      topic.steps.map((step) => ({ topic, step }))
    );
  }, [deck]);

  const currentEntry = flattenedSteps[currentStepIndex];
  const currentStep = currentEntry?.step;
  const currentTopic = currentEntry?.topic;

  const handleFlip = () => {
    setIsFlipped((current) => !current);
    playSound("flashcardFlip");
  };

  const goPrev = () => {
    setIsFlipped(false);
    playSound("cardSlide", { volume: 0.18 });
    setCurrentStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    setIsFlipped(false);
    playSound("cardSlide");
    setCurrentStepIndex((current) => Math.min(flattenedSteps.length - 1, current + 1));
  };

  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando estudo guiado...</p>
      </div>
    );
  }

  if (pageState === "error" || !deck || !deck.guided_study || flattenedSteps.length === 0 || !currentStep || !currentTopic) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Não foi possível carregar o estudo guiado deste deck compartilhado.</p>
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
          <p className="text-right text-xs text-muted-foreground">Modo leitura · sem progresso, correção ou relatório</p>
        </div>

        <div className="mb-3 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3 dark:border-zinc-700/70 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{currentTopic.title}</span>
            <span className="text-muted-foreground">Passo {currentStepIndex + 1} de {flattenedSteps.length}</span>
          </div>
        </div>

        {currentStep.type === "flashcard" ? (
          <div className="flex flex-1 flex-col items-center justify-start pt-4 sm:pt-6 lg:pt-8">
            <div className="mx-auto w-full max-w-2xl">
              <FlashcardStage
                flashcard={{
                  front: currentStep.front || "",
                  back: currentStep.back || "",
                  type: "concept",
                }}
                currentIndex={currentStepIndex}
                total={flattenedSteps.length}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                interactiveClassName="glow-on-hover-guided"
                stageClassName="min-h-0"
                cardClassName="mx-auto h-[min(46vh,340px)] sm:h-[min(50vh,390px)] lg:h-[min(54vh,460px)]"
                footerClassName="mt-3 pb-0"
                frontActions={
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#7FD9A0]/40 text-[#3E8E63] hover:border-[#7FD9A0]/70 hover:bg-[#7FD9A0]/10 dark:text-[#9EE6B8]"
                      onClick={handleFlip}
                    >
                      Virar card
                    </Button>
                    <Button
                      className="bg-[#7FD9A0] hover:bg-[#6fca91] text-black"
                      onClick={goNext}
                      disabled={currentStepIndex === flattenedSteps.length - 1}
                    >
                      Próximo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                }
                backActions={
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#7FD9A0]/40 text-[#3E8E63] hover:border-[#7FD9A0]/70 hover:bg-[#7FD9A0]/10 dark:text-[#9EE6B8]"
                      onClick={handleFlip}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Ver frente
                    </Button>
                    <Button
                      className="bg-[#7FD9A0] hover:bg-[#6fca91] text-black"
                      onClick={goNext}
                      disabled={currentStepIndex === flattenedSteps.length - 1}
                    >
                      Próximo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        ) : (
          <Card className="overflow-hidden border-muted">
            <CardHeader className="border-b border-muted bg-muted/30">
              <div className="flex items-start gap-4 p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7FD9A0]/15">
                  <Wand2 className="h-5 w-5 text-[#3E8E63]" />
                </div>
                <CardTitle className="flex-1 pt-1.5 text-lg leading-relaxed sm:text-xl">
                  {currentStep.prompt}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-6 pb-6">
              {(currentStep.answers || []).map((answer, index) => (
                <div
                  key={`${currentStep.id}-${index}`}
                  className="flex items-start gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 text-sm dark:border-zinc-700/80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="flex-1 text-sm leading-relaxed sm:text-base">{answer.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {currentStep.type === "question" && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <Button
                className="bg-[#7FD9A0] hover:bg-[#6fca91] text-black"
                onClick={goNext}
                disabled={currentStepIndex === flattenedSteps.length - 1}
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
